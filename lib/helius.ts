import axios from 'axios';
import { isExchangeWallet, getExchangeForAddress } from './exchanges';

const HELIUS_API_URL = process.env.HELIUS_API_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Configuration constants
const SIGNATURE_LIMIT = 100;
const REQUEST_DELAY_MS = 300;
const MAX_NODES = 50;
const DEFAULT_MAX_DEPTH = 3;

// DEX wallet addresses for entity labeling
interface DexWallet {
  address: string;
  dex: string;
}

const DEX_WALLETS: DexWallet[] = [
  // Jupiter
  { address: 'Jup6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTgV6', dex: 'Jupiter' },
  // Raydium
  { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zNt1CtD', dex: 'Raydium' },
  // Orca
  { address: 'whirLbMiicVdio4qvUfX5dJlZwzJ4f8dM2FpG9Sx3h', dex: 'Orca' },
];

// Bridge wallet addresses for entity labeling
interface BridgeWallet {
  address: string;
  bridge: string;
}

const BRIDGE_WALLETS: BridgeWallet[] = [
  // Wormhole
  { address: 'wormDTUJ6WDpn2HzQ1t8Kg2c47tkq2g5kQ9YqXh1v', bridge: 'Wormhole' },
];

function getDexForAddress(address: string): string | null {
  const wallet = DEX_WALLETS.find(w => w.address === address);
  return wallet ? wallet.dex : null;
}

function getBridgeForAddress(address: string): string | null {
  const wallet = BRIDGE_WALLETS.find(w => w.address === address);
  return wallet ? wallet.bridge : null;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface Transfer {
  signature: string;
  from: string;
  to: string;
  amount: number;
  timestamp: string;
  slot: number;
  isExchange?: boolean;
  exchangeName?: string;
  isCycle?: boolean;
  branchCount?: number;
  mergePoint?: boolean;
  isDex?: boolean;
  dexName?: string;
  isBridge?: boolean;
  bridgeName?: string;
  fromDepth?: number;  // Depth of the wallet that sent this transfer
  toDepth?: number;   // Depth of the wallet that received this transfer
}

export interface TrackingOptions {
  endWalletAddress?: string;
  exchangeTarget?: string;
  maxDepth?: number;
  onProgress?: (progress: ProgressUpdate) => void;
  onTransferFound?: (transfer: Transfer) => void;
}

export interface ProgressUpdate {
  walletsChecked: number;
  currentDepth: number;
  message: string;
  queueSize?: number;
}

export interface TrackingResult {
  transfers: Transfer[];
  reachedTarget: boolean;
  targetWallet?: string;
  summary?: string;
}

export async function getTransfers(address: string, minAmount: number): Promise<Transfer[]> {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${HELIUS_API_URL}?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          address,
          {
            limit: SIGNATURE_LIMIT, // Reduced from 1000 for faster processing
          },
        ],
      },
      {
        timeout: 30000,
      }
    );

    const signatures = response.data.result;
    const transfers: Transfer[] = [];
    
    if (!Array.isArray(signatures)) {
      console.error('Helius API returned non-array result:', signatures);
      return [];
    }
    
    console.log(`Found ${signatures.length} signatures to process for ${address.slice(0, 8)}...`);

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      try {
        await delay(REQUEST_DELAY_MS); // Reduced from 500ms to 300ms for faster processing
        
        // Helper function to fetch transaction with retry
        const fetchTransaction = async (retryCount = 0): Promise<any> => {
          try {
            return await axios.post(
              `${HELIUS_API_URL}?api-key=${HELIUS_API_KEY}`,
              {
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: [
                  sig.signature,
                  {
                    encoding: 'jsonParsed',
                    commitment: 'confirmed',
                  },
                ],
              },
              {
                timeout: 30000,
              }
            );
          } catch (error: any) {
            // Retry on network errors, timeouts, or DNS errors
            if (retryCount === 0 && 
                (error.code === 'ENOTFOUND' || 
                 error.code === 'ECONNABORTED' || 
                 error.code === 'ETIMEDOUT' ||
                 error.message?.includes('timeout') ||
                 error.message?.includes('ETIMEDOUT'))) {
              console.warn(`Retrying transaction fetch for ${sig.signature.slice(0, 8)}... (attempt 2)`);
              await delay(1000); // Wait 1 second before retry
              return fetchTransaction(retryCount + 1);
            }
            throw error;
          }
        };

        const txResponse = await fetchTransaction();

        const tx = txResponse.data.result;
        if (!tx || !tx.meta || !tx.transaction) continue;

        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        for (let i = 0; i < accountKeys.length; i++) {
          const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;
          
          if (balanceChange < -minAmount) {
            const fromAddress = accountKeys[i];
            const fromAddressString = typeof fromAddress === 'string' ? fromAddress : fromAddress.pubkey;
            
            for (let j = 0; j < accountKeys.length; j++) {
              if (i !== j) {
                const recipientChange = (postBalances[j] - preBalances[j]) / 1e9;
                if (recipientChange > 0) {
                  const toAddress = accountKeys[j];
                  const toAddressString = typeof toAddress === 'string' ? toAddress : toAddress.pubkey;
                  
                  const transfer: Transfer = {
                    signature: sig.signature,
                    from: fromAddressString,
                    to: toAddressString,
                    amount: Math.abs(balanceChange),
                    timestamp: new Date(tx.blockTime * 1000).toISOString(),
                    slot: tx.slot,
                  };
                  
                  // Check if recipient is an exchange wallet
                  const exchange = getExchangeForAddress(toAddressString);
                  if (exchange) {
                    transfer.isExchange = true;
                    transfer.exchangeName = exchange;
                  }
                  
                  // Check if recipient is a DEX wallet
                  const dex = getDexForAddress(toAddressString);
                  if (dex) {
                    transfer.isDex = true;
                    transfer.dexName = dex;
                  }
                  
                  // Check if recipient is a bridge wallet
                  const bridge = getBridgeForAddress(toAddressString);
                  if (bridge) {
                    transfer.isBridge = true;
                    transfer.bridgeName = bridge;
                  }
                  
                  transfers.push(transfer);
                  break;
                }
              }
            }
          }
        }
      } catch (error: any) {
        // Log warning and skip this transaction, but continue processing the rest
        console.warn(`Failed to fetch transaction ${sig.signature.slice(0, 8)}... - skipping: ${error.message || error.code || error}`);
        continue;
      }
      
    }

    console.log(`Found ${transfers.length} transfers >= ${minAmount} SOL`);
    return transfers;
  } catch (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }
}

export async function trackMoneyFlow(
  startAddress: string, 
  minAmount: number, 
  options: TrackingOptions = {}
): Promise<TrackingResult> {
  const { endWalletAddress, exchangeTarget, maxDepth = DEFAULT_MAX_DEPTH, onProgress, onTransferFound } = options;
  
  const allTransfers: Transfer[] = [];
  const visited = new Set<string>(); // Prevents re-exploring the same wallet
  const connectedWallets = new Set<string>([startAddress]); // Only wallets confirmed connected to start can explore
  const queue: { address: string; depth: number }[] = [{ address: startAddress, depth: 0 }];
  let walletCount = 0;
  let reachedTarget = false;
  let targetWallet: string | undefined;
  const maxNodes = MAX_NODES; // Maximum number of wallets to check

  visited.add(startAddress);

  while (queue.length > 0 && walletCount < maxNodes) {
    const { address, depth } = queue.shift()!;
    
    // CRITICAL: Only explore wallets that are confirmed connected to the starting wallet
    if (!connectedWallets.has(address)) {
      console.warn(`Skipping wallet ${address.slice(0, 8)}... - not confirmed connected to start wallet`);
      continue;
    }
    
    walletCount++;

    // Send progress update
    if (onProgress) {
      onProgress({
        walletsChecked: walletCount,
        currentDepth: depth,
        message: `Checking wallet ${address.slice(0, 8)}...`,
        queueSize: queue.length,
      });
    }


    // Check if we reached the target wallet
    if (endWalletAddress && address === endWalletAddress) {
      console.log(`Reached target wallet: ${address}`);
      reachedTarget = true;
      targetWallet = address;
      // Continue exploring other branches but don't recurse deeper from this wallet
      continue;
    }

    // Check if we reached the target exchange
    if (exchangeTarget && isExchangeWallet(address, exchangeTarget)) {
      console.log(`Reached target exchange: ${exchangeTarget}`);
      reachedTarget = true;
      targetWallet = address;
      // Continue exploring other branches but don't recurse deeper from this wallet
      continue;
    }

    // Respect max depth limit
    if (depth >= maxDepth) {
      continue;
    }

    try {
      const transfers = await getTransfers(address, minAmount);
      
      
      // Branch tracking: count how many unique destinations this wallet sends to
      const uniqueDestinations = new Set(transfers.map(t => t.to));
      const branchCount = uniqueDestinations.size;
      
      for (const transfer of transfers) {
        if (!allTransfers.find(t => t.signature === transfer.signature)) {
          // Log every transfer as soon as it's discovered
          console.log(`[DISCOVERED] Transfer from ${transfer.from.slice(0, 8)}... to ${transfer.to.slice(0, 8)}... (depth ${depth})`);
          
          // Add branch count to the transfer
          transfer.branchCount = branchCount;
          
          // Tag with depth information for sorting
          transfer.fromDepth = depth;
          transfer.toDepth = depth + 1;
          
          // Cycle detection: check if destination was already visited
          if (visited.has(transfer.to)) {
            transfer.isCycle = true;
            transfer.toDepth = depth; // Cycles go back to same or earlier depth
            console.log(`Cycle detected: ${address.slice(0, 8)}... -> ${transfer.to.slice(0, 8)}... (already visited)`);
          }
          
          allTransfers.push(transfer);
          
          // Send transfer found event
          if (onTransferFound) {
            onTransferFound(transfer);
          }
          
          // Check if this transfer reaches the target
          if (endWalletAddress && transfer.to === endWalletAddress) {
            console.log(`Transfer reaches target wallet: ${transfer.to}`);
            reachedTarget = true;
            targetWallet = transfer.to;
          }
          
          if (exchangeTarget && isExchangeWallet(transfer.to, exchangeTarget)) {
            console.log(`Transfer reaches target exchange: ${exchangeTarget}`);
            reachedTarget = true;
            targetWallet = transfer.to;
          }
          
          // Only add to queue if not visited and not at target
          if (!visited.has(transfer.to)) {
            visited.add(transfer.to);
            // CRITICAL: Only add to connectedWallets and queue if the sender is confirmed connected
            // This guarantees every wallet we explore is reachable from the starting wallet
            connectedWallets.add(transfer.to);
            // Don't recurse from target wallet/exchange
            if (!reachedTarget || transfer.to !== targetWallet) {
              queue.push({ address: transfer.to, depth: depth + 1 });
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`Error tracking from ${address}:`, error);
    }
  }

  if (walletCount >= maxNodes) {
    console.log(`Reached maximum node limit (${maxNodes})`);
  }

  console.log(`Tracking complete: Checked ${walletCount} wallets, found ${allTransfers.length} total transfers`);
  
  // Merge detection: identify wallets that receive from multiple sources
  const toAddressCounts = new Map<string, number>();
  allTransfers.forEach(transfer => {
    const count = toAddressCounts.get(transfer.to) || 0;
    toAddressCounts.set(transfer.to, count + 1);
  });
  
  // Mark transfers that feed into merge points
  let mergePointCount = 0;
  allTransfers.forEach(transfer => {
    if ((toAddressCounts.get(transfer.to) || 0) > 1) {
      transfer.mergePoint = true;
      mergePointCount++;
    }
  });
  
  console.log(`Merge detection: Found ${mergePointCount} transfers feeding into convergence points`);
  
  // === SORT TRANSFERS BY DEPTH ===
  // Sort so that transfers from earlier depths appear before transfers from later depths
  // This ensures chain validation works correctly
  console.log('=== Sorting transfers by depth ===');
  allTransfers.sort((a, b) => {
    // Primary sort: by fromDepth (depth of the sender wallet)
    const aFromDepth = a.fromDepth ?? 0;
    const bFromDepth = b.fromDepth ?? 0;
    if (aFromDepth !== bFromDepth) {
      return aFromDepth - bFromDepth;
    }
    // Secondary sort: by timestamp (earlier transfers first at same depth)
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  console.log('✓ Transfers sorted by depth');
  
  // === CHAIN VALIDATION ===
  console.log('=== Chain Validation ===');
  let connectedCount = 0;
  let disconnectedCount = 0;
  
  // Collect all 'to' addresses from earlier transfers
  const earlierToAddresses = new Set<string>();
  
  if (allTransfers.length > 0) {
    // Check 1: First transfer's 'from' must equal the searched startAddress
    const firstTransfer = allTransfers[0];
    if (firstTransfer.from !== startAddress) {
      console.error('ROOT MISMATCH: first transfer\'s from address does not match searched wallet');
      console.error(`  Expected: ${startAddress}`);
      console.error(`  Got: ${firstTransfer.from}`);
    } else {
      console.log('✓ First transfer starts from searched wallet');
      connectedCount++;
      earlierToAddresses.add(firstTransfer.to);
    }
    
    // Check 2: For every transfer after the first, its 'from' must appear as a 'to' in some earlier transfer
    for (let i = 1; i < allTransfers.length; i++) {
      const transfer = allTransfers[i];
      if (earlierToAddresses.has(transfer.from)) {
        connectedCount++;
        earlierToAddresses.add(transfer.to);
      } else {
        console.error('DISCONNECTED TRANSFER FOUND:', transfer, '- this wallet\'s \'from\' address was never a destination in any earlier hop');
        console.error(`  Transfer ${i}: from=${transfer.from.slice(0, 8)}...${transfer.from.slice(-8)} to=${transfer.to.slice(0, 8)}...${transfer.to.slice(-8)}`);
        disconnectedCount++;
        // Still add the 'to' address so subsequent transfers can connect to it
        earlierToAddresses.add(transfer.to);
      }
    }
  }
  
  console.log(`Chain validation: ${connectedCount} connected, ${disconnectedCount} disconnected out of ${allTransfers.length} total transfers`);
  
  return {
    transfers: allTransfers,
    reachedTarget,
    targetWallet,
  };
}

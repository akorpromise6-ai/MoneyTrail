import axios from 'axios';
import { isExchangeWallet, getExchangeForAddress, getDexForAddress, getBridgeForAddress } from './exchanges';

const HELIUS_API_URL = process.env.HELIUS_API_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

// Configuration constants
const SIGNATURE_LIMIT = 100;
const REQUEST_DELAY_MS = 300;
const MAX_NODES = 50;
const DEFAULT_MAX_DEPTH = 3;

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get transaction details by signature
 * Used to resolve transaction hash to source wallet for starting traces
 */
export async function getTransactionDetails(signature: string): Promise<{ from: string; to: string; amount: number; timestamp: string } | null> {
  try {
    const response = await axios.post(HELIUS_API_URL, {
      jsonrpc: '2.0',
      id: 'getTransaction',
      method: 'getTransaction',
      params: [signature, { encoding: 'jsonParsed' }],
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const tx = response.data.result;
    if (!tx || !tx.meta || !tx.transaction) {
      return null;
    }

    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const accountKeys = tx.transaction.message.accountKeys;

    // Find the sender (account with negative balance change)
    for (let i = 0; i < accountKeys.length; i++) {
      const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;
      
      if (balanceChange < 0) {
        const fromAddress = accountKeys[i];
        const fromAddressString = typeof fromAddress === 'string' ? fromAddress : fromAddress.pubkey;
        
        // Find the recipient (account with positive balance change)
        for (let j = 0; j < accountKeys.length; j++) {
          if (i !== j) {
            const recipientChange = (postBalances[j] - preBalances[j]) / 1e9;
            if (recipientChange > 0) {
              const toAddress = accountKeys[j];
              const toAddressString = typeof toAddress === 'string' ? toAddress : toAddress.pubkey;
              
              return {
                from: fromAddressString,
                to: toAddressString,
                amount: Math.abs(balanceChange),
                timestamp: new Date(tx.blockTime * 1000).toISOString(),
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

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
  direction?: 'outgoing' | 'incoming';
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
        const instructions = tx.transaction.message.instructions;
        const preTokenBalances = tx.meta.preTokenBalances;
        const postTokenBalances = tx.meta.postTokenBalances;

        // Improved transfer extraction: handle multiple recipients and validate amounts
        const senders: Array<{ address: string; amount: number }> = [];
        const recipients: Array<{ address: string; amount: number }> = [];
        let totalSent = 0;
        let totalReceived = 0;

        // Identify senders and recipients from SOL balance changes
        console.log(`  Checking ${accountKeys.length} accounts for balance changes (minAmount: ${minAmount})`);
        for (let i = 0; i < accountKeys.length; i++) {
          const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;
          const address = accountKeys[i];
          const addressString = typeof address === 'string' ? address : address.pubkey;

          if (Math.abs(balanceChange) > 0.001) {
            console.log(`  Account ${i}: ${addressString.slice(0, 8)}... balance change: ${balanceChange.toFixed(6)} SOL`);
          }

          if (balanceChange < -minAmount) {
            senders.push({ address: addressString, amount: Math.abs(balanceChange) });
            totalSent += Math.abs(balanceChange);
            console.log(`  -> Added as SENDER: ${addressString.slice(0, 8)}... amount=${Math.abs(balanceChange).toFixed(2)} SOL`);
          } else if (balanceChange > 0) {
            recipients.push({ address: addressString, amount: balanceChange });
            totalReceived += balanceChange;
            console.log(`  -> Added as RECIPIENT: ${addressString.slice(0, 8)}... amount=${balanceChange.toFixed(2)} SOL`);
          }
        }

        console.log(`  Summary: ${senders.length} senders (total ${totalSent.toFixed(2)} SOL), ${recipients.length} recipients (total ${totalReceived.toFixed(2)} SOL)`);

        // Also check for SPL token transfers if token balance data is available
        if (preTokenBalances && postTokenBalances && Array.isArray(preTokenBalances) && Array.isArray(postTokenBalances)) {
          console.log(`  Token balances available: ${preTokenBalances.length} token accounts`);
          
          // Map token account owners to their balance changes
          const tokenOwnerChanges = new Map<string, number>();
          
          for (let i = 0; i < Math.min(preTokenBalances.length, postTokenBalances.length); i++) {
            const preToken = preTokenBalances[i];
            const postToken = postTokenBalances[i];
            
            if (!preToken || !postToken) continue;
            
            const preAmount = parseFloat(preToken.uiTokenAmount?.amount || '0');
            const postAmount = parseFloat(postToken.uiTokenAmount?.amount || '0');
            const tokenChange = postAmount - preAmount;
            const mint = preToken.mint;
            const owner = preToken.owner;
            
            if (!owner || !mint) continue;
            
            // Only process native SOL mint or skip for now
            // Native SOL has mint: "So11111111111111111111111111111111111111112"
            if (mint === 'So11111111111111111111111111111111111111112') {
              // This is wrapped SOL, treat like SOL
              if (Math.abs(tokenChange) > 0) {
                const currentChange = tokenOwnerChanges.get(owner) || 0;
                tokenOwnerChanges.set(owner, currentChange + tokenChange);
                console.log(`  Wrapped SOL: owner=${owner.slice(0, 8)}..., change=${tokenChange}`);
              }
            } else if (Math.abs(tokenChange) > 0) {
              console.log(`  Token: mint=${mint.slice(0, 8)}..., owner=${owner.slice(0, 8)}..., change=${tokenChange} (skipping non-SOL token)`);
            }
          }
          
          // Add token balance changes to senders/recipients
          for (const [owner, change] of tokenOwnerChanges.entries()) {
            if (change < -minAmount) {
              senders.push({ address: owner, amount: Math.abs(change) });
              totalSent += Math.abs(change);
              console.log(`  Added sender from token: ${owner.slice(0, 8)}..., amount=${Math.abs(change)}`);
            } else if (change > minAmount) {
              recipients.push({ address: owner, amount: change });
              totalReceived += change;
              console.log(`  Added recipient from token: ${owner.slice(0, 8)}..., amount=${change}`);
            }
          }
        }

        // Validate that total sent matches total received (within small tolerance for fees)
        const tolerance = 0.000001; // Small tolerance for rounding errors
        if (Math.abs(totalSent - totalReceived) > tolerance && senders.length > 0 && recipients.length > 0) {
          console.warn(`Transaction ${sig.signature.slice(0, 8)}... has mismatched amounts: sent ${totalSent.toFixed(6)}, received ${totalReceived.toFixed(6)}`);
        }

        // Create transfers for each sender-recipient pair
        for (const sender of senders) {
          for (const recipient of recipients) {
            // Skip if sender is also recipient (self-transfer)
            if (sender.address === recipient.address) continue;

            // Calculate proportional amount if multiple recipients
            let transferAmount = sender.amount;
            if (recipients.length > 1) {
              transferAmount = (sender.amount * recipient.amount) / totalReceived;
            }

            // Only include if amount meets minimum threshold
            if (transferAmount >= minAmount) {
              const transfer: Transfer = {
                signature: sig.signature,
                from: sender.address,
                to: recipient.address,
                amount: transferAmount,
                timestamp: new Date(tx.blockTime * 1000).toISOString(),
                slot: tx.slot,
              };

              // Check if recipient is an exchange wallet
              const exchange = getExchangeForAddress(recipient.address);
              if (exchange) {
                transfer.isExchange = true;
                transfer.exchangeName = exchange;
              }

              // Check if recipient is a DEX wallet
              const dex = getDexForAddress(recipient.address);
              if (dex) {
                transfer.isDex = true;
                transfer.dexName = dex;
              }

              // Check if recipient is a bridge wallet
              const bridge = getBridgeForAddress(recipient.address);
              if (bridge) {
                transfer.isBridge = true;
                transfer.bridgeName = bridge;
              }

              transfers.push(transfer);
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
  const { endWalletAddress, exchangeTarget, maxDepth = DEFAULT_MAX_DEPTH, direction = 'outgoing', onProgress, onTransferFound } = options;
  
  const allTransfers: Transfer[] = [];
  const visited = new Set<string>();
  const queue: { address: string; depth: number }[] = [{ address: startAddress, depth: 0 }];
  let walletCount = 0;
  let reachedTarget = false;
  let targetWallet: string | undefined;
  const maxNodes = MAX_NODES; // Maximum number of wallets to check

  visited.add(startAddress);

  while (queue.length > 0 && walletCount < maxNodes) {
    const { address, depth } = queue.shift()!;
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
      
      // Filter transfers based on direction
      const relevantTransfers = direction === 'outgoing' 
        ? transfers.filter(t => t.from === address)
        : transfers.filter(t => t.to === address);
      
      if (relevantTransfers.length === 0) {
        continue;
      }
      
      // Branch tracking: count how many unique destinations/sources this wallet sends to/receives from
      const uniqueCounterparts = new Set(
        direction === 'outgoing'
          ? relevantTransfers.map(t => t.to)
          : relevantTransfers.map(t => t.from)
      );
      const branchCount = uniqueCounterparts.size;
      
      for (const transfer of relevantTransfers) {
        if (!allTransfers.find(t => t.signature === transfer.signature)) {
          // Log every transfer as soon as it's discovered
          console.log(`[DISCOVERED] Transfer from ${transfer.from.slice(0, 8)}... to ${transfer.to.slice(0, 8)}... (depth ${depth})`);
          
          // Add branch count to the transfer
          transfer.branchCount = branchCount;
          
          // Tag with depth information for sorting
          transfer.fromDepth = depth;
          transfer.toDepth = depth + 1;
          
          // For incoming traces, reverse the depth logic
          if (direction === 'incoming') {
            transfer.fromDepth = depth + 1;
            transfer.toDepth = depth;
          }
          
          // Cycle detection: check if the counterpart was already visited
          const counterpart = direction === 'outgoing' ? transfer.to : transfer.from;
          if (visited.has(counterpart)) {
            transfer.isCycle = true;
            if (direction === 'outgoing') {
              transfer.toDepth = depth; // Cycles go back to same or earlier depth
            } else {
              transfer.fromDepth = depth; // Cycles go back to same or earlier depth
            }
            console.log(`Cycle detected: ${address.slice(0, 8)}... -> ${counterpart.slice(0, 8)}... (already visited)`);
          }
          
          allTransfers.push(transfer);
          
          // Send transfer found event
          if (onTransferFound) {
            onTransferFound(transfer);
          }
          
          // Check if this transfer reaches the target
          if (endWalletAddress && counterpart === endWalletAddress) {
            console.log(`Transfer reaches target wallet: ${counterpart}`);
            reachedTarget = true;
            targetWallet = counterpart;
          }
          
          if (exchangeTarget && isExchangeWallet(counterpart, exchangeTarget)) {
            console.log(`Transfer reaches target exchange: ${exchangeTarget}`);
            reachedTarget = true;
            targetWallet = counterpart;
          }
          
          // Only add to queue if not visited and not at target
          if (!visited.has(counterpart)) {
            visited.add(counterpart);
            // Don't recurse from target wallet/exchange
            if (!reachedTarget || counterpart !== targetWallet) {
              queue.push({ address: counterpart, depth: depth + 1 });
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
  
  // === CHAIN VALIDATION AND FILTERING ===
  console.log('=== Chain Validation and Filtering ===');
  const connectedTransfers: Transfer[] = [];
  const earlierToAddresses = new Set<string>();
  const earlierFromAddresses = new Set<string>();
  
  if (allTransfers.length > 0) {
    // Check 1: First transfer must involve the searched wallet (either as sender or receiver)
    const firstTransfer = allTransfers[0];
    const isOutgoing = firstTransfer.from === startAddress;
    const isIncoming = firstTransfer.to === startAddress;
    
    // Auto-detect direction if not explicitly set
    let actualDirection = direction;
    if (!isOutgoing && isIncoming) {
      actualDirection = 'incoming';
      console.log('Auto-detected incoming trace based on first transfer');
    } else if (isOutgoing && !isIncoming) {
      actualDirection = 'outgoing';
      console.log('Auto-detected outgoing trace based on first transfer');
    }
    
    if (!isOutgoing && !isIncoming) {
      console.error('ROOT MISMATCH: first transfer does not involve the searched wallet');
      console.error(`  Expected: ${startAddress} as either from or to`);
      console.error(`  Got: from=${firstTransfer.from.slice(0, 8)}... to=${firstTransfer.to.slice(0, 8)}...`);
    } else {
      if (actualDirection === 'outgoing') {
        console.log('✓ First transfer starts from searched wallet (outgoing trace)');
        connectedTransfers.push(firstTransfer);
        earlierToAddresses.add(firstTransfer.to);
      } else {
        console.log('✓ First transfer ends at searched wallet (incoming trace)');
        connectedTransfers.push(firstTransfer);
        earlierFromAddresses.add(firstTransfer.from);
      }
    }
    
    // Check 2: For every transfer after the first, validate chain connectivity
    for (let i = 1; i < allTransfers.length; i++) {
      const transfer = allTransfers[i];
      
      if (actualDirection === 'outgoing') {
        // Outgoing trace: each transfer's 'from' must appear as a 'to' in earlier transfers
        if (earlierToAddresses.has(transfer.from)) {
          connectedTransfers.push(transfer);
          earlierToAddresses.add(transfer.to);
        } else {
          console.warn('DISCONNECTED TRANSFER FILTERED OUT:', transfer, '- this wallet\'s \'from\' address was never a destination in any earlier hop');
          console.warn(`  Transfer ${i}: from=${transfer.from.slice(0, 8)}...${transfer.from.slice(-8)} to=${transfer.to.slice(0, 8)}...${transfer.to.slice(-8)}`);
        }
      } else {
        // Incoming trace: each transfer's 'to' must appear as a 'from' in earlier transfers
        if (earlierFromAddresses.has(transfer.to)) {
          connectedTransfers.push(transfer);
          earlierFromAddresses.add(transfer.from);
        } else {
          console.warn('DISCONNECTED TRANSFER FILTERED OUT:', transfer, '- this wallet\'s \'to\' address was never a source in any earlier hop');
          console.warn(`  Transfer ${i}: from=${transfer.from.slice(0, 8)}...${transfer.from.slice(-8)} to=${transfer.to.slice(0, 8)}...${transfer.to.slice(-8)}`);
        }
      }
    }
  }
  
  console.log(`Chain validation: ${connectedTransfers.length} connected, ${allTransfers.length - connectedTransfers.length} disconnected (filtered out)`);
  
  return {
    transfers: connectedTransfers,
    reachedTarget,
    targetWallet,
  };
}

import { Transfer } from './helius';

export interface EnrichedTransfer extends Transfer {
  depth: number;
  path: string[]; // Chain of wallets from root to this transfer
}

export interface WalletNode {
  address: string;
  depth: number;
  parentWallets: string[]; // All wallets that sent money to this one
  firstParentTransfer?: string; // The transfer that first discovered this wallet
}

export interface TransferTreeResult {
  enrichedTransfers: EnrichedTransfer[];
  walletNodes: Map<string, WalletNode>;
  depthCounts: Map<number, number>; // Number of transfers at each depth
}

/**
 * Builds a structured tree/graph from flat transfers using BFS traversal.
 * This is the single source of truth for both the graph and table.
 */
export function buildTransferTree(transfers: Transfer[], startWallet: string): TransferTreeResult {
  const walletNodes = new Map<string, WalletNode>();
  const enrichedTransfers: EnrichedTransfer[] = [];
  const depthCounts = new Map<number, number>();
  
  // Initialize the starting wallet at depth 0
  walletNodes.set(startWallet, {
    address: startWallet,
    depth: 0,
    parentWallets: [],
  });
  
  // BFS queue: { walletAddress, depth, path }
  const queue: { address: string; depth: number; path: string[] }[] = [
    { address: startWallet, depth: 0, path: [startWallet] }
  ];
  
  const visited = new Set<string>([startWallet]);
  
  // Build a map of outgoing transfers for each wallet
  const outgoingTransfers = new Map<string, Transfer[]>();
  for (const transfer of transfers) {
    if (!outgoingTransfers.has(transfer.from)) {
      outgoingTransfers.set(transfer.from, []);
    }
    outgoingTransfers.get(transfer.from)!.push(transfer);
  }
  
  // BFS traversal
  while (queue.length > 0) {
    const { address, depth, path } = queue.shift()!;
    
    const transfersFromWallet = outgoingTransfers.get(address) || [];
    
    for (const transfer of transfersFromWallet) {
      const toWallet = transfer.to;
      const newDepth = depth + 1;
      const newPath = [...path, toWallet];
      
      // Enrich the transfer with depth and path
      enrichedTransfers.push({
        ...transfer,
        depth: newDepth,
        path: newPath,
      });
      
      // Update depth counts
      depthCounts.set(newDepth, (depthCounts.get(newDepth) || 0) + 1);
      
      // Process the receiving wallet
      if (!walletNodes.has(toWallet)) {
        // First time seeing this wallet
        walletNodes.set(toWallet, {
          address: toWallet,
          depth: newDepth,
          parentWallets: [address],
          firstParentTransfer: transfer.signature,
        });
        
        // Add to queue for BFS
        if (!visited.has(toWallet)) {
          visited.add(toWallet);
          queue.push({ address: toWallet, depth: newDepth, path: newPath });
        }
      } else {
        // Wallet already exists - update parent info if this is a shorter path
        const existingNode = walletNodes.get(toWallet)!;
        if (newDepth < existingNode.depth) {
          // Found a shorter path - update depth and first parent
          existingNode.depth = newDepth;
          existingNode.parentWallets = [address];
          existingNode.firstParentTransfer = transfer.signature;
          
          // Re-add to queue with shorter depth if not already visited at this depth
          if (!visited.has(toWallet)) {
            visited.add(toWallet);
            queue.push({ address: toWallet, depth: newDepth, path: newPath });
          }
        } else if (newDepth === existingNode.depth) {
          // Same depth - add as another parent
          if (!existingNode.parentWallets.includes(address)) {
            existingNode.parentWallets.push(address);
          }
        }
        // If newDepth > existingNode.depth, we ignore it (keep the shorter path)
      }
    }
  }
  
  // Verify all transfers have a valid path back to start wallet
  for (const enrichedTransfer of enrichedTransfers) {
    if (enrichedTransfer.path[0] !== startWallet) {
      console.warn(`Transfer ${enrichedTransfer.signature} has no path back to start wallet ${startWallet}. Path:`, enrichedTransfer.path);
    }
  }
  
  // Log depth distribution for verification
  console.log('=== Transfer Tree Depth Distribution ===');
  for (const [depth, count] of Array.from(depthCounts.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`Depth ${depth}: ${count} transfers`);
  }
  console.log(`Total wallets: ${walletNodes.size}`);
  console.log(`Total transfers: ${enrichedTransfers.length}`);
  
  return {
    enrichedTransfers,
    walletNodes,
    depthCounts,
  };
}

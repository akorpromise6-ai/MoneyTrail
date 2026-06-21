'use client';

import React, { useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Transfer } from '@/lib/helius';
import { formatAddress } from '@/lib/utils';
import { buildTransferTree, EnrichedTransfer } from '@/lib/buildTransferTree';

interface MoneyFlowGraphProps {
  transfers: Transfer[];
  startAddress?: string;
}

const MoneyFlowGraph: React.FC<MoneyFlowGraphProps> = ({ transfers, startAddress: providedStartAddress }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    try {
      if (transfers.length === 0 || !providedStartAddress) {
        return { nodes: [], edges: [] };
      }

      // Use the shared tree structure as the single source of truth
      const { enrichedTransfers, walletNodes, depthCounts } = buildTransferTree(transfers, providedStartAddress);

      const nodeMap = new Map<string, Node>();
      const edges: Edge[] = [];
      const addressStats = new Map<string, { 
        totalReceived: number; 
        totalSent: number; 
        isExchange: boolean; 
        exchangeName?: string;
        isDex?: boolean;
        dexName?: string;
        isBridge?: boolean;
        bridgeName?: string;
        isMergePoint?: boolean;
      }>();

      // Group wallets by depth for positioning
      const walletsByDepth = new Map<number, string[]>();
      for (const [address, node] of walletNodes.entries()) {
        if (!walletsByDepth.has(node.depth)) {
          walletsByDepth.set(node.depth, []);
        }
        walletsByDepth.get(node.depth)!.push(address);
      }

      // Position nodes manually based on depth
      const HORIZONTAL_SPACING = 250; // Distance between depth levels
      const VERTICAL_SPACING = 100; // Distance between nodes at same depth

      for (const [depth, addresses] of Array.from(walletsByDepth.entries()).sort((a, b) => a[0] - b[0])) {
        addresses.forEach((address, index) => {
          const x = depth * HORIZONTAL_SPACING;
          const y = index * VERTICAL_SPACING;
          
          const walletNode = walletNodes.get(address)!;
          const isStartNode = depth === 0;
          const shortAddress = formatAddress(address);
          
          let bgColor = '#14181D'; // Dark surface for intermediate
          let borderColor = '1px solid #262B33';
          let label = '';
          let nodeSize = isStartNode ? { width: 180, height: 80 } : { width: 140, height: 60 };
          
          if (isStartNode) {
            bgColor = '#0B0E11'; // Dark background for starting wallet
            borderColor = '2px solid #2DD4BF'; // Teal accent border
            label = 'Starting Wallet';
          }

          // Check if this wallet is an exchange, DEX, or bridge
          const isExchangeNode = walletNode.parentWallets.some(parent => {
            const parentTransfer = enrichedTransfers.find(t => t.from === parent && t.to === address);
            return parentTransfer?.isExchange;
          });
          const isDexNode = walletNode.parentWallets.some(parent => {
            const parentTransfer = enrichedTransfers.find(t => t.from === parent && t.to === address);
            return parentTransfer?.isDex;
          });
          const isBridgeNode = walletNode.parentWallets.some(parent => {
            const parentTransfer = enrichedTransfers.find(t => t.from === parent && t.to === address);
            return parentTransfer?.isBridge;
          });
          const isMergePointNode = walletNode.parentWallets.length > 1;

          if (isExchangeNode) {
            bgColor = '#1a1614'; // Desaturated orange/dark for exchanges
            borderColor = '2px solid #c97a3d'; // Desaturated orange border
            const exchangeName = enrichedTransfers.find(t => t.to === address)?.exchangeName;
            label = exchangeName || 'Exchange';
          } else if (isDexNode) {
            bgColor = '#16141a'; // Desaturated purple/dark for DEX
            borderColor = '2px solid #9c7ac9'; // Desaturated purple border
            const dexName = enrichedTransfers.find(t => t.to === address)?.dexName;
            label = dexName || 'DEX';
          } else if (isBridgeNode) {
            bgColor = '#14161a'; // Desaturated teal/dark for bridges
            borderColor = '2px solid #4ac9a6'; // Desaturated teal border
            const bridgeName = enrichedTransfers.find(t => t.to === address)?.bridgeName;
            label = bridgeName || 'Bridge';
          }

          // Add merge point indicator
          if (isMergePointNode) {
            borderColor = '2px solid #c9a63d'; // Desaturated gold border for merge points
          }

          nodeMap.set(address, {
            id: address,
            data: {
              label: (
                <div className="text-center">
                  <div className="font-bold text-xs">{label}</div>
                  <div className="font-semibold text-sm">{shortAddress}</div>
                  {isMergePointNode && (
                    <div className="text-xs font-bold mt-1" style={{ color: '#c9a63d' }}>⚡ Merge Point</div>
                  )}
                </div>
              ),
            },
            position: { x, y },
            style: {
              background: bgColor,
              color: '#E8EAED',
              border: borderColor,
              borderRadius: '6px',
              padding: isStartNode ? '16px' : '12px',
              minWidth: nodeSize.width,
              minHeight: nodeSize.height,
              fontSize: '12px',
            },
          });
        });
      }

      // Create edges from enriched transfers
      const maxAmount = Math.max(...enrichedTransfers.map(t => t.amount));
      const minAmount = Math.min(...enrichedTransfers.map(t => t.amount));

      for (const transfer of enrichedTransfers) {
        const { from, to, amount, isCycle } = transfer;

        // Calculate arrow thickness based on amount
        const normalizedAmount = (amount - minAmount) / (maxAmount - minAmount || 1);
        const strokeWidth = 1 + normalizedAmount * 3; // 1px to 4px

        // Handle cycle edges
        if (isCycle) {
          const edgeId = `${from}-${to}-${transfer.signature}`;
          edges.push({
            id: edgeId,
            source: from,
            target: to,
            label: `${amount.toFixed(2)} SOL`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#ef4444',
              width: 20,
              height: 20,
            },
            style: {
              stroke: '#ef4444',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            animated: true,
            labelStyle: {
              fill: '#fff',
              fontSize: 10,
              fontWeight: 600,
            },
            labelBgStyle: {
              fill: '#7f1d1d',
              fillOpacity: 0.95,
              borderRadius: '4px',
            },
          });
          continue;
        }

        // Create edge for every transfer
        const edgeId = `${from}-${to}-${transfer.signature}`;
        edges.push({
          id: edgeId,
          source: from,
          target: to,
          type: 'step',
          label: `${amount.toFixed(2)} SOL`,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#8B92A0',
            width: 15 + strokeWidth * 2,
            height: 15 + strokeWidth * 2,
          },
          style: {
            stroke: '#8B92A0',
            strokeWidth: strokeWidth,
          },
          animated: false,
          labelStyle: {
            fill: '#E8EAED',
            fontSize: 10,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: '#14181D',
            fillOpacity: 0.95,
            borderRadius: '4px',
          },
        });
      }

      // Create nodes array from nodeMap
      const nodes: Node[] = Array.from(nodeMap.values());

      // Verify depth 0 has exactly 1 node (the starting wallet)
      const depth0Nodes = nodes.filter((n: Node) => walletNodes.get(n.id)?.depth === 0);
      if (depth0Nodes.length !== 1) {
        console.error(`ERROR: Depth 0 should have exactly 1 node (the root), but has ${depth0Nodes.length} nodes!`);
        console.error('Depth 0 nodes:', depth0Nodes.map((n: Node) => n.id));
      }

      console.log('=== Graph data built using tree structure ===');
      console.log('Total nodes:', nodes.length);
      console.log('Total edges:', edges.length);
      console.log('Depth distribution:', Object.fromEntries(depthCounts));

      return { nodes, edges };
    } catch (error) {
      console.error('Error building graph:', error);
      return { nodes: [], edges: [] };
    }
  }, [transfers, providedStartAddress]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update graph state when initialNodes or initialEdges change (SSE streaming)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="w-full">
      <div className="p-4 rounded mb-4 font-mono text-sm" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Graph Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0B0E11', border: '2px solid #2DD4BF' }}></div>
            <span style={{ color: 'var(--muted)' }}>Starting Wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#1a1614', border: '2px solid #c97a3d' }}></div>
            <span style={{ color: 'var(--muted)' }}>Exchange</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16141a', border: '2px solid #9c7ac9' }}></div>
            <span style={{ color: 'var(--muted)' }}>DEX</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#14161a', border: '2px solid #4ac9a6' }}></div>
            <span style={{ color: 'var(--muted)' }}>Bridge</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#14181D', border: '1px solid #262B33' }}></div>
            <span style={{ color: 'var(--muted)' }}>Intermediate Wallet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ border: '2px solid #c9a63d' }}></div>
            <span style={{ color: 'var(--muted)' }}>Merge Point</span>
          </div>
        </div>
        <div className="mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--foreground)' }}>→ Arrows</span> show money flow direction · <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Thickness</span> scales with amount · <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Red dashed lines</span> indicate cycles
        </div>
      </div>
      <div className="w-full h-[600px] rounded" style={{ backgroundColor: '#0B0E11', border: '1px solid var(--border)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          connectionMode={ConnectionMode.Loose}
          fitView
          nodeTypes={{}}
          edgeTypes={{}}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Background color="#374151" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MoneyFlowGraph;

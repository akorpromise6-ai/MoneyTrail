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
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Transfer } from '@/lib/helius';
import { formatAddress } from '@/lib/utils';

interface MoneyFlowGraphProps {
  transfers: Transfer[];
  startAddress?: string;
}

const MoneyFlowGraph: React.FC<MoneyFlowGraphProps> = ({ transfers, startAddress: providedStartAddress }) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    try {
      if (transfers.length === 0) {
        return { nodes: [], edges: [] };
      }

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

    // STEP 1: IDENTIFY THE ROOT
    // The root node is ALWAYS the wallet address the user typed into the search box
    const rootAddress = providedStartAddress || '';
    
    if (!rootAddress) {
      console.error('ERROR: No root address provided!');
      return { nodes: [], edges: [] };
    }

    // STEP 3: ASSIGN DEPTH USING BFS FROM ROOT ONLY
    const depthMap = new Map<string, number>();
    depthMap.set(rootAddress, 0);
    
    const queue: string[] = [rootAddress];
    const visited = new Set<string>([rootAddress]);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depthMap.get(current)!;
      
      // Find all transactions where this wallet is the SENDER
      const outgoingTransfers = transfers.filter(t => t.from === current);
      
      for (const transfer of outgoingTransfers) {
        const childAddress = transfer.to;
        
        if (!visited.has(childAddress)) {
          visited.add(childAddress);
          depthMap.set(childAddress, currentDepth + 1);
          queue.push(childAddress);
        }
      }
    }

    // CRITICAL: Verify there is only ONE node with no incoming edges (the true root)
    const allAddresses = new Set<string>();
    transfers.forEach(t => {
      allAddresses.add(t.from);
      allAddresses.add(t.to);
    });
    
    const toAddresses = new Set<string>();
    transfers.forEach(t => toAddresses.add(t.to));
    
    const roots = Array.from(allAddresses).filter(addr => !toAddresses.has(addr));
    
    if (roots.length > 1) {
      console.error('Multiple disconnected roots found:', roots.map(r => formatAddress(r)));
      console.error('This indicates stale-state bug where previous search results are not being cleared before new search starts.');
    } else if (roots.length === 0) {
      console.error('No root found! All wallets have incoming edges, which should not happen.');
    }

    // Process ALL transactions - create nodes and edges for each
    transfers.forEach((transfer) => {
      const { from, to, amount, isExchange, exchangeName, isCycle, isDex, dexName, isBridge, bridgeName, mergePoint } = transfer;

      // Skip cycle edges - don't create new nodes, just create edge back to original
      if (isCycle) {
        // Create edge back to original node
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
        return;
      }

      // Create or update node for "from" wallet
      if (!nodeMap.has(from)) {
        if (!addressStats.has(from)) {
          addressStats.set(from, { totalReceived: 0, totalSent: 0, isExchange: false });
        }
        const stats = addressStats.get(from)!;
        stats.totalSent += amount;

        const isStartNode = from === rootAddress;
        const shortAddress = formatAddress(from);
        
        let bgColor = '#14181D'; // Dark surface for intermediate
        let borderColor = '1px solid #262B33';
        let label = '';
        let nodeSize = isStartNode ? { width: 180, height: 80 } : { width: 140, height: 60 };
        
        if (isStartNode) {
          bgColor = '#0B0E11'; // Dark background for starting wallet
          borderColor = '2px solid #2DD4BF'; // Teal accent border
          label = 'Starting Wallet';
        }

        nodeMap.set(from, {
          id: from,
          data: {
            label: (
              <div className="text-center">
                <div className="font-bold text-xs">{label}</div>
                <div className="font-semibold text-sm">{shortAddress}</div>
              </div>
            ),
          },
          position: { x: 0, y: 0 },
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
      } else {
        const stats = addressStats.get(from)!;
        stats.totalSent += amount;
      }

      // Create or update node for "to" wallet
      if (!nodeMap.has(to)) {
        if (!addressStats.has(to)) {
          addressStats.set(to, { 
            totalReceived: 0, 
            totalSent: 0, 
            isExchange: isExchange || false, 
            exchangeName,
            isDex: isDex || false,
            dexName,
            isBridge: isBridge || false,
            bridgeName,
            isMergePoint: mergePoint || false
          });
        }
        const stats = addressStats.get(to)!;
        stats.totalReceived += amount;
        if (isExchange) {
          stats.isExchange = true;
          stats.exchangeName = exchangeName;
        }
        if (isDex) {
          stats.isDex = true;
          stats.dexName = dexName;
        }
        if (isBridge) {
          stats.isBridge = true;
          stats.bridgeName = bridgeName;
        }
        if (mergePoint) {
          stats.isMergePoint = true;
        }

        const isExchangeNode = stats.isExchange;
        const isDexNode = stats.isDex;
        const isBridgeNode = stats.isBridge;
        const isMergePointNode = stats.isMergePoint;
        const shortAddress = formatAddress(to);
        
        let bgColor = '#14181D'; // Dark surface for intermediate
        let borderColor = '1px solid #262B33';
        let label = '';
        
        if (isExchangeNode) {
          bgColor = '#1a1614'; // Desaturated orange/dark for exchanges
          borderColor = '2px solid #c97a3d'; // Desaturated orange border
          label = stats.exchangeName || 'Exchange';
        } else if (isDexNode) {
          bgColor = '#16141a'; // Desaturated purple/dark for DEX
          borderColor = '2px solid #9c7ac9'; // Desaturated purple border
          label = stats.dexName || 'DEX';
        } else if (isBridgeNode) {
          bgColor = '#14161a'; // Desaturated teal/dark for bridges
          borderColor = '2px solid #4ac9a6'; // Desaturated teal border
          label = stats.bridgeName || 'Bridge';
        }

        // Add merge point indicator
        if (isMergePointNode) {
          borderColor = '2px solid #c9a63d'; // Desaturated gold border for merge points
        }

        nodeMap.set(to, {
          id: to,
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
          position: { x: 0, y: 0 },
          style: {
            background: bgColor,
            color: '#E8EAED',
            border: borderColor,
            borderRadius: '6px',
            padding: '12px',
            minWidth: '140px',
            fontSize: '12px',
          },
        });
      } else {
        const stats = addressStats.get(to)!;
        stats.totalReceived += amount;
        if (isExchange) {
          stats.isExchange = true;
          stats.exchangeName = exchangeName;
        }
        if (isDex) {
          stats.isDex = true;
          stats.dexName = dexName;
        }
        if (isBridge) {
          stats.isBridge = true;
          stats.bridgeName = bridgeName;
        }
        if (mergePoint) {
          stats.isMergePoint = true;
        }
      }

      // Calculate arrow thickness based on amount (scale from 1px to 4px)
      const maxAmount = Math.max(...transfers.map(t => t.amount));
      const minAmount = Math.min(...transfers.map(t => t.amount));
      const normalizedAmount = (amount - minAmount) / (maxAmount - minAmount || 1);
      const strokeWidth = 1 + normalizedAmount * 3; // 1px to 4px

      // Create edge for EVERY transaction
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
    });

    // Create nodes array from nodeMap
    const nodes: Node[] = Array.from(nodeMap.values());

    // Apply dagre layout algorithm
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: 'LR', // left to right
      nodesep: 80,    // horizontal spacing between nodes
      ranksep: 200,  // vertical spacing between ranks
    });

    // Add nodes to dagre graph
    nodes.forEach((node: Node) => {
      dagreGraph.setNode(node.id, {
        width: node.style?.minWidth ? parseInt(node.style.minWidth as string) : 140,
        height: node.style?.minHeight ? parseInt(node.style.minHeight as string) : 60,
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge: Edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run dagre layout
    dagre.layout(dagreGraph);

    // Apply calculated positions to nodes
    nodes.forEach((node: Node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (nodeWithPosition) {
        node.position = {
          x: nodeWithPosition.x - (node.style?.minWidth ? parseInt(node.style.minWidth as string) / 2 : 70),
          y: nodeWithPosition.y - (node.style?.minHeight ? parseInt(node.style.minHeight as string) / 2 : 30),
        };
      }
    });

    // STEP 5: VERIFY BEFORE RENDERING
    
    const depth0Nodes = nodes.filter((n: Node) => depthMap.get(n.id) === 0);
    if (depth0Nodes.length !== 1) {
      console.error(`ERROR: Depth 0 should have exactly 1 node (the root), but has ${depth0Nodes.length} nodes!`);
      console.error('Depth 0 nodes:', depth0Nodes.map((n: Node) => n.id));
    }
    
    console.log('=== Graph data built ===');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);

    return { nodes, edges };
    } catch (error) {
      console.error('Error building graph:', error);
      return { nodes: [], edges: [] };
    }
  }, [transfers]);

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

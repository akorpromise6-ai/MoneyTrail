'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import MoneyFlowGraph from '@/components/MoneyFlowGraph';
import { Transfer } from '@/lib/helius';
import { formatAddress } from '@/lib/utils';
import { buildTransferTree, EnrichedTransfer } from '@/lib/buildTransferTree';

export default function TrackPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [minAmount, setMinAmount] = useState('1');
  const [endWalletAddress, setEndWalletAddress] = useState('');
  const [exchangeTarget, setExchangeTarget] = useState('');
  const [maxDepth, setMaxDepth] = useState('');
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ walletsChecked: 0, currentDepth: 0, message: '', queueSize: 0 });
  const [reachedTarget, setReachedTarget] = useState(false);
  const [targetWallet, setTargetWallet] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Use the shared tree structure to get enriched transfers with depth
  const enrichedTransfers = useMemo<EnrichedTransfer[]>(() => {
    if (transfers.length === 0 || !walletAddress) return [];
    const result = buildTransferTree(transfers, walletAddress);
    return result.enrichedTransfers;
  }, [transfers, walletAddress]);

  // Sort transfers by depth, then by parent wallet for grouping
  const sortedTransfers = useMemo<EnrichedTransfer[]>(() => {
    return [...enrichedTransfers].sort((a, b) => {
      // Primary sort: by depth
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      // Secondary sort: by parent wallet (from address) to group branches together
      if (a.from !== b.from) {
        return a.from.localeCompare(b.from);
      }
      // Tertiary sort: by timestamp
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [enrichedTransfers]);

  // Helper function to get border color based on depth
  const getDepthBorderColor = (depth: number): string => {
    const colors = [
      '#2DD4BF', // Depth 1 - Teal
      '#60A5FA', // Depth 2 - Blue
      '#A78BFA', // Depth 3 - Purple
      '#F472B6', // Depth 4 - Pink
      '#FB923C', // Depth 5 - Orange
    ];
    return colors[(depth - 1) % colors.length];
  };

  // Verify consistency between graph and table
  useEffect(() => {
    if (sortedTransfers.length > 0) {
      const depthCounts = new Map<number, number>();
      for (const transfer of sortedTransfers) {
        depthCounts.set(transfer.depth, (depthCounts.get(transfer.depth) || 0) + 1);
      }
      
      console.log('=== Table Depth Distribution (for verification) ===');
      for (const [depth, count] of Array.from(depthCounts.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`Depth ${depth}: ${count} transfers`);
      }
      console.log('Total transfers in table:', sortedTransfers.length);
      console.log('This should match the graph depth distribution logged above.');
    }
  }, [sortedTransfers]);

  // Load tracking defaults from localStorage on mount
  useEffect(() => {
    const savedMinAmount = localStorage.getItem('trackTheMoney_defaultMinAmount');
    const savedMaxDepth = localStorage.getItem('trackTheMoney_defaultMaxDepth');
    
    if (savedMinAmount !== null) {
      const parsedMinAmount = parseFloat(savedMinAmount);
      if (!isNaN(parsedMinAmount)) {
        setMinAmount(savedMinAmount);
      }
    }
    if (savedMaxDepth !== null) {
      const parsedMaxDepth = parseInt(savedMaxDepth, 10);
      if (!isNaN(parsedMaxDepth)) {
        setMaxDepth(savedMaxDepth);
      }
    }
  }, []);

  const handleTrack = async () => {
    if (!walletAddress || !minAmount) {
      setError('Please enter both wallet address and minimum amount');
      return;
    }

    setLoading(true);
    setError('');
    setTransfers([]);
    setSummary('');
    setProgress({ walletsChecked: 0, currentDepth: 0, message: '', queueSize: 0 });
    setReachedTarget(false);
    setTargetWallet('');

    // Force a state update cycle to ensure transfers are cleared before fetch
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          minAmount,
          endWalletAddress: endWalletAddress || undefined,
          exchangeTarget: exchangeTarget || undefined,
          maxDepth: maxDepth || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to track money flow');
      }

      // Consume SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgress({
                  walletsChecked: data.walletsChecked,
                  currentDepth: data.currentDepth,
                  message: data.message,
                  queueSize: data.queueSize || 0,
                });
              } else if (data.type === 'found') {
                setTransfers(prev => [...prev, data.transfer]);
              } else if (data.type === 'complete') {
                setTransfers(data.transfers);
                setSummary(data.summary);
                setReachedTarget(data.reachedTarget);
                setTargetWallet(data.targetWallet || '');
                setLoading(false);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE line:', line, parseError);
              // Skip malformed lines and continue processing
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      {/* Hero Section */}
      <div className='mb-8' style={{ maxHeight: '30vh' }}>
        <h1 className='text-3xl sm:text-4xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
          Follow the money. See everything.
        </h1>
        <p className='text-base sm:text-lg mb-6 max-w-3xl' style={{ color: 'var(--muted)' }}>
          Trace Solana wallet transfers across multiple hops and see exactly where funds end up: exchanges, DEXs, bridges, or dead ends.
        </p>
        <div className='flex flex-wrap gap-2 text-xs font-mono'>
          <span className='px-3 py-1 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            Multi-hop tracing
          </span>
          <span className='px-3 py-1 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            Cycle detection
          </span>
          <span className='px-3 py-1 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            Exchange identification
          </span>
          <span className='px-3 py-1 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
            On-chain verified
          </span>
        </div>
      </div>

      {/* Search Form */}
      <div className='mb-8 p-6 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Basic Inputs */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
          <div>
            <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
              Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter Solana wallet address"
              className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
              style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
          </div>
          <div>
            <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
              Minimum Amount (SOL)
            </label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="1"
              step="0.01"
              min="0"
              className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
              style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className='flex items-center gap-2 text-sm font-mono mb-4 transition-colors'
          style={{ color: 'var(--muted)' }}
        >
          {showAdvanced ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced Inputs */}
        {showAdvanced && (
          <div className='border-t pt-4 mb-4' style={{ borderColor: 'var(--border)' }}>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
                  End Wallet / Exchange Address (Optional)
                </label>
                <input
                  type="text"
                  value={endWalletAddress}
                  onChange={(e) => setEndWalletAddress(e.target.value)}
                  placeholder="Target wallet address"
                  className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--foreground)',
                    '--tw-ring-color': 'var(--accent)'
                  } as React.CSSProperties}
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
                  Known Exchange (Optional)
                </label>
                <select
                  value={exchangeTarget}
                  onChange={(e) => setExchangeTarget(e.target.value)}
                  className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--foreground)',
                    '--tw-ring-color': 'var(--accent)'
                  } as React.CSSProperties}
                >
                  <option value="">Select exchange</option>
                  <option value="Binance">Binance</option>
                  <option value="Coinbase">Coinbase</option>
                  <option value="Kraken">Kraken</option>
                  <option value="Bybit">Bybit</option>
                  <option value="OKX">OKX</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
                  Max Depth (Optional)
                </label>
                <input
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(e.target.value)}
                  placeholder="Default: 3"
                  min="1"
                  max="10"
                  className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
                  style={{ 
                    backgroundColor: 'var(--background)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--foreground)',
                    '--tw-ring-color': 'var(--accent)'
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleTrack}
          disabled={loading}
          className='w-full py-3 px-6 rounded flex items-center justify-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90'
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: '#0B0E11',
            borderRadius: '4px'
          }}
        >
          <Search className='w-4 h-4' />
          {loading ? 'Tracking...' : 'Track Money Flow'}
        </button>

        {/* Progress Bar */}
        {loading && (
          <div className='mt-4'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>{progress.message}</span>
              <span className='text-sm font-mono' style={{ color: 'var(--muted)' }}>
                Depth: {progress.currentDepth} · Queue: {progress.queueSize}
              </span>
            </div>
            <div className='w-full rounded' style={{ backgroundColor: 'var(--border)', height: '8px' }}>
              <div 
                className='h-full rounded transition-all duration-300'
                style={{ 
                  width: `${Math.min(progress.walletsChecked * 5, 100)}%`,
                  backgroundColor: 'var(--accent)'
                }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className='mt-4 p-4 rounded border font-mono text-sm' style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            borderColor: 'var(--alert)', 
            color: 'var(--alert)'
          }}>
            {error}
          </div>
        )}
      </div>

      {transfers.length > 0 && (
        <>
          {reachedTarget && (
            <div className='mb-8 p-4 rounded border font-mono text-sm' style={{ 
              backgroundColor: 'rgba(52, 211, 153, 0.1)', 
              borderColor: 'var(--success)', 
              color: 'var(--success)'
            }}>
              <h3 className='font-semibold mb-2'>✓ Target Reached</h3>
              <p>
                Funds successfully tracked to target wallet: {formatAddress(targetWallet || '')}
              </p>
            </div>
          )}

          <div className='mb-8 p-6 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className='text-xl font-bold font-mono mb-6' style={{ color: 'var(--foreground)' }}>
              Transaction Graph
            </h2>
            <MoneyFlowGraph transfers={transfers} startAddress={walletAddress} />
          </div>

          <div className='mb-8 p-6 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className='text-xl font-bold font-mono mb-6' style={{ color: 'var(--foreground)' }}>
              AI Summary
            </h2>
            <div className='prose max-w-none'>
              <p className='whitespace-pre-wrap' style={{ color: 'var(--foreground)' }}>{summary}</p>
            </div>
          </div>

          <div className='p-6 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className='text-xl font-bold font-mono mb-6' style={{ color: 'var(--foreground)' }}>
              Transaction Details
            </h2>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b' style={{ borderColor: 'var(--border)' }}>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      Hop
                    </th>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      From
                    </th>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      To
                    </th>
                    <th className='text-right py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      Amount (SOL)
                    </th>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      Timestamp
                    </th>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      Signature
                    </th>
                    <th className='text-left py-3 px-4 font-semibold font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                      Exchange
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransfers.map((transfer, index) => (
                    <tr
                      key={transfer.signature}
                      className='border-b hover:opacity-80 transition-opacity'
                      style={{ 
                        borderColor: 'var(--border)',
                        backgroundColor: index % 2 === 0 ? 'var(--surface)' : '#11141A',
                        borderLeft: `3px solid ${getDepthBorderColor(transfer.depth)}`,
                      }}
                    >
                      <td className='py-3 px-4 font-mono text-sm font-bold' style={{ color: 'var(--accent)' }}>
                        {transfer.depth}
                      </td>
                      <td className='py-3 px-4 font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                        {formatAddress(transfer.from)}
                      </td>
                      <td className='py-3 px-4 font-mono text-sm' style={{ color: 'var(--foreground)' }}>
                        {formatAddress(transfer.to)}
                      </td>
                      <td className='py-3 px-4 font-mono text-sm text-right tabular-nums' style={{ color: 'var(--success)' }}>
                        {transfer.amount.toFixed(4)}
                      </td>
                      <td className='py-3 px-4 text-sm' style={{ color: 'var(--muted)' }}>
                        {new Date(transfer.timestamp).toLocaleString()}
                      </td>
                      <td className='py-3 px-4 font-mono text-xs'>
                        <a
                          href={`https://solscan.io/tx/${transfer.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className='flex items-center gap-1 transition-colors'
                          style={{ color: 'var(--accent)' }}
                        >
                          {formatAddress(transfer.signature, 16, 0)}
                          <ExternalLink className='w-3 h-3' />
                        </a>
                      </td>
                      <td className='py-3 px-4 text-sm'>
                        {transfer.isExchange ? (
                          <span className='px-2 py-1 rounded text-xs font-mono' style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }}>
                            {transfer.exchangeName}
                          </span>
                        ) : transfer.isDex ? (
                          <span className='px-2 py-1 rounded text-xs font-mono' style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                            {transfer.dexName}
                          </span>
                        ) : transfer.isBridge ? (
                          <span className='px-2 py-1 rounded text-xs font-mono' style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                            {transfer.bridgeName}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

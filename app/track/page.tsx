'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import MoneyFlowGraph from '@/components/MoneyFlowGraph';
import { Transfer } from '@/lib/helius';
import { formatAddress } from '@/lib/utils';
import { buildTransferTree, EnrichedTransfer } from '@/lib/buildTransferTree';

export default function TrackPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [minAmount, setMinAmount] = useState('1');
  const [endWalletAddress, setEndWalletAddress] = useState('');
  const [exchangeTarget, setExchangeTarget] = useState('');
  const [maxDepth, setMaxDepth] = useState('');
  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ walletsChecked: 0, currentDepth: 0, message: '', queueSize: 0 });
  const [reachedTarget, setReachedTarget] = useState(false);
  const [targetWallet, setTargetWallet] = useState('');
  const [effectiveRootWallet, setEffectiveRootWallet] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Use the shared tree structure to get enriched transfers with depth
  const enrichedTransfers = useMemo<EnrichedTransfer[]>(() => {
    const rootToUse = effectiveRootWallet || walletAddress;
    if (transfers.length === 0 || !rootToUse) return [];
    console.log('=== Transfers passed to buildTransferTree ===');
    console.log(`Total transfers: ${transfers.length}`);
    console.log(`Using root wallet: ${rootToUse}`);
    transfers.forEach((t, i) => {
      console.log(`  ${i + 1}. from=${t.from.slice(0, 8)}... to=${t.to.slice(0, 8)}... amount=${t.amount.toFixed(2)}`);
    });
    const result = buildTransferTree(transfers, rootToUse);
    return result.enrichedTransfers;
  }, [transfers, effectiveRootWallet, walletAddress]);

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
    if (!walletAddress && !transactionHash) {
      setError('Please enter either wallet address or transaction hash');
      return;
    }
    if (!minAmount) {
      setError('Please enter minimum amount');
      return;
    }
    
    // Validate wallet address is not a URL
    if (walletAddress && (walletAddress.startsWith('http://') || walletAddress.startsWith('https://'))) {
      setError('Invalid wallet address: please enter a Solana wallet address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM), not a URL');
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
          walletAddress: walletAddress || undefined,
          transactionHash: transactionHash || undefined,
          minAmount,
          endWalletAddress: endWalletAddress || undefined,
          exchangeTarget: exchangeTarget || undefined,
          maxDepth: maxDepth || undefined,
          direction,
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
                // DIAGNOSTIC: Log when complete event is received
                console.log('=== DIAGNOSTIC: Complete event received from SSE ===');
                console.log('Full received data:', data);
                console.log(`data.transfers.length: ${data.transfers?.length}`);
                console.log('First transfer:', data.transfers?.[0]);

                // DIAGNOSTIC: Log before setting transfers state
                console.log('=== DIAGNOSTIC: About to call setTransfers ===');
                console.log('Value being passed to setTransfers:', data.transfers);
                console.log('Length of array being passed:', data.transfers?.length);

                setTransfers(data.transfers);
                setSummary(data.summary);
                setReachedTarget(data.reachedTarget);
                setTargetWallet(data.targetWallet || '');
                setEffectiveRootWallet(data.effectiveRootWallet || walletAddress);
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
    <div className='h-screen w-screen flex flex-col bg-background overflow-hidden'>
      {/* Top Navigation Bar */}
      <header className='flex items-center justify-between whitespace-nowrap border-b border-solid border-border bg-surface px-4 sm:px-6 py-3 shrink-0 z-20'>
        <div className='flex items-center gap-2 sm:gap-4'>
          <div className='size-6 text-accent'>
            <Search className='w-6 h-6' />
          </div>
          <h2 className='text-foreground text-base sm:text-lg font-bold font-display leading-tight tracking-[-0.015em]'>
            MoneyTrail
          </h2>
          {walletAddress && (
            <div className='hidden sm:flex items-center gap-2 ml-4 sm:ml-8 border-l border-border pl-4 sm:pl-8'>
              <span className='text-muted hover:text-accent transition-colors text-sm font-medium cursor-pointer'>Trace</span>
              <span className='text-border text-sm'>/</span>
              <span className='text-foreground text-sm font-mono bg-border/30 px-2 py-0.5 rounded'>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>
        <div className='flex items-center gap-2 sm:gap-4'>
          <button className='flex items-center justify-center size-8 rounded hover:bg-border transition-colors text-muted' title='System Diagnostics'>
            <RefreshCw className='w-4 h-4' />
          </button>
          <button className='hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded h-8 px-4 bg-accent text-background text-sm font-bold font-display transition-opacity hover:opacity-90'>
            <span className='truncate'>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className='flex flex-1 overflow-hidden relative'>
        {/* Left Filter Sidebar */}
        <aside className='w-[280px] bg-surface border-r border-border flex flex-col shrink-0 z-10 hidden lg:flex xl:flex'>
          <div className='p-4 border-b border-border flex items-center justify-between'>
            <h3 className='font-display font-semibold text-sm text-foreground uppercase tracking-wider'>Filters</h3>
            <button className='text-muted hover:text-foreground'>
              <ChevronDown className='w-4 h-4' />
            </button>
          </div>
          <div className='flex-1 overflow-y-auto p-4 space-y-6'>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <label className='text-xs font-medium text-muted uppercase tracking-wide'>Volume Threshold</label>
                <span className='text-xs font-mono text-accent'>&gt; {minAmount} SOL</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Content Area */}
        <main className='flex-1 flex flex-col overflow-hidden bg-dot-pattern'>
          {/* Search Form (Collapsible) */}
          <div className={`p-6 bg-surface border-b border-border shrink-0 transition-all ${transfers.length > 0 ? 'hidden' : ''}`}>
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
              disabled={!!transactionHash}
              className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
              style={{ 
                backgroundColor: transactionHash ? 'var(--muted)' : 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
          </div>
          <div>
            <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
              Transaction Hash (optional)
            </label>
            <input
              type="text"
              value={transactionHash}
              onChange={(e) => {
                setTransactionHash(e.target.value);
                if (e.target.value) setWalletAddress('');
              }}
              placeholder="Enter transaction signature"
              disabled={!!walletAddress}
              className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
              style={{ 
                backgroundColor: walletAddress ? 'var(--muted)' : 'var(--background)', 
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
          <div>
            <label className='block text-sm font-medium mb-2 font-mono' style={{ color: 'var(--foreground)' }}>
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'outgoing' | 'incoming')}
              className='w-full px-4 py-2 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all'
              style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            >
              <option value="outgoing">Outgoing (from wallet)</option>
              <option value="incoming">Incoming (to wallet)</option>
            </select>
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
            className='w-full h-10 bg-accent text-background font-display font-medium text-[13px] rounded hover:bg-white hover:shadow-[0_0_15px_rgba(45,212,191,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Search className='w-4 h-4' />
            {loading ? 'Tracking...' : 'Track Money Flow'}
          </button>

          {/* Progress Bar */}
          {loading && (
            <div className='mt-4'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-sm font-mono text-foreground'>{progress.message}</span>
                <span className='text-sm font-mono text-muted'>
                  Depth: {progress.currentDepth} · Queue: {progress.queueSize}
                </span>
              </div>
              <div className='w-full rounded bg-border h-2'>
                <div 
                  className='h-full rounded transition-all duration-300 bg-accent'
                  style={{ width: `${Math.min(progress.walletsChecked * 5, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className='mt-4 p-4 rounded border font-mono text-sm bg-accent-red/10 border-accent-red text-accent-red'>
              {error}
            </div>
          )}
        </div>

          {/* Results Area */}
          {transfers.length > 0 && (
            <div className='flex-1 overflow-hidden flex flex-col'>
              {/* Target Reached Banner */}
              {reachedTarget && (
                <div className='mb-4 p-4 rounded border font-mono text-sm bg-accent-green/10 border-accent-green text-accent-green mx-6 mt-4'>
                  <h3 className='font-semibold mb-2'>✓ Target Reached</h3>
                  <p>
                    Funds successfully tracked to target wallet: {formatAddress(targetWallet || '')}
                  </p>
                </div>
              )}

              {/* Direction Switch Banner */}
              {effectiveRootWallet && effectiveRootWallet !== walletAddress && (
                <div className='mb-4 p-4 rounded bg-[#1a1f2e] border border-[#3b82f6] mx-6'>
                  <p className='text-sm text-[#e0e7ff]'>
                    <span className='font-semibold'>ℹ️ Direction Switch:</span> {formatAddress(walletAddress)} had no outgoing transfers above the minimum amount. Showing the flow FROM {formatAddress(effectiveRootWallet)}, which sent money into your searched wallet.
                  </p>
                </div>
              )}

              {/* Graph Section */}
              <div className='flex-1 overflow-hidden px-4 sm:px-6 py-4'>
                <MoneyFlowGraph transfers={transfers} startAddress={effectiveRootWallet || walletAddress} />
              </div>

              {/* AI Summary Section */}
              <div className='px-4 sm:px-6 pb-4'>
                <div className='p-4 sm:p-6 rounded bg-surface border border-border'>
                  <h2 className='text-lg sm:text-xl font-bold font-display mb-4 sm:mb-6 text-foreground uppercase tracking-wider'>
                    AI Summary
                  </h2>
                  <div className='prose max-w-none'>
                    <p className='whitespace-pre-wrap text-foreground text-sm sm:text-base'>{summary}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Table Section */}
              <div className='px-4 sm:px-6 pb-6'>
                <div className='p-4 sm:p-6 rounded bg-surface border border-border'>
                  <h2 className='text-lg sm:text-xl font-bold font-display mb-4 sm:mb-6 text-foreground uppercase tracking-wider'>
                    Transaction Details
                  </h2>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b border-border'>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            Hop
                          </th>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            From
                          </th>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            To
                          </th>
                          <th className='text-right py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            Amount (SOL)
                          </th>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            Timestamp
                          </th>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            Signature
                          </th>
                          <th className='text-left py-3 px-4 font-semibold font-mono text-xs text-muted uppercase tracking-wider'>
                            Exchange
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTransfers.map((transfer, index) => (
                          <tr
                            key={transfer.signature}
                            className='border-b border-border/50 hover:bg-border/30 cursor-pointer'
                            style={{ 
                              backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(17, 20, 26, 0.5)',
                              borderLeft: `3px solid ${getDepthBorderColor(transfer.depth)}`,
                            }}
                          >
                            <td className='py-2 px-4 font-mono text-xs font-bold text-accent'>
                              {transfer.depth}
                            </td>
                            <td className='py-2 px-4 font-mono text-xs text-foreground'>
                              {formatAddress(transfer.from)}
                            </td>
                            <td className='py-2 px-4 font-mono text-xs text-foreground'>
                              {formatAddress(transfer.to)}
                            </td>
                            <td className='py-2 px-4 font-mono text-xs text-right tabular-nums text-accent-green'>
                              {transfer.amount.toFixed(4)}
                            </td>
                            <td className='py-2 px-4 text-xs text-muted'>
                              {new Date(transfer.timestamp).toLocaleString()}
                            </td>
                            <td className='py-2 px-4 font-mono text-[10px]'>
                              <a
                                href={`https://solscan.io/tx/${transfer.signature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className='flex items-center gap-1 transition-colors text-accent hover:opacity-80'
                              >
                                {formatAddress(transfer.signature, 16, 0)}
                                <ExternalLink className='w-3 h-3' />
                              </a>
                            </td>
                            <td className='py-2 px-4 text-xs'>
                              {transfer.isExchange ? (
                                <span className='px-2 py-1 rounded text-[10px] font-mono bg-accent-orange/20 text-accent-orange'>
                                  {transfer.exchangeName}
                                </span>
                              ) : transfer.isDex ? (
                                <span className='px-2 py-1 rounded text-[10px] font-mono bg-[rgba(139, 92, 246, 0.2)] text-[#8b5cf6]'>
                                  {transfer.dexName}
                                </span>
                              ) : transfer.isBridge ? (
                                <span className='px-2 py-1 rounded text-[10px] font-mono bg-[rgba(20, 184, 166, 0.2)] text-[#14b8a6]'>
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
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

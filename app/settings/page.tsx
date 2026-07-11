'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ServiceStatus {
  connected: boolean;
  message: string;
}

interface StatusResponse {
  helius: ServiceStatus;
  anthropic: ServiceStatus;
  database: ServiceStatus;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [defaultMinAmount, setDefaultMinAmount] = useState(5);
  const [defaultMaxDepth, setDefaultMaxDepth] = useState(3);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Load tracking defaults from localStorage on mount
  useEffect(() => {
    const savedMinAmount = localStorage.getItem('trackTheMoney_defaultMinAmount');
    const savedMaxDepth = localStorage.getItem('trackTheMoney_defaultMaxDepth');
    
    if (savedMinAmount !== null) {
      const parsedMinAmount = parseFloat(savedMinAmount);
      if (!isNaN(parsedMinAmount)) {
        setDefaultMinAmount(parsedMinAmount);
      }
    }
    if (savedMaxDepth !== null) {
      const parsedMaxDepth = parseInt(savedMaxDepth, 10);
      if (!isNaN(parsedMaxDepth)) {
        setDefaultMaxDepth(parsedMaxDepth);
      }
    }
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('trackTheMoney_defaultMinAmount', defaultMinAmount.toString());
    }, 500);
    return () => clearTimeout(timer);
  }, [defaultMinAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('trackTheMoney_defaultMaxDepth', defaultMaxDepth.toString());
    }, 500);
    return () => clearTimeout(timer);
  }, [defaultMaxDepth]);

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 whitespace-nowrap border-b border-solid border-border bg-surface px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <h2 className="text-foreground text-base sm:text-lg font-bold font-display leading-tight tracking-[-0.015em]">
            System Telemetry
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-md">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-accent-green text-[10px] sm:text-xs font-mono font-medium tracking-wide uppercase">All Systems Operational</span>
          </div>
        </div>
        <div className="text-muted text-[10px] sm:text-xs font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] sm:text-[16px]">schedule</span>
          LAST_SYNC: 14:32:05 UTC
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto bg-background">
        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-max mb-8">
          {/* Helius RPC Card */}
          <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-muted transition-colors">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-foreground text-[20px]">dns</span>
                <h2 className="text-foreground font-display text-sm font-semibold uppercase">Helius RPC Node</h2>
              </div>
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Latency</span>
                <div className="flex items-end gap-1">
                  <span className="text-foreground font-mono text-xl">24</span>
                  <span className="text-muted text-xs font-mono mb-1">ms</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Success Rate</span>
                <div className="flex items-end gap-1">
                  <span className="text-accent-green font-mono text-xl">99.99</span>
                  <span className="text-accent-green text-xs font-mono mb-1">%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Block Height</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-mono text-lg tracking-wider">283,912,411</span>
                  <span className="material-symbols-outlined text-accent-green text-[14px]">arrow_upward</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Engine Card */}
          <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-4 relative hover:border-muted transition-colors">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-foreground text-[20px]">psychology</span>
                <h2 className="text-foreground font-display text-sm font-semibold uppercase">Forensic AI Engine</h2>
              </div>
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot"></div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Tokens Used (24h)</span>
                  <span className="text-foreground font-mono text-xl">1.24M</span>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Quota</span>
                  <span className="text-foreground font-mono text-sm">62%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-background border border-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full relative" style={{ width: '62%' }}>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted text-[11px] font-mono uppercase">Model: GPT-4-TURBO</span>
                <span className="text-muted text-[11px] font-mono uppercase">Avg Inference: 840ms</span>
              </div>
            </div>
          </div>

          {/* Database Card */}
          <div className="bg-surface border border-border rounded-md p-5 flex flex-col gap-4 relative hover:border-muted transition-colors">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-foreground text-[20px]">database</span>
                <h2 className="text-foreground font-display text-sm font-semibold uppercase">Graph DB Cluster</h2>
              </div>
              <div className="w-2 h-2 rounded-full bg-accent-orange animate-pulse-dot shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-muted text-[11px] font-mono uppercase tracking-wider">Read IOPS</span>
                  <span className="text-foreground font-mono text-lg">14.2K</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-accent-orange text-[11px] font-mono uppercase tracking-wider">Query Latency</span>
                  <div className="flex items-end gap-1">
                    <span className="text-accent-orange font-mono text-lg">145</span>
                    <span className="text-accent-orange text-xs font-mono mb-1">ms</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-muted text-[11px] font-mono uppercase tracking-wider mb-1">Query Execution Time (ms)</span>
                <div className="w-full h-10 flex items-end gap-[2px] opacity-80">
                  <div className="w-full h-[40%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[45%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[35%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[55%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[40%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[60%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[50%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[85%] bg-accent-orange hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[95%] bg-accent-orange hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[70%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[45%] bg-border hover:bg-accent transition-colors"></div>
                  <div className="w-full h-[40%] bg-border hover:bg-accent transition-colors"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking Defaults Section */}
        <div className="p-4 sm:p-6 rounded bg-surface border border-border">
          <h2 className="text-lg sm:text-xl font-bold font-display mb-4 sm:mb-6 text-foreground uppercase tracking-wider">
            Tracking Defaults
          </h2>

          <div className="space-y-4 sm:space-y-6">
            {/* Default Minimum Amount */}
            <div>
              <label className="font-display text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
                Default Minimum Amount (SOL)
              </label>
              <input
                type="number"
                value={defaultMinAmount}
                onChange={(e) => setDefaultMinAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                className="w-full px-4 py-3 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-background border border-border text-foreground focus:border-accent focus:ring-accent"
              />
              <p className="font-mono text-xs mt-2 text-muted">
                Minimum SOL amount to filter transfers. Default: 5
              </p>
            </div>

            {/* Default Max Depth */}
            <div>
              <label className="font-display text-xs font-semibold text-muted uppercase tracking-wider mb-2 block">
                Default Max Depth
              </label>
              <input
                type="number"
                value={defaultMaxDepth}
                onChange={(e) => setDefaultMaxDepth(parseInt(e.target.value) || 0)}
                min="1"
                max="100"
                step="1"
                className="w-full px-4 py-3 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all bg-background border border-border text-foreground focus:border-accent focus:ring-accent"
              />
              <p className="font-mono text-xs mt-2 text-muted">
                Maximum number of wallet hops to trace. Default: 3
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

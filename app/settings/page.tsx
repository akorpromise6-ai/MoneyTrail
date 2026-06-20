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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          Settings
        </h1>
        <p className="text-base sm:text-lg" style={{ color: 'var(--muted)' }}>
          Configure your TrackTheMoney preferences.
        </p>
      </div>

      {/* System Status */}
      <div className="mb-8 p-6 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-mono" style={{ color: 'var(--foreground)' }}>
            System Status
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#0B0E11',
              borderRadius: '4px'
            }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--muted)' }} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Helius */}
            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                {status?.helius.connected ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#2DD4BF' }} />
                ) : (
                  <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                )}
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Helius
                </span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
                {status?.helius.message || 'Unknown'}
              </span>
            </div>

            {/* Anthropic AI */}
            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                {status?.anthropic.connected ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#2DD4BF' }} />
                ) : (
                  <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                )}
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Anthropic AI
                </span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
                {status?.anthropic.message || 'Unknown'}
              </span>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                {status?.database.connected ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#2DD4BF' }} />
                ) : (
                  <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                )}
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Database
                </span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
                {status?.database.message || 'Unknown'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tracking Defaults */}
      <div className="p-6 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold font-mono mb-6" style={{ color: 'var(--foreground)' }}>
          Tracking Defaults
        </h2>

        <div className="space-y-6">
          {/* Default Minimum Amount */}
          <div>
            <label className="block font-mono text-sm mb-2" style={{ color: 'var(--foreground)' }}>
              Default Minimum Amount (SOL)
            </label>
            <input
              type="number"
              value={defaultMinAmount}
              onChange={(e) => setDefaultMinAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              className="w-full px-4 py-3 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
              style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Minimum SOL amount to filter transfers. Default: 5
            </p>
          </div>

          {/* Default Max Depth */}
          <div>
            <label className="block font-mono text-sm mb-2" style={{ color: 'var(--foreground)' }}>
              Default Max Depth
            </label>
            <input
              type="number"
              value={defaultMaxDepth}
              onChange={(e) => setDefaultMaxDepth(parseInt(e.target.value) || 0)}
              min="1"
              max="100"
              step="1"
              className="w-full px-4 py-3 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
              style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Maximum number of wallet hops to trace. Default: 3
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

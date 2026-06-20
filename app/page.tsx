'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Book } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          TrackTheMoney
        </h1>
        <p className="text-2xl sm:text-3xl font-mono mb-6" style={{ color: 'var(--accent)' }}>
          Follow the flow, not the wallet.
        </p>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-8" style={{ color: 'var(--muted)' }}>
          Track funds across wallets, visualize money flows, and investigate where value ultimately ends up.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
        {/* Track Card */}
        <Link href="/track" className="block group">
          <div className="flex flex-col justify-between p-8 rounded h-full transition-all hover:opacity-90" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded" style={{ backgroundColor: 'var(--accent)' }}>
                  <Search className="w-6 h-6" style={{ color: '#0B0E11' }} />
                </div>
                <h2 className="text-2xl font-bold font-mono" style={{ color: 'var(--foreground)' }}>
                  Track
                </h2>
              </div>
              <p className="text-base" style={{ color: 'var(--muted)' }}>
                Start tracing money flows and investigate where funds move.
              </p>
            </div>
            <button className="w-full py-3 px-6 rounded font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 group-hover:opacity-90 mt-6" style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#0B0E11',
              borderRadius: '4px'
            }}>
              Launch Tracker
            </button>
          </div>
        </Link>

        {/* Docs Card */}
        <Link href="/docs" className="block group">
          <div className="flex flex-col justify-between p-8 rounded h-full transition-all hover:opacity-90" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded" style={{ backgroundColor: 'var(--accent)' }}>
                  <Book className="w-6 h-6" style={{ color: '#0B0E11' }} />
                </div>
                <h2 className="text-2xl font-bold font-mono" style={{ color: 'var(--foreground)' }}>
                  Docs
                </h2>
              </div>
              <p className="text-base" style={{ color: 'var(--muted)' }}>
                Learn how to use TrackTheMoney efficiently.
              </p>
            </div>
            <button className="w-full py-3 px-6 rounded font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 group-hover:opacity-90 mt-6" style={{ 
              backgroundColor: 'var(--accent)', 
              color: '#0B0E11',
              borderRadius: '4px'
            }}>
              Read Docs
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}

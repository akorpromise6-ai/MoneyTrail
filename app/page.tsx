'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Book, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-grid">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-foreground mb-4 tracking-tight">
              MoneyTrail
            </h1>
            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto">
              Follow the flow, not the wallet.
            </p>
          </div>

          {/* Menu Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Track Card */}
            <Link href="/track" className="group">
              <div className="bg-surface border border-border rounded-lg p-8 hover:border-accent transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <Search className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
                      Track
                    </h2>
                    <p className="text-muted text-sm">
                      Trace Solana wallet transfers across multiple hops and visualize money flows.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-accent text-sm font-medium mt-4">
                  <span>Start Tracing</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Docs Card */}
            <Link href="/docs" className="group">
              <div className="bg-surface border border-border rounded-lg p-8 hover:border-accent transition-all duration-300 hover:shadow-[0_0_30px_rgba(45,212,191,0.15)]">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <Book className="w-8 h-8 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
                      Documentation
                    </h2>
                    <p className="text-muted text-sm">
                      Learn how to use MoneyTrail effectively with guides and examples.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-accent text-sm font-medium mt-4">
                  <span>Read Docs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-accent font-display font-semibold text-sm uppercase tracking-wider mb-2">
                Multi-hop
              </div>
              <p className="text-muted text-xs">
                Trace funds across unlimited wallet hops
              </p>
            </div>
            <div className="text-center">
              <div className="text-accent font-display font-semibold text-sm uppercase tracking-wider mb-2">
                Visualization
              </div>
              <p className="text-muted text-xs">
                Interactive graph topology
              </p>
            </div>
            <div className="text-center">
              <div className="text-accent font-display font-semibold text-sm uppercase tracking-wider mb-2">
                AI Analysis
              </div>
              <p className="text-muted text-xs">
                Automated forensic insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['introduction']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      summary: 'Overview of TrackTheMoney and its capabilities',
      content: `
        <p>TrackTheMoney is a powerful Solana transaction tracking tool that helps you visualize money flows across multiple wallets and hops. It's designed for investigators, researchers, and anyone who needs to trace where funds ultimately end up.</p>
        
        <h4>Key Features</h4>
        <ul>
          <li>Trace transfers across multiple wallet hops</li>
          <li>Identify exchange destinations (CEXs, DEXs, bridges)</li>
          <li>Detect circular transactions (cycles)</li>
          <li>Visualize money flow patterns with interactive graphs</li>
          <li>Get AI-powered summaries of transaction patterns</li>
        </ul>
      `
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      summary: 'Quick start guide for using TrackTheMoney',
      content: `
        <h4>Entering Wallets</h4>
        <p>Navigate to the Track page and enter a Solana wallet address in the "Wallet Address" field. The address should be 32-44 characters long.</p>
        
        <h4>Setting Amount Thresholds</h4>
        <p>Enter a minimum SOL amount in the "Minimum Amount" field. This filters out small transfers and focuses on significant money movements. A good starting point is 1 SOL.</p>
        
        <h4>Interpreting Graphs</h4>
        <p>The transaction graph shows:</p>
        <ul>
          <li><strong>Nodes:</strong> Wallet addresses involved in transfers</li>
          <li><strong>Edges:</strong> Transaction flows between wallets</li>
          <li><strong>Edge thickness:</strong> Represents transaction amount (thicker = larger amount)</li>
          <li><strong>Node colors:</strong> Different colors indicate different types (exchanges, DEXs, bridges, regular wallets)</li>
          <li><strong>Dashed edges:</strong> Indicate circular transactions (cycles)</li>
        </ul>
        
        <h4>Following Flows</h4>
        <p>Start from the left (your starting wallet) and follow the edges to the right. The graph is organized left-to-right to show the progression of funds through the network.</p>
      `
    },
    {
      id: 'tracking-guide',
      title: 'Tracking Guide',
      summary: 'Advanced tracking techniques and investigation methods',
      content: `
        <h4>Investigating Wallets</h4>
        <p>Start with a wallet address you want to investigate. Set an appropriate minimum amount threshold to filter noise. Use the graph to identify patterns and follow the money flow.</p>
        
        <h4>Following Branches</h4>
        <p>When a wallet sends funds to multiple destinations, you'll see branching in the graph. Each branch represents a different path the funds took. Follow each branch to understand where money went.</p>
        
        <h4>Identifying Exchange Destinations</h4>
        <p>TrackTheMoney automatically identifies known exchanges, DEXs, and bridges:</p>
        <ul>
          <li><strong>CEXs:</strong> Centralized exchanges like Binance, Coinbase, Kraken</li>
          <li><strong>DEXs:</strong> Decentralized exchanges like Jupiter, Raydium, Orca</li>
          <li><strong>Bridges:</strong> Cross-chain bridges like Wormhole</li>
        </ul>
        
        <h4>Advanced Investigations</h4>
        <p>Use the advanced options to:</p>
        <ul>
          <li><strong>End Wallet:</strong> Track funds to a specific destination wallet</li>
          <li><strong>Known Exchange:</strong> Target a specific exchange</li>
          <li><strong>Max Depth:</strong> Control how many hops to trace (default: 3)</li>
        </ul>
      `
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      summary: 'Efficient tracking techniques and investigation best practices',
      content: `
        <h4>Efficient Tracking</h4>
        <ul>
          <li>Start with a higher minimum amount (10-100 SOL) to reduce noise</li>
          <li>Use max depth of 2-3 for initial investigations</li>
          <li>Focus on wallets with high transfer volumes</li>
          <li>Look for patterns like multiple wallets converging to exchanges</li>
        </ul>
        
        <h4>Avoiding False Conclusions</h4>
        <ul>
          <li>Don't assume all transfers to exchanges are suspicious</li>
          <li>Consider legitimate trading activity</li>
          <li>Look at the full context, not just individual transfers</li>
          <li>Be aware of circular transactions that may return funds</li>
        </ul>
        
        <h4>Best Practices</h4>
        <ul>
          <li>Always verify findings on Solscan or other explorers</li>
          <li>Document your investigation process</li>
          <li>Use the AI summary as a guide, not definitive proof</li>
          <li>Consider the timing and sequence of transactions</li>
          <li>Be cautious about drawing conclusions from incomplete data</li>
        </ul>
      `
    },
    {
      id: 'faq',
      title: 'FAQ',
      summary: 'Frequently asked questions about TrackTheMoney',
      content: `
        <h4>What is the maximum depth I can trace?</h4>
        <p>You can trace up to 10 hops, but we recommend 2-3 for most investigations to avoid excessive data and timeouts.</p>
        
        <h4>How accurate is the exchange identification?</h4>
        <p>We maintain a database of known exchange, DEX, and bridge addresses. Identification is based on these known addresses and is generally accurate, but new addresses may not be recognized.</p>
        
        <h4>Why do some transactions show as cycles?</h4>
        <p>Cycles occur when funds return to a wallet that was already visited in the tracking path. This can indicate circular trading or return transactions.</p>
        
        <h4>Can I track multiple wallets at once?</h4>
        <p>Currently, you can only track one wallet at a time. For multiple wallets, run separate investigations.</p>
        
        <h4>What does the AI summary provide?</h4>
        <p>The AI summary analyzes the transaction patterns and provides insights about money flow, suspicious activity, and key entities involved.</p>
        
        <h4>How far back does the data go?</h4>
        <p>We fetch recent transactions from the Helius API. The exact timeframe depends on the wallet's activity level.</p>
      `
    }
  ];

  const filteredSections = sections.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          Documentation
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--muted)' }}>
          Learn how to use TrackTheMoney effectively
        </p>
        
        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-12 pr-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
            style={{ 
              backgroundColor: 'var(--surface)', 
              border: '1px solid var(--border)', 
              color: 'var(--foreground)',
              '--tw-ring-color': 'var(--accent)'
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Quick Links */}
      {!searchQuery && (
        <div className="mb-12 p-6 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  if (!expandedSections.includes(section.id)) {
                    toggleSection(section.id);
                  }
                }}
                className="text-left p-4 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <div className="font-mono text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  {section.title}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {section.summary}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-6">
        {filteredSections.map((section) => (
          <div key={section.id} id={section.id} className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-5 flex items-center justify-between transition-all hover:opacity-80"
            >
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold font-mono" style={{ color: 'var(--foreground)' }}>
                  {section.title}
                </h2>
              </div>
              {expandedSections.includes(section.id) ? (
                <ChevronUp className="w-5 h-5" style={{ color: 'var(--muted)' }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: 'var(--muted)' }} />
              )}
            </button>
            
            {expandedSections.includes(section.id) && (
              <div className="px-6 pb-6 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div 
                  className="prose prose-invert max-w-none prose-headings:font-mono prose-p:text-base prose-ul:text-base prose-li:mb-2 prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-3"
                  style={{ color: 'var(--foreground)' }}
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-16">
          <p className="font-mono text-lg" style={{ color: 'var(--muted)' }}>
            No results found for "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}

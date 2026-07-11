'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Book, Users, Settings } from 'lucide-react';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Track', href: '/track', icon: Search },
  { name: 'Docs', href: '/docs', icon: Book },
  { name: 'Contact Team', href: '/contact', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen p-6 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      <div className="mb-8">
        <h1 className="text-xl font-bold font-display uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
          MoneyTrail
        </h1>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded font-mono text-sm transition-all ${
                    isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#0B0E11' : 'var(--foreground)',
                    border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

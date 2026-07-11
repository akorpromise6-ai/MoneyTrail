'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full p-8" style={{ backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Product */}
          <div>
            <h3 className="font-display font-semibold mb-4 uppercase tracking-wider text-xs" style={{ color: 'var(--foreground)' }}>Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  Track
                </Link>
              </li>
            </ul>
          </div>

          {/* Docs */}
          <div>
            <h3 className="font-display font-semibold mb-4 uppercase tracking-wider text-xs" style={{ color: 'var(--foreground)' }}>Docs</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs#faq" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-semibold mb-4 uppercase tracking-wider text-xs" style={{ color: 'var(--foreground)' }}>Contact</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  Contact Team
                </Link>
              </li>
              <li>
                <a href="mailto:contact@trackthemoney.com" className="text-sm font-mono opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
                  Email
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-6">
            <a href="mailto:contact@trackthemoney.com" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
              <Mail className="w-5 h-5" />
            </a>
          </div>

          <div className="flex gap-6 text-sm font-mono">
            <Link href="/privacy" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
              Privacy
            </Link>
            <Link href="/terms" className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--foreground)' }}>
              Terms
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center text-sm font-mono opacity-60" style={{ color: 'var(--foreground)' }}>
          © 2024 MoneyTrail. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

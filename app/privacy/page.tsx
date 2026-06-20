'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl sm:text-4xl font-bold font-mono mb-4' style={{ color: 'var(--foreground)' }}>
          Privacy Policy
        </h1>
        <p className='text-base sm:text-lg' style={{ color: 'var(--muted)' }}>
          Last updated: June 2026
        </p>
      </div>

      <div className='p-6 rounded' style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className='space-y-6'>
          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Overview
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              TrackTheMoney is a student academic project designed for educational purposes. This privacy policy explains how we handle data.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Data Collection
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              We do not collect or store any personal user data. All wallet addresses and transaction data are processed client-side or through public blockchain APIs. No user information is retained on our servers.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Data Sharing
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              We do not sell, trade, or share any user data with third parties. This is an educational project with no commercial data practices.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Third-Party Services
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              This application uses third-party APIs (Helius, Anthropic) to fetch blockchain data and generate AI summaries. These services have their own privacy policies which you should review.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Contact
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              If you have questions about this privacy policy, please contact us at contact@trackthemoney.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

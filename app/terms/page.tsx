'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl sm:text-4xl font-bold font-mono mb-4' style={{ color: 'var(--foreground)' }}>
          Terms of Service
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
              TrackTheMoney is a student academic project designed for educational purposes. By using this application, you agree to these terms of service.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Educational Purpose
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              This tool is provided for educational and research purposes only. It should not be used for making financial decisions, investment advice, or any commercial purposes.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Data Accuracy
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              While we strive to provide accurate blockchain data, we make no warranties about the completeness, reliability, or accuracy of this information. Blockchain data is sourced from public APIs and may contain errors or delays.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Limitation of Liability
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              In no event shall we be liable for any damages arising from the use or inability to use this application. This is a student project provided "as is" without any warranties.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              User Responsibility
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              Users are responsible for ensuring they have the right to analyze any blockchain addresses they query. This tool should not be used for harassment, stalking, or any illegal activities.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Changes to Terms
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              We reserve the right to modify these terms at any time. Continued use of the application after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold font-mono mb-3' style={{ color: 'var(--foreground)' }}>
              Contact
            </h2>
            <p className='text-sm font-mono' style={{ color: 'var(--foreground)' }}>
              If you have questions about these terms, please contact us at contact@trackthemoney.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

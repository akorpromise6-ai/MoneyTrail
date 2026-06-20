'use client';

import React from 'react';
import { Twitter, Send, Github, Globe, Mail, MessageSquare } from 'lucide-react';

const teamMembers = [
  {
    name: '0xakor',
    x: 'https://x.com/0xakor?s=21',
    telegram: 'https://t.me/OxVincero',
    github: 'https://github.com/akorpromise6-ai',
    website: undefined,
    email: 'akorpromise6@gmail.com',
    discord: 'https://discord.gg/oxakor',
  },
  {
    name: 'AmbassadorHQ',
    x: 'https://x.com/ambassadorhq_?s=11',
    telegram: 'https://t.me/AmbassadorHQ',
    github: undefined,
    website: undefined,
    email: 'contact@trackthemoney.com',
    discord: undefined,
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          Contact Team
        </h1>
        <p className="text-base sm:text-lg" style={{ color: 'var(--muted)' }}>
          Connect with the TrackTheMoney team through various platforms.
        </p>
      </div>

      {/* Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {teamMembers.map((member, index) => (
          <div key={index} className="p-6 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-xl font-bold font-mono mb-6" style={{ color: 'var(--foreground)' }}>
              {member.name}
            </h2>
            
            <div className="space-y-3">
              <a
                href={member.x}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <Twitter className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  X (Twitter)
                </span>
              </a>
              
              <a
                href={member.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <Send className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Telegram
                </span>
              </a>
              
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <Github className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  GitHub
                </span>
              </a>
              
              {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <Globe className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Website
                </span>
              </a>
              )}
              
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <Mail className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Email
                </span>
              </a>
              
              <a
                href={member.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <MessageSquare className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                <span className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                  Discord
                </span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* General Contact Info */}
      <div className="p-6 rounded mb-8" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          General Inquiries
        </h2>
        <p className="text-sm font-mono mb-4" style={{ color: 'var(--muted)' }}>
          For general questions, support, or partnership inquiries, please reach out via email or join our Discord community.
        </p>
        <a
          href="mailto:contact@trackthemoney.com"
          className="inline-flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90"
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: '#0B0E11',
            borderRadius: '4px'
          }}
        >
          <Mail className="w-4 h-4" />
          Contact Us
        </a>
      </div>

      {/* Report Issue */}
      <div className="p-6 rounded" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold font-mono mb-4" style={{ color: 'var(--foreground)' }}>
          Report a Bug or Issue
        </h2>
        <p className="text-sm font-mono mb-6" style={{ color: 'var(--muted)' }}>
          Found a bug or facing an issue? Let us know so we can fix it.
        </p>
        <a
          href="mailto:akorpromise6@gmail.com?subject=TrackTheMoney%20Bug%20Report&body=Please%20describe%20the%20bug%20or%20issue%20you%20are%20facing:%0A%0A%0A%0ASteps%20to%20reproduce:%0A%0A%0A%0AExpected%20behavior:%0A%0A%0A%0AActual%20behavior:%0A%0A%0A%0AAdditional%20information:"
          className="inline-flex items-center gap-2 px-4 py-2 rounded font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90"
          style={{ 
            backgroundColor: 'var(--accent)', 
            color: '#0B0E11',
            borderRadius: '4px'
          }}
        >
          <Mail className="w-4 h-4" />
          Report Issue
        </a>
      </div>
    </div>
  );
}

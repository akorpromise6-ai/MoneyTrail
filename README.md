# TrackTheMoney

A Solana transaction tracking web application that visualizes money flow between wallets.

## Features

- **Wallet Tracking**: Enter a Solana wallet address and track all outgoing transfers above a specified threshold
- **Recursive Tracking**: Follows the money trail recursively until funds stop moving
- **Graph Visualization**: Interactive graph showing transaction flow using React Flow
- **AI Summary**: Plain English summary of money flow patterns using Anthropic Claude
- **Database Storage**: PostgreSQL (Neon) for persistent transaction storage

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Database**: PostgreSQL (Neon)
- **Solana Data**: Helius API
- **Visualization**: React Flow
- **AI**: OpenAI GPT-4o-mini

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `HELIUS_API_KEY`: Your Helius API key
- `ANTHROPIC_API_KEY`: Your Anthropic API key

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Keys

### Helius API
1. Go to [helius.dev](https://helius.dev)
2. Sign up and create a free account
3. Get your API key from the dashboard

### Neon PostgreSQL
1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a free project
3. Copy the connection string

### OpenAI API
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up and create an API key
3. Add it to your environment variables

## Usage

1. Enter a Solana wallet address
2. Set the minimum SOL amount threshold
3. Click "Track Money Flow"
4. View the interactive graph and AI summary

## Project Structure

```
├── app/
│   ├── api/track/route.ts    # API endpoint for tracking
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/
│   └── MoneyFlowGraph.tsx    # React Flow graph component
├── lib/
│   ├── db.ts                 # Database utilities
│   ├── helius.ts             # Helius API integration
│   └── anthropic.ts          # Anthropic Claude integration
└── public/                   # Static assets
```

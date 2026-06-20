// Known exchange wallet addresses for forensic tracking
// These are well-known hot/cold wallet addresses for major exchanges
// Note: This is a simplified list - in production you'd want a more comprehensive database

// PUBLICLY KNOWN ADDRESSES - sourced from publicly available blockchain explorers and official documentation as of June 2026
// These addresses are public information and may need periodic updates since exchanges sometimes rotate hot wallets
// Sources: Solscan, Orb Markets, official project documentation

export interface ExchangeWallet {
  address: string;
  exchange: string;
  type: 'hot' | 'cold';
}

export const EXCHANGE_WALLETS: ExchangeWallet[] = [
  // Binance Hot Wallets (Source: Orb Markets, Solscan)
  { address: '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', exchange: 'Binance', type: 'hot' },
  { address: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', exchange: 'Binance', type: 'hot' },
  
  // Coinbase Hot Wallet (Source: Solscan)
  { address: 'GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE', exchange: 'Coinbase', type: 'hot' },
  
  // Kraken Cold Wallet (Source: Orb Markets)
  { address: '9cNE6KBg2Xmf34FPMMvzDF8yUHMrgLRzBV3vD7b1JnUS', exchange: 'Kraken', type: 'cold' },
];

export interface DexWallet {
  address: string;
  dex: string;
}

export const DEX_WALLETS: DexWallet[] = [
  // Jupiter v6 Swap Aggregator (Source: Jupiter docs, Bitquery)
  { address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', dex: 'Jupiter' },
  
  // Raydium AMM v4 (Source: Raydium docs, GitHub)
  { address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', dex: 'Raydium' },
  
  // Orca Whirlpools (Source: Orca docs, GitHub)
  { address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', dex: 'Orca' },
];

export interface BridgeWallet {
  address: string;
  bridge: string;
}

export const BRIDGE_WALLETS: BridgeWallet[] = [
  // Wormhole Core Bridge (Source: Wormhole docs, GitHub)
  { address: 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth', bridge: 'Wormhole' },
];

export function getExchangeForAddress(address: string): string | null {
  const wallet = EXCHANGE_WALLETS.find(w => w.address === address);
  return wallet ? wallet.exchange : null;
}

export function isExchangeWallet(address: string, targetExchange?: string): boolean {
  const wallet = EXCHANGE_WALLETS.find(w => w.address === address);
  if (!wallet) return false;
  if (targetExchange) {
    return wallet.exchange.toLowerCase() === targetExchange.toLowerCase();
  }
  return true;
}

export function getDexForAddress(address: string): string | null {
  const wallet = DEX_WALLETS.find(w => w.address === address);
  return wallet ? wallet.dex : null;
}

export function isDexWallet(address: string, targetDex?: string): boolean {
  const wallet = DEX_WALLETS.find(w => w.address === address);
  if (!wallet) return false;
  if (targetDex) {
    return wallet.dex.toLowerCase() === targetDex.toLowerCase();
  }
  return true;
}

export function getBridgeForAddress(address: string): string | null {
  const wallet = BRIDGE_WALLETS.find(w => w.address === address);
  return wallet ? wallet.bridge : null;
}

export function isBridgeWallet(address: string, targetBridge?: string): boolean {
  const wallet = BRIDGE_WALLETS.find(w => w.address === address);
  if (!wallet) return false;
  if (targetBridge) {
    return wallet.bridge.toLowerCase() === targetBridge.toLowerCase();
  }
  return true;
}

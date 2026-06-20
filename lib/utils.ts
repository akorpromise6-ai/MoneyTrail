import { Transfer } from './helius';

export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export interface TransferStats {
  totalVolume: string;
  uniqueAddresses: number;
  exchangeTransfers: number;
  dexTransfers: number;
  bridgeTransfers: number;
  cycleTransfers: number;
  mergePointTransfers: number;
  exchanges: string[];
  dexs: string[];
  bridges: string[];
}

export function calculateTransferStats(transfers: Transfer[]): TransferStats {
  const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2);
  const uniqueAddresses = new Set([...transfers.map(t => t.from), ...transfers.map(t => t.to)]).size;
  const exchangeTransfers = transfers.filter(t => t.isExchange).length;
  const dexTransfers = transfers.filter(t => t.isDex).length;
  const bridgeTransfers = transfers.filter(t => t.isBridge).length;
  const cycleTransfers = transfers.filter(t => t.isCycle).length;
  const mergePointTransfers = transfers.filter(t => t.mergePoint).length;
  
  // Extract unique entity names, filtering out undefined
  const exchanges = [...new Set(transfers.filter(t => t.exchangeName).map(t => t.exchangeName).filter((name): name is string => !!name))];
  const dexs = [...new Set(transfers.filter(t => t.dexName).map(t => t.dexName).filter((name): name is string => !!name))];
  const bridges = [...new Set(transfers.filter(t => t.bridgeName).map(t => t.bridgeName).filter((name): name is string => !!name))];

  return {
    totalVolume,
    uniqueAddresses,
    exchangeTransfers,
    dexTransfers,
    bridgeTransfers,
    cycleTransfers,
    mergePointTransfers,
    exchanges,
    dexs,
    bridges,
  };
}

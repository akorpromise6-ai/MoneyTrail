import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { Transfer } from './helius';
import { calculateTransferStats } from './utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

// Initialize Groq client lazily to avoid errors if API key is missing
let groq: Groq | null = null;
function getGroqClient(): Groq {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

async function generateSummaryWithAnthropic(transfers: Transfer[]): Promise<string> {
  if (transfers.length === 0) {
    return 'No transactions found to summarize.';
  }

  // Limit to top 15 transfers to balance detail and payload size
  const limitedTransfers = transfers.slice(0, 15);

  // Calculate comprehensive statistics using shared utility
  const stats = calculateTransferStats(limitedTransfers);

  // Build transfer summary data
  const transferSummary = limitedTransfers.map(t => ({
    from: t.from.slice(0, 8),
    to: t.to.slice(0, 8),
    amount: t.amount.toFixed(2),
    isExchange: t.isExchange,
    exchangeName: t.exchangeName,
    isDex: t.isDex,
    dexName: t.dexName,
    isBridge: t.isBridge,
    bridgeName: t.bridgeName,
    isCycle: t.isCycle,
    branchCount: t.branchCount,
    mergePoint: t.mergePoint,
  }));

  console.log('=== Calling Anthropic API via SDK ===');
  console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
  console.log('Transfers to analyze:', limitedTransfers.length);

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    system: 'You are a forensic financial analyst specializing in cryptocurrency transaction analysis. Provide clear, actionable insights about money flow patterns.',
    messages: [
      {
        role: 'user',
        content: `Analyze this Solana money flow data:

OVERVIEW:
- Total transfers: ${limitedTransfers.length}
- Total volume: ${stats.totalVolume} SOL
- Unique addresses: ${stats.uniqueAddresses}
- Exchange transfers: ${stats.exchangeTransfers} (${stats.exchanges.join(', ') || 'none'})
- DEX transfers: ${stats.dexTransfers} (${stats.dexs.join(', ') || 'none'})
- Bridge transfers: ${stats.bridgeTransfers} (${stats.bridges.join(', ') || 'none'})
- Cycle transfers: ${stats.cycleTransfers}
- Merge point transfers: ${stats.mergePointTransfers}

TRANSFER DETAILS:
${JSON.stringify(transferSummary, null, 2)}

Provide a concise 2-3 sentence analysis highlighting:
1. Main money flow pattern and key entities involved
2. Any suspicious patterns (cycles, merges, rapid movements)
3. Overall assessment of the transaction chain`,
      },
    ],
  });

  console.log('Response received successfully');

  if (response.content && response.content[0] && response.content[0].type === 'text') {
    console.log('Generated summary successfully');
    return response.content[0].text;
  }

  throw new Error('Unable to generate summary - unexpected response structure');
}

async function generateSummaryWithGroq(transfers: Transfer[]): Promise<string> {
  if (transfers.length === 0) {
    return 'No transactions found to summarize.';
  }

  // Limit to top 15 transfers to balance detail and payload size
  const limitedTransfers = transfers.slice(0, 15);

  // Calculate comprehensive statistics using shared utility
  const stats = calculateTransferStats(limitedTransfers);

  // Build transfer summary data
  const transferSummary = limitedTransfers.map(t => ({
    from: t.from.slice(0, 8),
    to: t.to.slice(0, 8),
    amount: t.amount.toFixed(2),
    isExchange: t.isExchange,
    exchangeName: t.exchangeName,
    isDex: t.isDex,
    dexName: t.dexName,
    isBridge: t.isBridge,
    bridgeName: t.bridgeName,
    isCycle: t.isCycle,
    branchCount: t.branchCount,
    mergePoint: t.mergePoint,
  }));

  console.log('=== Calling Groq API via SDK ===');
  console.log('API Key present:', !!process.env.GROQ_API_KEY);
  console.log('Transfers to analyze:', limitedTransfers.length);

  const groqClient = getGroqClient();
  const response = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content: 'You are a forensic financial analyst specializing in cryptocurrency transaction analysis. Provide clear, actionable insights about money flow patterns.',
      },
      {
        role: 'user',
        content: `Analyze this Solana money flow data:

OVERVIEW:
- Total transfers: ${limitedTransfers.length}
- Total volume: ${stats.totalVolume} SOL
- Unique addresses: ${stats.uniqueAddresses}
- Exchange transfers: ${stats.exchangeTransfers} (${stats.exchanges.join(', ') || 'none'})
- DEX transfers: ${stats.dexTransfers} (${stats.dexs.join(', ') || 'none'})
- Bridge transfers: ${stats.bridgeTransfers} (${stats.bridges.join(', ') || 'none'})
- Cycle transfers: ${stats.cycleTransfers}
- Merge point transfers: ${stats.mergePointTransfers}

TRANSFER DETAILS:
${JSON.stringify(transferSummary, null, 2)}

Provide a concise 2-3 sentence analysis highlighting:
1. Main money flow pattern and key entities involved
2. Any suspicious patterns (cycles, merges, rapid movements)
3. Overall assessment of the transaction chain`,
      },
    ],
  });

  console.log('Response received successfully');

  if (response.choices && response.choices[0] && response.choices[0].message) {
    console.log('Generated summary successfully');
    return response.choices[0].message.content || 'Unable to generate summary - empty response';
  }

  throw new Error('Unable to generate summary - unexpected response structure');
}

export async function generateMoneyFlowSummary(transfers: Transfer[]): Promise<string> {
  if (transfers.length === 0) {
    return 'No transactions found to summarize.';
  }

  // Try Anthropic first if API key is configured
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const summary = await generateSummaryWithAnthropic(transfers);
      console.log('Summary generated using: Anthropic');
      return summary;
    } catch (error) {
      console.error('=== ERROR generating AI summary with Anthropic ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.log('Falling back to Groq...');
    }
  }

  // Try Groq as fallback
  if (process.env.GROQ_API_KEY) {
    try {
      const summary = await generateSummaryWithGroq(transfers);
      console.log('Summary generated using: Groq (Anthropic unavailable)');
      return summary;
    } catch (error) {
      console.error('=== ERROR generating AI summary with Groq ===');
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
    }
  }

  // Both providers failed or not configured
  console.log('Summary generated using: None (both providers unavailable)');
  return 'AI summary unavailable — no AI provider configured with available credits';
}

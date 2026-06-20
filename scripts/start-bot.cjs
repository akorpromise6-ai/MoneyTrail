const { Telegraf } = require('telegraf');
require('dotenv').config({ path: '.env.local' });

// Initialize bot with token from environment variable
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not configured in environment variables');
}

const bot = new Telegraf(token);

// Import trackMoneyFlow - need to use the compiled JS or require the TS file with ts-node
// For simplicity, let's use axios directly instead of importing the TS module
const axios = require('axios');

const HELIUS_API_URL = process.env.HELIUS_API_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// PLACEHOLDER ENTITY LOOKUP TABLES - replace with real wallet addresses before production use
// Entity lookup tables
const EXCHANGE_WALLETS = {
  'Binance': ['Binance hot wallet addresses here'],
  'Bybit': ['Bybit hot wallet addresses here'],
  'OKX': ['OKX hot wallet addresses here'],
  'Coinbase': ['Coinbase hot wallet addresses here'],
  'Kraken': ['Kraken hot wallet addresses here'],
  'MEXC': ['MEXC hot wallet addresses here'],
};

const DEX_WALLETS = {
  'Jupiter': ['Jupiter program addresses here'],
  'Raydium': ['Raydium program addresses here'],
  'Orca': ['Orca program addresses here'],
};

const BRIDGE_WALLETS = {
  'Wormhole': ['Wormhole program addresses here'],
  'LayerZero': ['LayerZero program addresses here'],
};

// Store for flow continuation
const flowStore = new Map();

// Helper function to format address
function formatAddress(address, startChars = 8, endChars = 8) {
  if (!address || address.length < startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

// Helper function to get entity name from address
function getEntityName(address) {
  for (const [exchange, addresses] of Object.entries(EXCHANGE_WALLETS)) {
    if (addresses.includes(address)) return exchange;
  }
  for (const [dex, addresses] of Object.entries(DEX_WALLETS)) {
    if (addresses.includes(address)) return dex;
  }
  for (const [bridge, addresses] of Object.entries(BRIDGE_WALLETS)) {
    if (addresses.includes(address)) return bridge;
  }
  return null;
}

// Helper function to format address with entity name
function formatAddressWithEntity(address) {
  const entity = getEntityName(address);
  if (entity) return entity;
  return formatAddress(address);
}

// Helper function to analyze branches
function analyzeBranches(transfers, startAddress) {
  const branches = [];
  const walletOutflows = new Map();
  
  // Count outflows per wallet
  transfers.forEach(t => {
    if (!walletOutflows.has(t.from)) {
      walletOutflows.set(t.from, []);
    }
    walletOutflows.get(t.from).push(t);
  });
  
  // Find branching points (wallets with multiple outflows)
  const branchingWallets = [];
  walletOutflows.forEach((outflows, wallet) => {
    if (outflows.length > 1) {
      branchingWallets.push({ wallet, outflows });
    }
  });
  
  // Build branch information
  if (branchingWallets.length > 0) {
    branchingWallets.forEach(({ wallet, outflows }) => {
      const branchTotal = outflows.reduce((sum, t) => sum + t.amount, 0);
      branches.push({
        from: wallet,
        destinations: outflows.map(t => ({
          to: t.to,
          amount: t.amount,
          entity: getEntityName(t.to)
        })),
        total: branchTotal
      });
    });
  }
  
  return branches;
}

// Helper function to find final destinations
function findFinalDestinations(transfers) {
  const allAddresses = new Set();
  const fromAddresses = new Set();
  
  transfers.forEach(t => {
    allAddresses.add(t.to);
    fromAddresses.add(t.from);
  });
  
  // Final destinations are addresses that never appear as "from"
  const finalDestinations = [];
  allAddresses.forEach(addr => {
    if (!fromAddresses.has(addr)) {
      finalDestinations.push(addr);
    }
  });
  
  return finalDestinations;
}

// Helper function to calculate confidence level
function calculateConfidence(transfers, depthReached, depthRequested) {
  let confidence = 100;
  
  // Reduce confidence if depth was limited
  if (depthReached < depthRequested) {
    confidence -= 20;
  }
  
  // Reduce confidence if very few transfers
  if (transfers.length < 3) {
    confidence -= 15;
  }
  
  // Increase confidence if transfers are consistent
  if (transfers.length >= 5) {
    confidence += 5;
  }
  
  return Math.min(100, Math.max(0, confidence));
}

// Helper function to assess risk
function assessRisk(transfers, branches, finalDestinations) {
  const riskFactors = [];
  
  // Check for circular transactions
  const addressSet = new Set();
  let hasCycles = false;
  transfers.forEach(t => {
    if (addressSet.has(t.to)) hasCycles = true;
    addressSet.add(t.to);
  });
  
  if (hasCycles) {
    riskFactors.push('Circular transactions detected');
  }
  
  // Check for rapid splitting (many branches)
  if (branches.length > 3) {
    riskFactors.push('High branching activity');
  }
  
  // Check for exchange destinations
  const exchangeDestinations = finalDestinations.filter(addr => getEntityName(addr));
  if (exchangeDestinations.length > 0) {
    riskFactors.push('Funds reached exchanges');
  }
  
  return riskFactors;
}

// Helper function to generate narrative using Anthropic
async function generateNarrative(transfers, startAddress, depthRequested, depthReached, branches, finalDestinations, totalVolume) {
  if (!ANTHROPIC_API_KEY) {
    return 'AI analysis not available (ANTHROPIC_API_KEY not configured)';
  }
  
  try {
    const transferSummary = transfers.map(t => ({
      from: formatAddressWithEntity(t.from),
      to: formatAddressWithEntity(t.to),
      amount: t.amount.toFixed(2)
    })).slice(0, 20); // Limit to 20 transfers for token limits
    
    const branchSummary = branches.map(b => ({
      from: formatAddressWithEntity(b.from),
      destinations: b.destinations.map(d => ({
        to: formatAddressWithEntity(d.to),
        amount: d.amount.toFixed(2)
      }))
    }));
    
    const finalDestSummary = finalDestinations.map(addr => formatAddressWithEntity(addr));
    
    const prompt = `You are a blockchain investigator analyzing money flow. Provide a clear, concise narrative (2-3 sentences) explaining:

Source wallet: ${formatAddressWithEntity(startAddress)}
Total amount traced: ${totalVolume.toFixed(2)} SOL
Total transfers: ${transfers.length}
Depth requested: ${depthRequested}
Depth reached: ${depthReached}
Branches: ${branches.length}
Final destinations: ${finalDestSummary.join(', ')}

Transfers: ${JSON.stringify(transferSummary)}
Branches: ${JSON.stringify(branchSummary)}

Explain where the money went and how it got there. Focus on the flow pattern, any splitting/branching, and final destinations. Be factual and concise.`;
    
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return response.data.content[0].text;
  } catch (error) {
    console.error('Error generating narrative:', error.message);
    return 'Unable to generate AI narrative at this time.';
  }
}

async function getTransfers(address, minAmount) {
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${HELIUS_API_URL}?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          address,
          {
            limit: 100,
          },
        ],
      },
      {
        timeout: 30000,
      }
    );

    const signatures = response.data.result;
    const transfers = [];
    
    if (!Array.isArray(signatures)) {
      console.error('Helius API returned non-array result:', signatures);
      return [];
    }

    for (let i = 0; i < signatures.length; i++) {
      const sig = signatures[i];
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced from 300ms for faster bot responses
        
        const txResponse = await axios.post(
          `${HELIUS_API_URL}?api-key=${HELIUS_API_KEY}`,
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [
              sig.signature,
              {
                encoding: 'jsonParsed',
                commitment: 'confirmed',
              },
            ],
          },
          {
            timeout: 30000,
          }
        );

        const tx = txResponse.data.result;
        if (!tx || !tx.meta || !tx.transaction) continue;

        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        for (let i = 0; i < accountKeys.length; i++) {
          const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;
          
          if (balanceChange < -minAmount) {
            const fromAddress = accountKeys[i];
            const fromAddressString = typeof fromAddress === 'string' ? fromAddress : fromAddress.pubkey;
            
            for (let j = 0; j < accountKeys.length; j++) {
              if (i !== j) {
                const recipientChange = (postBalances[j] - preBalances[j]) / 1e9;
                if (recipientChange > 0) {
                  const toAddress = accountKeys[j];
                  const toAddressString = typeof toAddress === 'string' ? toAddress : toAddress.pubkey;
                  
                  transfers.push({
                    signature: sig.signature,
                    from: fromAddressString,
                    to: toAddressString,
                    amount: Math.abs(balanceChange),
                    timestamp: new Date(tx.blockTime * 1000).toISOString(),
                    slot: tx.slot,
                  });
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch transaction ${sig.signature.slice(0, 8)}... - skipping: ${error.message || error.code || error}`);
        continue;
      }
    }

    return transfers;
  } catch (error) {
    console.error('Error fetching transfers:', error);
    throw error;
  }
}

async function trackMoneyFlow(startAddress, minAmount, options = {}) {
  const { maxDepth = 1, startFromDepth = 0 } = options;
  
  const allTransfers = [];
  const visited = new Set();
  const queue = [{ address: startAddress, depth: 0 }];
  let walletCount = 0;
  const maxNodes = 20; // Reduced from 50 for faster bot responses
  let maxDepthReached = 0;

  visited.add(startAddress);

  while (queue.length > 0 && walletCount < maxNodes) {
    const { address, depth } = queue.shift();
    walletCount++;

    if (depth > maxDepthReached) {
      maxDepthReached = depth;
    }

    if (depth >= maxDepth) {
      continue;
    }

    try {
      const transfers = await getTransfers(address, minAmount);
      
      for (const transfer of transfers) {
        if (!allTransfers.find(t => t.signature === transfer.signature)) {
          allTransfers.push(transfer);
          
          if (!visited.has(transfer.to)) {
            visited.add(transfer.to);
            queue.push({ address: transfer.to, depth: depth + 1 });
          }
        }
      }
      
    } catch (error) {
      console.error(`Error tracking from ${address}:`, error);
    }
  }

  
  return {
    transfers: allTransfers,
    reachedTarget: false,
    depthReached: maxDepthReached,
    stillMoving: queue.length > 0
  };
}

function startBot() {
  console.log('Starting Telegram bot...');
  
  bot.startPolling();
  
  bot.command('trace', async (ctx) => {
    const args = ctx.message.text.replace('/trace', '').trim().split(' ');
    const walletAddress = args[0];
    const minAmount = args[1] ? parseFloat(args[1]) : 10;
    const maxDepth = args[2] ? parseInt(args[2]) : 5;
    const chatId = ctx.chat.id;
    
    console.log(`Received /trace command from user ${chatId} for wallet: ${walletAddress}, minAmount: ${minAmount}, depth: ${maxDepth}`);
    
    if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
      ctx.reply('❌ Invalid wallet address. Please provide a valid Solana wallet address (32-44 characters).');
      return;
    }
    
    if (isNaN(minAmount) || minAmount < 0) {
      ctx.reply('❌ Invalid minimum amount. Please provide a valid SOL amount.\n\nExample: /trace <wallet> 10 5');
      return;
    }
    
    if (isNaN(maxDepth) || maxDepth < 1 || maxDepth > 100) {
      ctx.reply('❌ Invalid depth. Please provide a depth between 1 and 100.\n\nExample: /trace <wallet> 10 5');
      return;
    }
    
    ctx.reply(`🔍 Tracing money flow...\n\nWallet: ${walletAddress.slice(0, 8)}...\nMin amount: ${minAmount} SOL\nDepth: ${maxDepth}\n\nThis may take a moment.`);
    
    try {
      const result = await trackMoneyFlow(walletAddress, minAmount, {
        maxDepth: maxDepth,
      });
      
      const transfers = result.transfers;
      const depthReached = result.depthReached;
      const stillMoving = result.stillMoving;
      const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0);
      
      const uniqueWallets = new Set();
      transfers.forEach(t => {
        uniqueWallets.add(t.from);
        uniqueWallets.add(t.to);
      });
      
      // Analyze branches
      const branches = analyzeBranches(transfers, walletAddress);
      
      // Find final destinations
      const finalDestinations = findFinalDestinations(transfers);
      
      // Calculate confidence
      const confidence = calculateConfidence(transfers, depthReached, maxDepth);
      
      // Assess risk
      const riskFactors = assessRisk(transfers, branches, finalDestinations);
      
      // Generate AI narrative
      const narrative = await generateNarrative(transfers, walletAddress, maxDepth, depthReached, branches, finalDestinations, totalVolume);
      
      // Store flow for continuation
      const flowId = `FLOW-${Date.now()}`;
      flowStore.set(flowId, {
        walletAddress,
        minAmount,
        maxDepth,
        depthReached,
        transfers,
        branches,
        finalDestinations
      });
      
      // Build investigator-style message
      let message = `📊 *Money Flow Analysis*\n\n`;
      message += `💰 Total amount traced:\n${totalVolume.toFixed(2)} SOL\n\n`;
      message += `🔍 Source wallet:\n${formatAddress(walletAddress)}\n\n`;
      message += `� Total transfers:\n${transfers.length}\n\n`;
      message += `� Unique wallets:\n${uniqueWallets.size}\n\n`;
      message += `🔎 Depth requested:\n${maxDepth}\n\n`;
      message += `🔎 Depth reached:\n${depthReached}\n\n`;
      
      if (branches.length > 0) {
        message += `🌳 Branches:\n${branches.length}\n\n`;
      }
      
      if (finalDestinations.length > 0) {
        message += `🏁 Final destinations:\n\n`;
        finalDestinations.slice(0, 5).forEach(dest => {
          message += `• ${formatAddress(dest)}\n`;
        });
        if (finalDestinations.length > 5) {
          message += `• ...and ${finalDestinations.length - 5} more\n`;
        }
        message += `\n`;
      }
      
      if (stillMoving) {
        message += `⏸ Current status:\n\nFunds appear to still be moving.\n\n`;
        message += `🚨 *Funds are still moving.*\n\n`;
        message += `Current depth: ${depthReached}\n\n`;
        message += `Suggested action:\nIncrease depth to continue tracing.\n\n`;
        message += `Use: /depth ${flowId} ${maxDepth + 5}\n\n`;
      } else {
        message += `⏸ Current status:\n\nFunds appear to have stopped moving.\n\n`;
      }
      
      message += `🎯 Confidence:\n${confidence}%\n\n`;
      
      if (riskFactors.length > 0) {
        message += `⚠ Risk assessment:\n\n`;
        riskFactors.forEach(factor => {
          message += `• ${factor}\n`;
        });
        message += `\n`;
      } else {
        message += `⚠ Risk assessment:\n\nNo suspicious patterns detected.\n\n`;
      }
      
      message += `━━━━━━━━━━━━━━━━\n\n`;
      message += `� *INVESTIGATOR SUMMARY*\n\n`;
      message += `${narrative}\n\n`;
      
      if (branches.length > 0) {
        message += `━━━━━━━━━━━━━━━━\n\n`;
        message += `🌳 *BRANCH ANALYSIS*\n\n`;
        branches.forEach((branch, index) => {
          message += `Branch ${index + 1}\n`;
          message += `${branch.total.toFixed(2)} SOL\n`;
          message += `${formatAddress(branch.from)}\n`;
          message += `↓\n`;
          branch.destinations.forEach(dest => {
            message += `${formatAddress(dest.to)} (${dest.amount.toFixed(2)} SOL)\n`;
          });
          message += `\n`;
        });
      }
      
      message += `🔗 View full graph: http://localhost:3001/?wallet=${walletAddress}&minAmount=${minAmount}`;
      
      ctx.replyWithMarkdown(message);
      
    } catch (error) {
      console.error('Error tracking money flow:', error);
      const errorMessage = error.message || 'Unknown error';
      ctx.reply(`❌ Failed to track money flow: ${errorMessage}\n\nTry with a lower depth or minimum amount.`);
    }
  });
  
  bot.command('depth', async (ctx) => {
    const args = ctx.message.text.replace('/depth', '').trim().split(' ');
    const flowId = args[0];
    const newDepth = args[1] ? parseInt(args[1]) : null;
    const chatId = ctx.chat.id;
    
    console.log(`Received /depth command from user ${chatId} for flow: ${flowId}, new depth: ${newDepth}`);
    
    if (!flowId || !flowId.startsWith('FLOW-')) {
      ctx.reply('❌ Invalid flow ID. Please provide a valid flow ID from a previous trace.\n\nExample: /depth FLOW-1234567890 10');
      return;
    }
    
    if (!newDepth || isNaN(newDepth) || newDepth < 1 || newDepth > 100) {
      ctx.reply('❌ Invalid depth. Please provide a depth between 1 and 100.\n\nExample: /depth FLOW-1234567890 10');
      return;
    }
    
    const flow = flowStore.get(flowId);
    if (!flow) {
      ctx.reply('❌ Flow not found. The flow may have expired. Please start a new trace with /trace.');
      return;
    }
    
    if (newDepth <= flow.depthReached) {
      ctx.reply(`❌ New depth must be greater than current depth (${flow.depthReached}).\n\nExample: /depth ${flowId} ${flow.depthReached + 5}`);
      return;
    }
    
    ctx.reply(`🔍 Continuing trace from depth ${flow.depthReached} to ${newDepth}...\n\nThis may take a moment.`);
    
    try {
      const result = await trackMoneyFlow(flow.walletAddress, flow.minAmount, {
        maxDepth: newDepth,
        startFromDepth: flow.depthReached,
      });
      
      const transfers = result.transfers;
      const depthReached = result.depthReached;
      const stillMoving = result.stillMoving;
      const totalVolume = transfers.reduce((sum, t) => sum + t.amount, 0);
      
      const uniqueWallets = new Set();
      transfers.forEach(t => {
        uniqueWallets.add(t.from);
        uniqueWallets.add(t.to);
      });
      
      // Analyze branches
      const branches = analyzeBranches(transfers, flow.walletAddress);
      
      // Find final destinations
      const finalDestinations = findFinalDestinations(transfers);
      
      // Calculate confidence
      const confidence = calculateConfidence(transfers, depthReached, newDepth);
      
      // Assess risk
      const riskFactors = assessRisk(transfers, branches, finalDestinations);
      
      // Generate AI narrative
      const narrative = await generateNarrative(transfers, flow.walletAddress, newDepth, depthReached, branches, finalDestinations, totalVolume);
      
      // Update flow store
      flowStore.set(flowId, {
        ...flow,
        maxDepth: newDepth,
        depthReached,
        transfers,
        branches,
        finalDestinations
      });
      
      // Build investigator-style message
      let message = `📊 *Money Flow Analysis (Continued)*\n\n`;
      message += `💰 Total amount traced:\n${totalVolume.toFixed(2)} SOL\n\n`;
      message += `🔍 Source wallet:\n${formatAddress(flow.walletAddress)}\n\n`;
      message += `📈 Total transfers:\n${transfers.length}\n\n`;
      message += `👛 Unique wallets:\n${uniqueWallets.size}\n\n`;
      message += `🔎 Depth requested:\n${newDepth}\n\n`;
      message += `🔎 Depth reached:\n${depthReached}\n\n`;
      
      if (branches.length > 0) {
        message += `🌳 Branches:\n${branches.length}\n\n`;
      }
      
      if (finalDestinations.length > 0) {
        message += `🏁 Final destinations:\n\n`;
        finalDestinations.slice(0, 5).forEach(dest => {
          message += `• ${formatAddress(dest)}\n`;
        });
        if (finalDestinations.length > 5) {
          message += `• ...and ${finalDestinations.length - 5} more\n`;
        }
        message += `\n`;
      }
      
      if (stillMoving) {
        message += `⏸ Current status:\n\nFunds appear to still be moving.\n\n`;
        message += `🚨 *Funds are still moving.*\n\n`;
        message += `Current depth: ${depthReached}\n\n`;
        message += `Suggested action:\nIncrease depth to continue tracing.\n\n`;
        message += `Use: /depth ${flowId} ${newDepth + 5}\n\n`;
      } else {
        message += `⏸ Current status:\n\nFunds appear to have stopped moving.\n\n`;
      }
      
      message += `🎯 Confidence:\n${confidence}%\n\n`;
      
      if (riskFactors.length > 0) {
        message += `⚠ Risk assessment:\n\n`;
        riskFactors.forEach(factor => {
          message += `• ${factor}\n`;
        });
        message += `\n`;
      } else {
        message += `⚠ Risk assessment:\n\nNo suspicious patterns detected.\n\n`;
      }
      
      message += `━━━━━━━━━━━━━━━━\n\n`;
      message += `🔬 *INVESTIGATOR SUMMARY*\n\n`;
      message += `${narrative}\n\n`;
      
      if (branches.length > 0) {
        message += `━━━━━━━━━━━━━━━━\n\n`;
        message += `🌳 *BRANCH ANALYSIS*\n\n`;
        branches.forEach((branch, index) => {
          message += `Branch ${index + 1}\n`;
          message += `${branch.total.toFixed(2)} SOL\n`;
          message += `${formatAddress(branch.from)}\n`;
          message += `↓\n`;
          branch.destinations.forEach(dest => {
            message += `${formatAddress(dest.to)} (${dest.amount.toFixed(2)} SOL)\n`;
          });
          message += `\n`;
        });
      }
      
      message += `🔗 View full graph: http://localhost:3001/?wallet=${flow.walletAddress}&minAmount=${flow.minAmount}`;
      
      ctx.replyWithMarkdown(message);
      
    } catch (error) {
      console.error('Error continuing trace:', error);
      const errorMessage = error.message || 'Unknown error';
      ctx.reply(`❌ Failed to continue trace: ${errorMessage}\n\nTry with a lower depth increase.`);
    }
  });
  
  bot.command('start', (ctx) => {
    const message = `👋 Welcome to MoneyTrail Bot!\n\n` +
      `I'm a blockchain investigator that explains where money went and how it got there.\n\n` +
      `Commands:\n` +
      `/trace <wallet> <min_amount> <depth> - Trace money flow\n` +
      `/depth <flow_id> <new_depth> - Continue existing trace\n` +
      `/help - Show this help message\n\n` +
      `Examples:\n` +
      `/trace 9WzDXwBb... 10 5 (Fast Scan)\n` +
      `/trace 9WzDXwBb... 10 20 (Deep Scan)\n` +
      `/trace 9WzDXwBb... 10 100 (Investigator Mode)\n\n` +
      `Depth Guide:\n` +
      `• Depth 1-5: Fast Scan\n` +
      `• Depth 5-20: Standard Scan\n` +
      `• Depth 20-100: Investigator Mode`;
    ctx.reply(message);
  });
  
  bot.command('help', (ctx) => {
    const message = `📖 *Help*\n\n` +
      `Commands:\n` +
      `/trace <wallet> <min_amount> <depth> - Trace money flow (depth 1-100)\n` +
      `/depth <flow_id> <new_depth> - Continue existing trace\n` +
      `/start - Show welcome message\n` +
      `/help - Show this help message\n\n` +
      `Examples:\n` +
      `/trace 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 10 5\n` +
      `/depth FLOW-1234567890 10\n\n` +
      `Depth Guide:\n` +
      `• Depth 1-5: Fast Scan (quick overview)\n` +
      `• Depth 5-20: Standard Scan (balanced)\n` +
      `• Depth 20-100: Investigator Mode (deep analysis)`;
    ctx.replyWithMarkdown(message);
  });
  
  console.log('Telegram bot is running...');
}

console.log('Starting MoneyTrail Telegram bot...');

try {
  startBot();
  
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
} catch (error) {
  console.error('Failed to start bot:', error);
  process.exit(1);
}

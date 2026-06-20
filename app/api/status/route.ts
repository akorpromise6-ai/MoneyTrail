import { NextResponse } from 'next/server';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import pool from '@/lib/db';

const HELIUS_API_URL = process.env.HELIUS_API_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function checkHelius(): Promise<{ connected: boolean; message: string }> {
  try {
    if (!HELIUS_API_KEY) {
      return { connected: false, message: 'HELIUS_API_KEY not configured' };
    }

    // Make a lightweight test call to Helius
    const response = await axios.post(
      `${HELIUS_API_URL}?api-key=${HELIUS_API_KEY}`,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: ['9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
      },
      { timeout: 10000 }
    );

    if (response.data && response.data.result !== undefined) {
      return { connected: true, message: 'Connected' };
    }

    return { connected: false, message: 'Invalid response from Helius' };
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Connection failed';
    return { connected: false, message };
  }
}

async function checkAnthropic(): Promise<{ connected: boolean; message: string }> {
  try {
    if (!ANTHROPIC_API_KEY) {
      return { connected: false, message: 'ANTHROPIC_API_KEY not configured' };
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      maxRetries: 0,
      timeout: 10000,
    });

    // Make a minimal test call
    await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1,
      messages: [
        {
          role: 'user',
          content: 'test',
        },
      ],
    });

    return { connected: true, message: 'Connected' };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    // Check for credit balance error specifically
    if (errorMessage.toLowerCase().includes('credit balance') || 
        errorMessage.toLowerCase().includes('insufficient') ||
        errorMessage.toLowerCase().includes('quota')) {
      return { connected: false, message: 'No credits available' };
    }
    
    return { connected: false, message: errorMessage };
  }
}

async function checkDatabase(): Promise<{ connected: boolean; message: string }> {
  try {
    if (!process.env.DATABASE_URL) {
      return { connected: false, message: 'DATABASE_URL not configured' };
    }

    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return { connected: true, message: 'Connected' };
    } finally {
      client.release();
    }
  } catch (error: any) {
    const message = error.message || 'Connection failed';
    return { connected: false, message };
  }
}

export async function GET() {
  // Run all checks in parallel
  const results = await Promise.allSettled([
    checkHelius(),
    checkAnthropic(),
    checkDatabase(),
  ]);

  const heliusResult = results[0].status === 'fulfilled' ? results[0].value : { connected: false, message: 'Check failed' };
  const anthropicResult = results[1].status === 'fulfilled' ? results[1].value : { connected: false, message: 'Check failed' };
  const databaseResult = results[2].status === 'fulfilled' ? results[2].value : { connected: false, message: 'Check failed' };

  return NextResponse.json({
    helius: heliusResult,
    anthropic: anthropicResult,
    database: databaseResult,
  });
}

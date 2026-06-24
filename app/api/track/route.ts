import { NextRequest } from 'next/server';
import { trackMoneyFlow, TrackingOptions, getTransactionDetails } from '@/lib/helius';
import { generateMoneyFlowSummary } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max duration (Vercel Hobby plan limit)

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let streamClosed = false;
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const closeStream = () => {
        streamClosed = true;
        controller.close();
      };

      const sendEvent = (data: any) => {
        if (streamClosed) {
          return; // Silently return if stream is already closed
        }
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Failed to enqueue SSE event:', error);
          // Stream is likely closed, use closeStream to prevent further attempts
          closeStream();
        }
      };

      try {
        console.log('=== Starting money flow tracking request ===');
        
        // Parse request body
        const { walletAddress, transactionHash, minAmount, endWalletAddress, exchangeTarget, maxDepth, direction } = await request.json();
        console.log('Request parsed:', { walletAddress, transactionHash, minAmount, endWalletAddress, exchangeTarget, maxDepth, direction });

        // Resolve transaction hash to wallet address if provided
        let startAddress = walletAddress;
        if (transactionHash && !walletAddress) {
          console.log('Resolving transaction hash to wallet address...');
          const txDetails = await getTransactionDetails(transactionHash);
          if (!txDetails) {
            sendEvent({ type: 'error', error: 'Failed to resolve transaction hash' });
            closeStream();
            return;
          }
          startAddress = txDetails.from;
          console.log(`Resolved transaction hash to wallet: ${startAddress}`);
        }

        if (!startAddress || !minAmount) {
          sendEvent({ type: 'error', error: 'Wallet address (or transaction hash) and minimum amount are required' });
          closeStream();
          return;
        }

        // Track money flow with progress callbacks
        console.log('Starting money flow tracking with Helius...');
        
        const options: TrackingOptions = {
          endWalletAddress,
          exchangeTarget,
          maxDepth: maxDepth ? parseInt(maxDepth) : 5,
          direction: direction || 'outgoing',
          onProgress: (progress) => {
            sendEvent({ type: 'progress', ...progress });
          },
          onTransferFound: (transfer) => {
            sendEvent({ type: 'found', transfer });
          },
        };

        const result = await trackMoneyFlow(startAddress, parseFloat(minAmount), options);
        console.log(`Money flow tracking completed. Found ${result.transfers.length} transfers`);
        
        // DIAGNOSTIC LOG 1: Log first 3 transfers
        console.log('=== DIAGNOSTIC: trackMoneyFlow result ===');
        console.log(`Total transfers in result: ${result.transfers.length}`);
        console.log('First 3 transfers (full JSON):');
        result.transfers.slice(0, 3).forEach((t, i) => {
          console.log(`  Transfer ${i + 1}:`, JSON.stringify({ from: t.from, to: t.to, amount: t.amount }, null, 2));
        });

        // Generate AI summary
        console.log('Generating AI summary...');
        const summary = await generateMoneyFlowSummary(result.transfers);
        console.log('AI summary generated successfully');

        // DIAGNOSTIC: Log before sending complete event
        console.log('=== DIAGNOSTIC: About to send complete event via SSE ===');
        console.log(`Transfers array length: ${result.transfers.length}`);
        console.log('First transfer structure:', result.transfers.length > 0 ? JSON.stringify({
          from: result.transfers[0].from,
          to: result.transfers[0].to,
          amount: result.transfers[0].amount,
          signature: result.transfers[0].signature
        }, null, 2) : 'No transfers');

        // Send completion event
        sendEvent({
          type: 'complete',
          transfers: result.transfers,
          summary,
          totalTransfers: result.transfers.length,
          totalVolume: result.transfers.reduce((sum, t) => sum + t.amount, 0).toFixed(2),
          reachedTarget: result.reachedTarget,
          targetWallet: result.targetWallet,
          effectiveRootWallet: result.effectiveRootWallet,
        });

        console.log('=== Request completed successfully ===');
        closeStream();
      } catch (error) {
        console.error('=== ERROR in money flow tracking ===');
        console.error('Error:', error);
        sendEvent({ 
          type: 'error', 
          error: 'Failed to track money flow', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
        closeStream();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

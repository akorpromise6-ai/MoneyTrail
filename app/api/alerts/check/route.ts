import { NextRequest } from 'next/server';
import { monitorAlerts } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Starting alert check ===');
    
    await monitorAlerts();
    
    console.log('=== Alert check completed ===');
    
    return Response.json({ success: true, message: 'Alert check completed' });
  } catch (error) {
    console.error('Error in alert check:', error);
    return Response.json({ success: false, error: 'Alert check failed' }, { status: 500 });
  }
}

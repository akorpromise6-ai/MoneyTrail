import { getTransfers } from './helius';
import { createAlert, getAlerts } from './db';

export interface AlertConfig {
  flowId: number;
  walletAddress: string;
  alertType: 'outgoing' | 'incoming';
  thresholdAmount?: number;
}

/**
 * Check for new transfers from a wallet and create alerts if threshold is exceeded
 */
export async function checkWalletForAlerts(alertConfig: AlertConfig): Promise<boolean> {
  try {
    const transfers = await getTransfers(alertConfig.walletAddress, alertConfig.thresholdAmount || 0);
    
    // Filter transfers based on alert type
    const relevantTransfers = transfers.filter(t => {
      if (alertConfig.alertType === 'outgoing') {
        return t.from === alertConfig.walletAddress;
      } else {
        return t.to === alertConfig.walletAddress;
      }
    });

    if (relevantTransfers.length > 0) {
      console.log(`Alert triggered for wallet ${alertConfig.walletAddress}: ${relevantTransfers.length} new transfers`);
      // In a real implementation, you would send notifications here
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking wallet for alerts:', error);
    return false;
  }
}

/**
 * Monitor multiple wallets for alerts
 * This would typically be run as a background job/cron
 */
export async function monitorAlerts(): Promise<void> {
  try {
    // Get all active alerts from database
    // For now, this is a placeholder - you'd need to implement getActiveAlerts in db.ts
    const alerts = await getAlerts(0); // This would need to be changed to get all active alerts
    
    for (const alert of alerts) {
      await checkWalletForAlerts({
        flowId: alert.flow_id,
        walletAddress: alert.wallet_address,
        alertType: alert.alert_type as 'outgoing' | 'incoming',
        thresholdAmount: alert.threshold_amount ? parseFloat(alert.threshold_amount) : undefined,
      });
    }
  } catch (error) {
    console.error('Error monitoring alerts:', error);
  }
}

/**
 * API endpoint handler for checking alerts (can be called by cron/webhook)
 */
export async function handleAlertCheck(request: Request): Promise<Response> {
  try {
    await monitorAlerts();
    return Response.json({ success: true, message: 'Alert check completed' });
  } catch (error) {
    console.error('Error in alert check handler:', error);
    return Response.json({ success: false, error: 'Alert check failed' }, { status: 500 });
  }
}

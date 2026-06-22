import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        signature TEXT UNIQUE NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount DECIMAL(20, 9) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE,
        slot BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_from_address ON transactions(from_address);
      CREATE INDEX IF NOT EXISTS idx_to_address ON transactions(to_address);
      CREATE INDEX IF NOT EXISTS idx_signature ON transactions(signature);
      
      CREATE TABLE IF NOT EXISTS flows (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_address TEXT NOT NULL,
        min_amount DECIMAL(20, 9) NOT NULL,
        max_depth INTEGER DEFAULT 3,
        end_wallet_address TEXT,
        exchange_target TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_flows_start_address ON flows(start_address);
      
      CREATE TABLE IF NOT EXISTS flow_nodes (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        address TEXT NOT NULL,
        depth INTEGER NOT NULL,
        parent_wallets TEXT[],
        is_exchange BOOLEAN DEFAULT FALSE,
        exchange_name TEXT,
        is_dex BOOLEAN DEFAULT FALSE,
        dex_name TEXT,
        is_bridge BOOLEAN DEFAULT FALSE,
        bridge_name TEXT,
        is_merge_point BOOLEAN DEFAULT FALSE,
        UNIQUE(flow_id, address)
      );
      
      CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
      CREATE INDEX IF NOT EXISTS idx_flow_nodes_address ON flow_nodes(address);
      
      CREATE TABLE IF NOT EXISTS flow_edges (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        signature TEXT NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount DECIMAL(20, 9) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE,
        slot BIGINT,
        depth INTEGER NOT NULL,
        is_cycle BOOLEAN DEFAULT FALSE,
        is_exchange BOOLEAN DEFAULT FALSE,
        is_dex BOOLEAN DEFAULT FALSE,
        is_bridge BOOLEAN DEFAULT FALSE,
        merge_point BOOLEAN DEFAULT FALSE,
        UNIQUE(flow_id, signature)
      );
      
      CREATE INDEX IF NOT EXISTS idx_flow_edges_flow_id ON flow_edges(flow_id);
      
      CREATE TABLE IF NOT EXISTS flow_runs (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'running',
        wallets_checked INTEGER DEFAULT 0,
        transfers_found INTEGER DEFAULT 0,
        reached_target BOOLEAN DEFAULT FALSE,
        target_wallet TEXT,
        error_message TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_flow_runs_flow_id ON flow_runs(flow_id);
      
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
        wallet_address TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        threshold_amount DECIMAL(20, 9),
        last_checked_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_alerts_flow_id ON alerts(flow_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_wallet_address ON alerts(wallet_address);
    `);
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function saveTransaction(signature: string, fromAddress: string, toAddress: string, amount: number, timestamp: string, slot: number) {
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO transactions (signature, from_address, to_address, amount, timestamp, slot) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (signature) DO NOTHING',
      [signature, fromAddress, toAddress, amount, timestamp, slot]
    );
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw new Error(`Failed to save transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getTransactionsByAddress(address: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM transactions WHERE from_address = $1 OR to_address = $1 ORDER BY timestamp DESC',
      [address]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting transactions by address:', error);
    throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getOutgoingTransactions(address: string, minAmount: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM transactions WHERE from_address = $1 AND amount >= $2 ORDER BY timestamp DESC',
      [address, minAmount]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting outgoing transactions:', error);
    throw new Error(`Failed to get outgoing transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

// Flow persistence functions
export async function createFlow(name: string, startAddress: string, minAmount: number, maxDepth: number = 3, endWalletAddress?: string, exchangeTarget?: string, description?: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO flows (name, start_address, min_amount, max_depth, end_wallet_address, exchange_target, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, startAddress, minAmount, maxDepth, endWalletAddress, exchangeTarget, description]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating flow:', error);
    throw new Error(`Failed to create flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getFlows() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM flows ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('Error getting flows:', error);
    throw new Error(`Failed to get flows: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getFlowById(flowId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM flows WHERE id = $1', [flowId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting flow by id:', error);
    throw new Error(`Failed to get flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function saveFlowNodes(flowId: number, walletNodes: Map<string, any>) {
  const client = await pool.connect();
  try {
    for (const [address, node] of walletNodes.entries()) {
      await client.query(
        `INSERT INTO flow_nodes (flow_id, address, depth, parent_wallets, is_exchange, exchange_name, is_dex, dex_name, is_bridge, bridge_name, is_merge_point)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (flow_id, address) DO UPDATE SET
         depth = EXCLUDED.depth,
         parent_wallets = EXCLUDED.parent_wallets,
         is_exchange = EXCLUDED.is_exchange,
         exchange_name = EXCLUDED.exchange_name,
         is_dex = EXCLUDED.is_dex,
         dex_name = EXCLUDED.dex_name,
         is_bridge = EXCLUDED.is_bridge,
         bridge_name = EXCLUDED.bridge_name,
         is_merge_point = EXCLUDED.is_merge_point`,
        [
          flowId,
          address,
          node.depth,
          node.parentWallets,
          node.isExchange || false,
          node.exchangeName,
          node.isDex || false,
          node.dexName,
          node.isBridge || false,
          node.bridgeName,
          node.isMergePoint || false
        ]
      );
    }
  } catch (error) {
    console.error('Error saving flow nodes:', error);
    throw new Error(`Failed to save flow nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function saveFlowEdges(flowId: number, transfers: any[]) {
  const client = await pool.connect();
  try {
    for (const transfer of transfers) {
      await client.query(
        `INSERT INTO flow_edges (flow_id, signature, from_address, to_address, amount, timestamp, slot, depth, is_cycle, is_exchange, is_dex, is_bridge, merge_point)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (flow_id, signature) DO NOTHING`,
        [
          flowId,
          transfer.signature,
          transfer.from,
          transfer.to,
          transfer.amount,
          transfer.timestamp,
          transfer.slot,
          transfer.depth || 0,
          transfer.isCycle || false,
          transfer.isExchange || false,
          transfer.isDex || false,
          transfer.isBridge || false,
          transfer.mergePoint || false
        ]
      );
    }
  } catch (error) {
    console.error('Error saving flow edges:', error);
    throw new Error(`Failed to save flow edges: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function createFlowRun(flowId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO flow_runs (flow_id, status) VALUES ($1, $2) RETURNING *',
      [flowId, 'running']
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating flow run:', error);
    throw new Error(`Failed to create flow run: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function updateFlowRun(runId: number, status: string, walletsChecked: number, transfersFound: number, reachedTarget: boolean, targetWallet?: string, errorMessage?: string) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE flow_runs 
       SET status = $1, completed_at = CURRENT_TIMESTAMP, wallets_checked = $2, transfers_found = $3, reached_target = $4, target_wallet = $5, error_message = $6
       WHERE id = $7`,
      [status, walletsChecked, transfersFound, reachedTarget, targetWallet, errorMessage, runId]
    );
  } catch (error) {
    console.error('Error updating flow run:', error);
    throw new Error(`Failed to update flow run: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getFlowRuns(flowId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM flow_runs WHERE flow_id = $1 ORDER BY started_at DESC', [flowId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting flow runs:', error);
    throw new Error(`Failed to get flow runs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function createAlert(flowId: number, walletAddress: string, alertType: string, thresholdAmount?: number) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'INSERT INTO alerts (flow_id, wallet_address, alert_type, threshold_amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [flowId, walletAddress, alertType, thresholdAmount]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating alert:', error);
    throw new Error(`Failed to create alert: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export async function getAlerts(flowId: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM alerts WHERE flow_id = $1 AND is_active = true ORDER BY created_at DESC', [flowId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting alerts:', error);
    throw new Error(`Failed to get alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

export default pool;

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

export default pool;

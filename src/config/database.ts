import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const isRailway = DATABASE_URL.includes('railway') || DATABASE_URL.includes('rlwy.net') || DATABASE_URL.includes('shuttle.proxy.rlwy.net');

const poolConfig: { connectionString: string; ssl?: { rejectUnauthorized: boolean } } = {
  connectionString: DATABASE_URL,
};

if (isRailway) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

export default pool;


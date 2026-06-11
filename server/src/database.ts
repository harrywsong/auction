import pkg from 'pg';
import { config } from './config.js';

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database error', { text, error });
    throw error;
  }
}

export async function closePool() {
  await pool.end();
}

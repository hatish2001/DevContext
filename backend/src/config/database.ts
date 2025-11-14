import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/schema';

let db: ReturnType<typeof drizzle>;
let pool: Pool;

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://devcontext:devcontext@localhost:5432/devcontext';
  
  pool = new Pool({
    connectionString,
  });

  // Test the connection
  try {
    await pool.query('SELECT 1');
    console.log('Database connection test successful');
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }

  db = drizzle(pool, { schema });
  
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Export db for direct access (will be initialized by initDatabase)
export { db };

export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

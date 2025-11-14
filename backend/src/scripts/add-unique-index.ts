/**
 * Script to add unique index to contexts table
 * Run this after migration to ensure no duplicate contexts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function addUniqueIndex() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://devcontext:devcontext@localhost:5432/devcontext'
  });

  try {
    console.log('Adding unique index to contexts table...');
    
    // Check if index exists
    const checkQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'contexts' 
      AND indexname = 'contexts_user_source_sourceid_idx';
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('✓ Unique index already exists');
    } else {
      // Create unique index
      const createQuery = `
        CREATE UNIQUE INDEX IF NOT EXISTS contexts_user_source_sourceid_idx 
        ON contexts(user_id, source, source_id);
      `;
      
      await pool.query(createQuery);
      console.log('✓ Unique index created successfully');
    }
    
    // Show index info
    const infoQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'contexts';
    `;
    
    const indexes = await pool.query(infoQuery);
    console.log('\nCurrent indexes on contexts table:');
    indexes.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUniqueIndex();


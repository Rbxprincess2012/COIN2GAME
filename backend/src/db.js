import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/topup'
})

export async function initDb() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_id TEXT UNIQUE NOT NULL,
      name TEXT,
      platform TEXT,
      service TEXT,
      price NUMERIC(12,2),
      in_stock INTEGER,
      group_name TEXT,
      region TEXT,
      description TEXT,
      image TEXT,
      currency TEXT,
      product_type TEXT,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  await pool.query(createTableQuery)
}

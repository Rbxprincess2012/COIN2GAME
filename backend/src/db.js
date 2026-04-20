import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/topup'
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_id TEXT UNIQUE NOT NULL,
      name TEXT,
      platform TEXT,
      service TEXT,
      price NUMERIC(12,2),
      in_stock BOOLEAN,
      group_name TEXT,
      region TEXT,
      description TEXT,
      image TEXT,
      currency TEXT,
      product_type TEXT,
      markup NUMERIC(5,2),
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Migration: add markup column if missing
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS markup NUMERIC(5,2);
  `)

  // Migration: add paused column if missing
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      game_id TEXT UNIQUE NOT NULL,
      name TEXT,
      group_name TEXT,
      price NUMERIC(12,2),
      markup NUMERIC(5,2),
      launcher TEXT,
      supported_platforms TEXT,
      region TEXT,
      description TEXT,
      image TEXT,
      age_rating TEXT,
      genres TEXT,
      release_date TIMESTAMPTZ,
      developer TEXT,
      languages JSONB,
      in_stock BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Default global markup 0%
  await pool.query(`
    INSERT INTO settings (key, value) VALUES ('markup_global', '0')
    ON CONFLICT (key) DO NOTHING;
  `)
}

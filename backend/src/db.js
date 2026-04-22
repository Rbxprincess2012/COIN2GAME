import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

const dbHost = process.env.DB_HOST || 'localhost'
console.log('[db] connecting to host:', dbHost)

export const pool = new Pool({
  host: dbHost,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'topup',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
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

  // Migration: add price_site column if missing
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_site NUMERIC(12,2);
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

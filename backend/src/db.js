import pkg from 'pg'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  // Migration: add price_wb column if missing
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS price_wb NUMERIC(12,2);
  `)

  // Migration: add wb_nmid and wb_article columns if missing
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS wb_nmid BIGINT;
  `)
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS wb_article TEXT;
  `)

  // Migration: add wb_barcode for printing labels
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS wb_barcode TEXT;
  `)

  // Migration: add sales_count for popularity sorting
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
  `)

  // Orders table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      product_type TEXT,
      activation_code TEXT,
      price NUMERIC(12,2),
      status TEXT DEFAULT 'pending',
      fp_response JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Order number sequence starting at 10001
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS order_seq START 10001;
  `)

  // GGSell denomination mapping
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS ggsell_denomination_id INTEGER;
  `)
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS ggsell_price NUMERIC(12,4);
  `)
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier TEXT DEFAULT 'fp';
  `)
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS ggsell_type TEXT DEFAULT 'shop';
  `)
  await pool.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS ggsell_service_id INTEGER;
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

  // Seed descriptions from Excel export (only fills NULL descriptions, never overwrites)
  try {
    const descriptionsPath = join(__dirname, '..', 'data', 'descriptions.json')
    const descriptions = JSON.parse(readFileSync(descriptionsPath, 'utf8'))
    for (const { product_id, description, image } of descriptions) {
      await pool.query(
        `UPDATE products SET
           description = COALESCE(description, $2),
           image = COALESCE(image, $3)
         WHERE product_id = $1`,
        [product_id, description, image]
      )
    }
    console.log(`[db] descriptions seeded: ${descriptions.length} entries`)
  } catch {}
}

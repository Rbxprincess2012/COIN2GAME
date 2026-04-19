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

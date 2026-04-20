import { join } from 'path'
import XLSX from 'xlsx'
import dotenv from 'dotenv'
import pkg from 'pg'

dotenv.config()
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/topup'
})

const filePath = join(process.cwd(), '..', '..', 'Для клауда.xlsx')

function getValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== undefined) {
      return row[key]
    }
  }
  return null
}

function normalizeKey(key) {
  return key.toString().trim().toLowerCase()
}

function mapRow(row) {
  const lowerKeys = Object.keys(row).reduce((acc, key) => {
    acc[normalizeKey(key)] = key
    return acc
  }, {})

  return {
    product_id: row[lowerKeys['product_id']] || row[lowerKeys['product id']] || row[lowerKeys['id']] || row[lowerKeys['productid']] || null,
    name: row[lowerKeys['name']] || row[lowerKeys['title']] || row[lowerKeys['product_name']] || row[lowerKeys['item name']] || null,
    platform: row[lowerKeys['platform']] || row[lowerKeys['group']] || row[lowerKeys['group_name']] || null,
    service: row[lowerKeys['service']] || row[lowerKeys['description']] || null,
    price: row[lowerKeys['price']] || null,
    in_stock: (() => { const v = row[lowerKeys['in_stock']] ?? row[lowerKeys['stock']]; if (v === null || v === undefined) return null; if (typeof v === 'boolean') return v; return String(v).toLowerCase() === 'true' })(),
    group_name: row[lowerKeys['group']] || row[lowerKeys['group_name']] || null,
    region: row[lowerKeys['region']] || null,
    description: row[lowerKeys['description']] || null,
    image: row[lowerKeys['image']] || null,
    currency: row[lowerKeys['currency']] || null,
    product_type: row[lowerKeys['type']] || row[lowerKeys['product_type']] || null,
    raw_data: row
  }
}

async function main() {
  try {
    const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, blankrows: false })

    console.log(`Loaded ${rows.length} rows from Excel file.`)

    for (const row of rows) {
      const product = mapRow(row)
      if (!product.product_id) {
        console.warn('Skipped row without product_id:', row)
        continue
      }

      await pool.query(
        `INSERT INTO products (product_id, name, platform, service, price, in_stock, group_name, region, description, image, currency, product_type, raw_data)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (product_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            platform = EXCLUDED.platform,
            service = EXCLUDED.service,
            price = EXCLUDED.price,
            in_stock = EXCLUDED.in_stock,
            group_name = EXCLUDED.group_name,
            region = EXCLUDED.region,
            description = EXCLUDED.description,
            image = EXCLUDED.image,
            currency = EXCLUDED.currency,
            product_type = EXCLUDED.product_type,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()`,
        [
          product.product_id,
          product.name,
          product.platform,
          product.service,
          product.price,
          product.in_stock,
          product.group_name,
          product.region,
          product.description,
          product.image,
          product.currency,
          product.product_type,
          product.raw_data
        ]
      )
    }

    console.log('Products loaded into PostgreSQL successfully.')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Failed to load products:', error)
    process.exit(1)
  }
}

main()

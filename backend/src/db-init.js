import { initDb } from './db.js'

async function main() {
  try {
    await initDb()
    console.log('PostgreSQL schema created successfully.')
    process.exit(0)
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

main()

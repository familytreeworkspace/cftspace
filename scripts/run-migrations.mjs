// Run this script on your local machine:
//   node scripts/run-migrations.mjs
//
// Requires: npm install pg  (run once in the project folder)

import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_PASSWORD = 'MexZhe0OFxSj4Scu'

const client = new pg.Client({
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.vgudndmfczppicealndm.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('Connecting to Supabase...')
  await client.connect()
  console.log('Connected successfully.\n')

  const migrationFile = join(__dirname, '../supabase/migrations/001_initial_schema.sql')
  const sql = readFileSync(migrationFile, 'utf8')

  // Split into individual statements
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let success = 0, skipped = 0, errors = 0

  for (const stmt of statements) {
    const preview = stmt.slice(0, 70).replace(/\n/g, ' ')
    try {
      await client.query(stmt)
      success++
      console.log(`  ✓  ${preview}`)
    } catch (err) {
      const msg = err.message ?? ''
      if (msg.includes('already exists') || msg.includes('duplicate key')) {
        skipped++
        console.log(`  ~  (already exists) ${preview}`)
      } else {
        errors++
        console.error(`  ✗  ERROR: ${msg.split('\n')[0]}`)
        console.error(`     Statement: ${preview}`)
      }
    }
  }

  console.log(`\n──────────────────────────────────`)
  console.log(`  Done: ${success} executed, ${skipped} skipped, ${errors} errors`)
  console.log(`──────────────────────────────────`)

  await client.end()
}

run().catch(err => {
  console.error('\nFatal connection error:', err.message)
  console.error('\nMake sure:')
  console.error('  1. You have internet access')
  console.error('  2. npm install pg  was run in this folder')
  process.exit(1)
})

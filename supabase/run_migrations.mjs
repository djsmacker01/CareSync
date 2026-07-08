/**
 * Runs all SQL migrations against Supabase using the REST API.
 * Usage: node supabase/run_migrations.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first (see backend/.env.example)')
  process.exit(1)
}

const migrations = [
  '001_users.sql',
  '002_clients.sql',
  '003_medications.sql',
  '004_mar_entries.sql',
  '005_stock.sql',
  '006_tasks.sql',
  '007_fire_safety.sql',
  '008_visitors.sql',
]

async function runSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql }),
  })

  if (!res.ok) {
    // Try the pg endpoint instead
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    })
    if (!res2.ok) {
      const text = await res2.text()
      throw new Error(`${label}: ${res2.status} — ${text}`)
    }
    return res2
  }
  return res
}

async function main() {
  console.log('CareSync — Running migrations\n')

  for (const filename of migrations) {
    const filepath = join(__dir, 'migrations', filename)
    const sql = readFileSync(filepath, 'utf8')
    process.stdout.write(`  Running ${filename}... `)
    try {
      await runSQL(sql, filename)
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`  Error: ${err.message}\n`)
      process.exit(1)
    }
  }

  console.log('\nAll migrations complete.')
}

main()

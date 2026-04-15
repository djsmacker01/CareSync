/**
 * One-time seed script — creates test users in Supabase Auth + public.users table.
 *
 * Run from the backend folder:
 *   node scripts/seed.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEST_USERS = [
  { email: 'manager@caresync.test',    password: 'TestPass123!', full_name: 'Carol Manager',   role: 'manager'    },
  { email: 'supervisor@caresync.test', password: 'TestPass123!', full_name: 'Bob Supervisor',  role: 'supervisor' },
  { email: 'staff@caresync.test',      password: 'TestPass123!', full_name: 'Alice Nurse',      role: 'staff'      },
]

async function seedUsers() {
  console.log('🌱  Seeding test users…\n')

  for (const u of TEST_USERS) {
    // 1. Create (or retrieve) the Supabase Auth user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email:             u.email,
      password:          u.password,
      email_confirm:     true,            // skip email verification for dev
      app_metadata:      { role: u.role }, // embedded in JWT for fast RLS checks
    })

    let userId

    if (createErr) {
      if (createErr.message?.includes('already been registered') ||
          createErr.message?.toLowerCase().includes('already exists')) {
        // User already in Auth — look up their UUID
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users?.find(x => x.email === u.email)
        if (!existing) {
          console.error(`  ✗ ${u.email}: could not find existing auth user`)
          continue
        }
        userId = existing.id
        console.log(`  ↩  ${u.email} already exists in Auth (id: ${userId})`)

        // Reset password and update app_metadata to known state
        await supabase.auth.admin.updateUserById(userId, {
          password:     u.password,
          app_metadata: { role: u.role },
        })
        console.log(`  ✓ ${u.email} password + app_metadata updated`)
      } else {
        console.error(`  ✗ ${u.email}: Auth error — ${createErr.message}`)
        continue
      }
    } else {
      userId = created.user.id
      console.log(`  ✓ ${u.email} created in Auth (id: ${userId})`)
    }

    // 2. Upsert into public.users (safe to re-run)
    const { error: upsertErr } = await supabase
      .from('users')
      .upsert(
        { id: userId, email: u.email, full_name: u.full_name, role: u.role, is_active: true },
        { onConflict: 'id' }
      )

    if (upsertErr) {
      console.error(`  ✗ ${u.email}: profile upsert failed — ${upsertErr.message}`)
    } else {
      console.log(`  ✓ ${u.email} profile saved (role: ${u.role})`)
    }
  }

  console.log('\n✅  Done!  Test credentials:')
  console.log('   manager@caresync.test    / TestPass123!')
  console.log('   supervisor@caresync.test / TestPass123!')
  console.log('   staff@caresync.test      / TestPass123!')
}

seedUsers().catch(err => {
  console.error('\n❌  Seed failed:', err.message)
  process.exit(1)
})

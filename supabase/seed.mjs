/**
 * CareSync — Seed script
 * Creates 3 test auth users then seeds clients, medications, stock, and tasks.
 * Run AFTER pasting combined_migrations.sql into the Supabase SQL Editor.
 *
 * Usage: node supabase/seed.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://your-project.supabase.co'
const SERVICE_ROLE_KEY = 'your-supabase-service-role-key'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = [
  { email: 'staff@caresync.test',      password: 'TestPass123!', full_name: 'Alice Nurse',    role: 'staff'      },
  { email: 'supervisor@caresync.test', password: 'TestPass123!', full_name: 'Bob Supervisor', role: 'supervisor' },
  { email: 'manager@caresync.test',    password: 'TestPass123!', full_name: 'Carol Manager',  role: 'manager'    },
]

function log(msg) { console.log(`  ${msg}`) }
function ok(msg)  { console.log(`  ✓ ${msg}`) }
function err(msg) { console.error(`  ✗ ${msg}`) }

async function createOrFetchAuthUser(userData) {
  // Try to create — if email exists, fetch the existing user
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
  })

  if (error) {
    if (error.message.includes('already been registered') || error.status === 422) {
      // User already exists — list users and find them
      const { data: list } = await supabase.auth.admin.listUsers()
      const existing = list?.users?.find(u => u.email === userData.email)
      if (existing) {
        ok(`Auth user already exists: ${userData.email} (${existing.id})`)
        return existing.id
      }
    }
    throw new Error(`Failed to create auth user ${userData.email}: ${error.message}`)
  }

  ok(`Created auth user: ${userData.email} (${data.user.id})`)
  return data.user.id
}

async function main() {
  console.log('\nCareSync — Seeding database\n')

  // ── Step 1: Create auth users ────────────────────────────────
  console.log('Step 1: Creating auth users...')
  const userIds = {}
  for (const u of TEST_USERS) {
    try {
      userIds[u.role] = await createOrFetchAuthUser(u)
    } catch (e) {
      err(e.message)
      process.exit(1)
    }
  }

  // ── Step 2: Upsert user profiles ─────────────────────────────
  console.log('\nStep 2: Upserting user profiles...')
  for (const u of TEST_USERS) {
    const { error } = await supabase.from('users').upsert({
      id:        userIds[u.role],
      email:     u.email,
      full_name: u.full_name,
      role:      u.role,
      is_active: true,
    }, { onConflict: 'id' })

    if (error) { err(`Profile ${u.email}: ${error.message}`); process.exit(1) }
    ok(`Profile: ${u.full_name} (${u.role})`)
  }

  // ── Step 3: Seed clients ─────────────────────────────────────
  console.log('\nStep 3: Seeding clients...')
  const clients = [
    { id: '10000000-0000-0000-0000-000000000001', full_name: 'George Adams',  date_of_birth: '1942-03-14', room_number: '1A', key_worker_id: userIds.staff },
    { id: '10000000-0000-0000-0000-000000000002', full_name: 'Dorothy Brown', date_of_birth: '1938-07-22', room_number: '1B', key_worker_id: userIds.staff },
    { id: '10000000-0000-0000-0000-000000000003', full_name: 'Harold Clarke', date_of_birth: '1945-11-05', room_number: '2A', key_worker_id: userIds.supervisor },
    { id: '10000000-0000-0000-0000-000000000004', full_name: 'Edith Davis',   date_of_birth: '1950-01-30', room_number: '2B', key_worker_id: userIds.supervisor },
    { id: '10000000-0000-0000-0000-000000000005', full_name: 'Frank Evans',   date_of_birth: '1935-09-18', room_number: '3A', key_worker_id: userIds.staff },
  ]

  const { error: clientsErr } = await supabase.from('clients').upsert(clients, { onConflict: 'id' })
  if (clientsErr) { err(`Clients: ${clientsErr.message}`); process.exit(1) }
  ok(`5 clients seeded`)

  // ── Step 4: Seed medications ─────────────────────────────────
  console.log('\nStep 4: Seeding medications...')
  const medications = [
    // George Adams
    { id: '20000000-0000-0000-0000-000000000001', client_id: '10000000-0000-0000-0000-000000000001', medication_name: 'Amlodipine',    dosage: '5mg',   frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000002', client_id: '10000000-0000-0000-0000-000000000001', medication_name: 'Aspirin',       dosage: '75mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000003', client_id: '10000000-0000-0000-0000-000000000001', medication_name: 'Omeprazole',    dosage: '20mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    // Dorothy Brown
    { id: '20000000-0000-0000-0000-000000000004', client_id: '10000000-0000-0000-0000-000000000002', medication_name: 'Metformin',     dosage: '500mg', frequency: 'Twice daily', route: 'oral', prescriber: 'Dr. Jones', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000005', client_id: '10000000-0000-0000-0000-000000000002', medication_name: 'Atorvastatin',  dosage: '10mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Jones', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000006', client_id: '10000000-0000-0000-0000-000000000002', medication_name: 'Ramipril',      dosage: '2.5mg', frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Jones', start_date: '2024-01-01' },
    // Harold Clarke
    { id: '20000000-0000-0000-0000-000000000007', client_id: '10000000-0000-0000-0000-000000000003', medication_name: 'Bisoprolol',    dosage: '2.5mg', frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000008', client_id: '10000000-0000-0000-0000-000000000003', medication_name: 'Furosemide',    dosage: '40mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000009', client_id: '10000000-0000-0000-0000-000000000003', medication_name: 'Sertraline',    dosage: '50mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Smith', start_date: '2024-01-01' },
    // Edith Davis
    { id: '20000000-0000-0000-0000-000000000010', client_id: '10000000-0000-0000-0000-000000000004', medication_name: 'Levothyroxine', dosage: '50mcg', frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Brown', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000011', client_id: '10000000-0000-0000-0000-000000000004', medication_name: 'Clopidogrel',   dosage: '75mg',  frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Brown', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000012', client_id: '10000000-0000-0000-0000-000000000004', medication_name: 'Donepezil',     dosage: '5mg',   frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Brown', start_date: '2024-01-01' },
    // Frank Evans
    { id: '20000000-0000-0000-0000-000000000013', client_id: '10000000-0000-0000-0000-000000000005', medication_name: 'Warfarin',      dosage: '3mg',   frequency: 'Once daily',  route: 'oral', prescriber: 'Dr. Evans', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000014', client_id: '10000000-0000-0000-0000-000000000005', medication_name: 'Codeine',       dosage: '30mg',  frequency: 'Twice daily', route: 'oral', prescriber: 'Dr. Evans', start_date: '2024-01-01' },
    { id: '20000000-0000-0000-0000-000000000015', client_id: '10000000-0000-0000-0000-000000000005', medication_name: 'Lactulose',     dosage: '15ml',  frequency: 'Twice daily', route: 'oral', prescriber: 'Dr. Evans', start_date: '2024-01-01' },
  ]

  const { error: medErr } = await supabase.from('medications').upsert(medications, { onConflict: 'id' })
  if (medErr) { err(`Medications: ${medErr.message}`); process.exit(1) }
  ok(`15 medications seeded`)

  // ── Step 5: Seed stock ───────────────────────────────────────
  console.log('\nStep 5: Seeding stock...')
  const stock = [
    { medication_id: '20000000-0000-0000-0000-000000000001', client_id: '10000000-0000-0000-0000-000000000001', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000002', client_id: '10000000-0000-0000-0000-000000000001', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000003', client_id: '10000000-0000-0000-0000-000000000001', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000004', client_id: '10000000-0000-0000-0000-000000000002', current_quantity: 56,  unit: 'tablets', reorder_threshold: 14 },
    { medication_id: '20000000-0000-0000-0000-000000000005', client_id: '10000000-0000-0000-0000-000000000002', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000006', client_id: '10000000-0000-0000-0000-000000000002', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000007', client_id: '10000000-0000-0000-0000-000000000003', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000008', client_id: '10000000-0000-0000-0000-000000000003', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000009', client_id: '10000000-0000-0000-0000-000000000003', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000010', client_id: '10000000-0000-0000-0000-000000000004', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000011', client_id: '10000000-0000-0000-0000-000000000004', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000012', client_id: '10000000-0000-0000-0000-000000000004', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000013', client_id: '10000000-0000-0000-0000-000000000005', current_quantity: 28,  unit: 'tablets', reorder_threshold: 7 },
    { medication_id: '20000000-0000-0000-0000-000000000014', client_id: '10000000-0000-0000-0000-000000000005', current_quantity: 56,  unit: 'tablets', reorder_threshold: 14 },
    { medication_id: '20000000-0000-0000-0000-000000000015', client_id: '10000000-0000-0000-0000-000000000005', current_quantity: 500, unit: 'ml',      reorder_threshold: 100 },
  ]

  const { error: stockErr } = await supabase.from('stock').upsert(stock, { onConflict: 'medication_id,client_id' })
  if (stockErr) { err(`Stock: ${stockErr.message}`); process.exit(1) }
  ok(`15 stock records seeded`)

  // ── Step 6: Seed tasks ───────────────────────────────────────
  console.log('\nStep 6: Seeding default tasks...')
  const tasks = [
    { id: '30000000-0000-0000-0000-000000000001', title: 'Morning medication round',  description: 'Administer all AM medications',               shift: 'AM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000002', title: 'Morning personal care',     description: 'Assist all residents with personal care',      shift: 'AM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000003', title: 'Breakfast service',         description: 'Serve breakfast and document intake',           shift: 'AM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000004', title: 'Fire door check',           description: 'Check all fire doors are closed properly',      shift: 'AM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000005', title: 'Handover preparation',      description: 'Complete MAR and prepare handover notes',       shift: 'AM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000006', title: 'Evening medication round',  description: 'Administer all PM medications',                 shift: 'PM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000007', title: 'Evening personal care',     description: 'Assist all residents with personal care',       shift: 'PM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000008', title: 'Dinner service',            description: 'Serve dinner and document intake',              shift: 'PM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000009', title: 'End of shift checks',       description: 'Complete all end-of-shift documentation',       shift: 'PM',   is_recurring: true, created_by: userIds.manager },
    { id: '30000000-0000-0000-0000-000000000010', title: 'Stock check',               description: 'Check and report any low stock items',          shift: 'BOTH', is_recurring: true, created_by: userIds.manager },
  ]

  const { error: tasksErr } = await supabase.from('tasks').upsert(tasks, { onConflict: 'id' })
  if (tasksErr) { err(`Tasks: ${tasksErr.message}`); process.exit(1) }
  ok(`10 tasks seeded`)

  console.log('\n────────────────────────────────────────')
  console.log('Seed complete!\n')
  console.log('Test accounts:')
  console.log('  staff@caresync.test      / TestPass123!  (role: staff)')
  console.log('  supervisor@caresync.test / TestPass123!  (role: supervisor)')
  console.log('  manager@caresync.test    / TestPass123!  (role: manager)')
  console.log('────────────────────────────────────────\n')
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1) })

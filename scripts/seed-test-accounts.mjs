/**
 * Seed test accounts for user testing agents.
 *
 * Creates 8 accounts in Supabase Auth (3 DIYer + 5 Expert) and writes
 * credentials back into .env.local so the testing agents can log in.
 *
 * Usage:  node scripts/seed-test-accounts.mjs
 *
 * Requires TEST_ACCOUNT_PASSWORD in .env.local.
 * Idempotent — skips accounts whose email already exists.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

// ── Read .env.local ──────────────────────────────────────────────────────────

const ENV_PATH = '.env.local';
const envContent = readFileSync(ENV_PATH, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  if (line.startsWith('#') || !line.includes('=')) continue;
  const eqIndex = line.indexOf('=');
  env[line.slice(0, eqIndex).trim()] = line.slice(eqIndex + 1).trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const testPassword = env.TEST_ACCOUNT_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!testPassword) {
  console.error('Missing TEST_ACCOUNT_PASSWORD in .env.local');
  console.error('Add it first:  TEST_ACCOUNT_PASSWORD=YourPasswordHere');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Account definitions ──────────────────────────────────────────────────────

const DIYER_ACCOUNTS = [
  { envPrefix: 'TEST_DIYER_BEGINNER',      email: 'test-diyer-beginner@diyhelper.test' },
  { envPrefix: 'TEST_DIYER_INTERMEDIATE',   email: 'test-diyer-intermediate@diyhelper.test' },
  { envPrefix: 'TEST_DIYER_EXPERT',         email: 'test-diyer-expert@diyhelper.test' },
];

const EXPERT_ACCOUNTS = [
  {
    envPrefix: 'TEST_EXPERT_CARPENTER',
    email: 'test-expert-carpenter@diyhelper.test',
    displayName: 'Mike the Carpenter',
    specialty: 'carpentry',
    city: 'Portland',
    state: 'OR',
  },
  {
    envPrefix: 'TEST_EXPERT_ELECTRICIAN',
    email: 'test-expert-electrician@diyhelper.test',
    displayName: 'Sarah the Electrician',
    specialty: 'electrical',
    city: 'Denver',
    state: 'CO',
  },
  {
    envPrefix: 'TEST_EXPERT_PLUMBER',
    email: 'test-expert-plumber@diyhelper.test',
    displayName: 'Dave the Plumber',
    specialty: 'plumbing',
    city: 'Chicago',
    state: 'IL',
  },
  {
    envPrefix: 'TEST_EXPERT_HVAC',
    email: 'test-expert-hvac@diyhelper.test',
    displayName: 'Lisa the HVAC Tech',
    specialty: 'hvac',
    city: 'Minneapolis',
    state: 'MN',
  },
  {
    envPrefix: 'TEST_EXPERT_GC',
    email: 'test-expert-gc@diyhelper.test',
    displayName: 'Tony the General Contractor',
    specialty: 'general_contracting',
    city: 'Austin',
    state: 'TX',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createAccount(email) {
  // Check if user already exists by trying to find them
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existing = users.find(u => u.email === email);
  if (existing) {
    console.log(`  ⟳ ${email} already exists (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: testPassword,
    email_confirm: true, // skip email verification
  });

  if (error) {
    console.error(`  ✗ Failed to create ${email}:`, error.message);
    return null;
  }

  console.log(`  ✓ Created ${email} (${data.user.id})`);
  return data.user.id;
}

async function createExpertProfile(userId, account) {
  // Check if profile already exists
  const { data: existing } = await supabase
    .from('expert_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    console.log(`  ⟳ Expert profile already exists for ${account.displayName}`);
    return existing.id;
  }

  const { data: profile, error: profileError } = await supabase
    .from('expert_profiles')
    .insert({
      user_id: userId,
      display_name: account.displayName,
      bio: `Test account for ${account.specialty} user testing agent.`,
      city: account.city,
      state: account.state,
      service_radius_miles: 25,
      hourly_rate_cents: 7500,
      qa_rate_cents: 1500,
      is_active: true,
      is_available: true,
    })
    .select('id')
    .single();

  if (profileError) {
    console.error(`  ✗ Failed to create expert profile for ${account.displayName}:`, profileError.message);
    return null;
  }

  // Insert primary specialty
  const { error: specError } = await supabase
    .from('expert_specialties')
    .insert({
      expert_id: profile.id,
      specialty: account.specialty,
      years_experience: 15,
      is_primary: true,
    });

  if (specError) {
    console.error(`  ✗ Failed to insert specialty for ${account.displayName}:`, specError.message);
  } else {
    console.log(`  ✓ Expert profile created for ${account.displayName} (${account.specialty})`);
  }

  return profile.id;
}

function updateEnvFile(credentials) {
  let content = readFileSync(ENV_PATH, 'utf-8');

  for (const { envPrefix, email } of credentials) {
    const emailKey = `${envPrefix}_EMAIL`;
    const passKey = `${envPrefix}_PASSWORD`;

    // Replace empty values with actual credentials
    content = content.replace(
      new RegExp(`^${emailKey}=.*$`, 'm'),
      `${emailKey}=${email}`
    );
    content = content.replace(
      new RegExp(`^${passKey}=.*$`, 'm'),
      `${passKey}=${testPassword}`
    );
  }

  writeFileSync(ENV_PATH, content, 'utf-8');
  console.log(`\n✓ Updated ${ENV_PATH} with test account credentials`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding test accounts for user testing agents...\n');

  const allCredentials = [];

  // Create DIYer accounts
  console.log('DIYer accounts:');
  for (const account of DIYER_ACCOUNTS) {
    const userId = await createAccount(account.email);
    if (userId) {
      allCredentials.push({ envPrefix: account.envPrefix, email: account.email });
    }
  }

  // Create Expert accounts + profiles
  console.log('\nExpert accounts:');
  for (const account of EXPERT_ACCOUNTS) {
    const userId = await createAccount(account.email);
    if (userId) {
      allCredentials.push({ envPrefix: account.envPrefix, email: account.email });
      await createExpertProfile(userId, account);
    }
  }

  // Write credentials to .env.local
  if (allCredentials.length > 0) {
    updateEnvFile(allCredentials);
  }

  console.log(`\nDone! ${allCredentials.length}/8 accounts ready.`);
  console.log(`Password for all test accounts: ${testPassword}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

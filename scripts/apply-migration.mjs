import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  if (line.startsWith('#') || !line.includes('=')) continue;
  const eqIndex = line.indexOf('=');
  const key = line.slice(0, eqIndex).trim();
  const value = line.slice(eqIndex + 1).trim();
  env[key] = value;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('Connecting to Supabase...');

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Read the migration SQL
const migrationSql = readFileSync('supabase/migrations/20260218000000_agent_system.sql', 'utf-8');

// Split into individual statements (handle the multi-line SQL)
// We'll use the rpc endpoint to run raw SQL
const { data, error } = await client.rpc('', {}).then(() => {
  console.log('RPC not available, using direct approach');
  return { data: null, error: null };
}).catch(() => ({ data: null, error: null }));

// Use the Supabase SQL API (management API)
// Since we can't run DDL via PostgREST, let's use the pg endpoint
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
console.log('Project ref:', projectRef);

// Use the Management API to execute SQL
const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: migrationSql }),
});

if (!resp.ok) {
  // Try alternative: the Supabase DB URL approach
  console.log('Management API returned:', resp.status);

  // Alternative: break migration into individual statements and use rpc
  // For now, let's check if tables already exist
  const { data: tables, error: tableErr } = await client
    .from('agent_runs')
    .select('id')
    .limit(1);

  if (!tableErr) {
    console.log('Tables already exist! Migration may have been applied previously.');
    process.exit(0);
  }

  console.log('Tables do not exist yet. Please apply the migration manually:');
  console.log('1. Go to your Supabase Dashboard -> SQL Editor');
  console.log('2. Paste the contents of supabase/migrations/20260218000000_agent_system.sql');
  console.log('3. Click Run');
  console.log('\nOr use: npx supabase db push (after logging in with: npx supabase login)');
  process.exit(1);
} else {
  const result = await resp.json();
  console.log('Migration applied successfully!', result);
}

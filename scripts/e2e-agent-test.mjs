/**
 * End-to-end test for the Agent Delegation Pipeline.
 *
 * Usage: node scripts/e2e-agent-test.mjs
 *
 * This script:
 * 1. Signs in (or creates) a test user
 * 2. Calls POST /api/agents/runs with a sample project
 * 3. Streams SSE events and logs progress
 * 4. Fetches the final report
 * 5. Applies the report to a project
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ── Load env ──────────────────────────────────────────────────────────────────
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const eqIndex = trimmed.indexOf('=');
  let value = trimmed.slice(eqIndex + 1).trim();
  // Strip inline comments (e.g. "value  # comment")
  const commentIdx = value.indexOf('  #');
  if (commentIdx > 0) value = value.slice(0, commentIdx).trim();
  env[trimmed.slice(0, eqIndex).trim()] = value;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = 'http://localhost:3000';

const TEST_EMAIL = 'diyagenttest2026@gmail.com';
const TEST_PASSWORD = 'testpassword123456';

console.log('\n=== DIY Agent Pipeline E2E Test ===\n');

// ── Step 1: Get or create test user ──────────────────────────────────────────
console.log('Step 1: Setting up test user...');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Try signing in first; if that fails, sign up
let accessToken;
let userId;

const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

if (signInError) {
  console.log('  Sign-in failed, signing up...');
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signUpError) {
    console.error('  Failed to sign up:', signUpError.message);
    process.exit(1);
  }
  accessToken = signUpData.session?.access_token;
  userId = signUpData.user?.id;
  if (!accessToken) {
    console.error('  Sign up succeeded but no session (email confirmation might be required).');
    console.error('  Please disable "Confirm email" in Supabase Dashboard > Auth > Settings, then retry.');
    process.exit(1);
  }
} else {
  accessToken = signInData.session.access_token;
  userId = signInData.user.id;
}

console.log('  User ID:', userId);
console.log('  Signed in, got access token');

// ── Step 2: Start agent run ──────────────────────────────────────────────────
console.log('\nStep 2: Starting agent run...');

const startTime = Date.now();

const response = await fetch(`${BASE_URL}/api/agents/runs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    projectDescription: 'Install a new GFCI electrical outlet in my bathroom',
    city: 'Austin',
    state: 'TX',
    budgetLevel: 'mid-range',
    experienceLevel: 'intermediate',
  }),
});

if (!response.ok) {
  const errBody = await response.text();
  console.error('  Failed to start run:', response.status, errBody);
  process.exit(1);
}

console.log('  SSE stream connected, listening for events...\n');

// ── Step 3: Stream and parse SSE events ──────────────────────────────────────
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
let runId = null;
let reportId = null;
let summary = null;
let totalCost = null;
let eventCount = 0;
let phaseTimings = {};

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr) continue;

    try {
      const event = JSON.parse(jsonStr);
      eventCount++;

      switch (event.type) {
        case 'agent_progress': {
          runId = event.runId;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const icon = event.phaseStatus === 'completed' ? '✅' :
                       event.phaseStatus === 'started' ? '🚀' :
                       event.phaseStatus === 'tool_call' ? '🔧' :
                       event.phaseStatus === 'thinking' ? '🤔' : '⚙️';
          console.log(`  [${elapsed}s] ${icon} [${event.phase}] ${event.message} (${event.overallProgress}%)`);

          if (event.phaseStatus === 'started') {
            phaseTimings[event.phase] = { start: Date.now() };
          }
          if (event.phaseStatus === 'completed' && phaseTimings[event.phase]) {
            phaseTimings[event.phase].duration = ((Date.now() - phaseTimings[event.phase].start) / 1000).toFixed(1);
          }
          break;
        }

        case 'agent_complete':
          reportId = event.reportId;
          summary = event.summary;
          totalCost = event.totalCost;
          console.log(`\n  ✅ PIPELINE COMPLETE`);
          console.log(`  Report ID: ${reportId}`);
          console.log(`  Total Cost: $${totalCost}`);
          break;

        case 'agent_error':
          console.error(`\n  ❌ ERROR in ${event.phase}: ${event.message}`);
          break;

        case 'heartbeat':
          // Silent
          break;

        case 'done':
          break;
      }
    } catch {
      // Skip invalid JSON
    }
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n  Total pipeline time: ${totalTime}s`);
console.log(`  Total SSE events: ${eventCount}`);
console.log('  Phase timings:');
for (const [phase, timing] of Object.entries(phaseTimings)) {
  console.log(`    ${phase}: ${timing.duration || '?'}s`);
}

if (!reportId) {
  console.error('\n❌ Pipeline did not produce a report. Check errors above.');
  process.exit(1);
}

// ── Step 4: Fetch the report ─────────────────────────────────────────────────
console.log('\nStep 4: Fetching report...');

const reportResp = await fetch(`${BASE_URL}/api/reports/${reportId}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});

if (!reportResp.ok) {
  console.error('  Failed to fetch report:', reportResp.status);
  process.exit(1);
}

const { report } = await reportResp.json();
console.log(`  Title: ${report.title}`);
console.log(`  Sections: ${report.sections.length}`);
console.log(`  Summary: ${(report.summary || '').slice(0, 150)}...`);
console.log(`  Sections:`);
for (const section of report.sections.sort((a, b) => a.order - b.order)) {
  console.log(`    ${section.order}. [${section.type}] ${section.title} (${section.content.length} chars)`);
}

// ── Step 5: Apply to project ─────────────────────────────────────────────────
console.log('\nStep 5: Applying report to project...');

const applyResp = await fetch(`${BASE_URL}/api/reports/${reportId}/apply`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({}),
});

if (!applyResp.ok) {
  const errText = await applyResp.text();
  console.error('  Failed to apply report:', applyResp.status, errText);
  // Non-fatal: continue to step 6
} else {
  const applyResult = await applyResp.json();
  console.log(`  ✅ ${applyResult.message}`);
  console.log(`  Project ID: ${applyResult.projectId}`);
}

// ── Step 6: Verify run state in DB ───────────────────────────────────────────
console.log('\nStep 6: Verifying run state...');

const runResp = await fetch(`${BASE_URL}/api/agents/runs/${runId}`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});

if (runResp.ok) {
  const { run, phases, report: runReport } = await runResp.json();
  console.log(`  Run status: ${run.status}`);
  console.log(`  Phases (${phases.length}):`);
  if (phases.length === 0) {
    console.log('    ⚠️  No phases returned (possible RLS issue)');
  }
  for (const p of phases.sort((a, b) => a.phase.localeCompare(b.phase))) {
    console.log(`    ${p.phase}: ${p.status} (${p.duration_ms ? p.duration_ms + 'ms' : 'n/a'})`);
  }
  if (runReport) {
    console.log(`  Report linked: ${runReport.id}`);
  }
} else {
  console.error('  Failed to fetch run details:', runResp.status);
}

console.log('\n=== E2E Test Complete ===\n');
process.exit(0);

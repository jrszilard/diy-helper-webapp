#!/usr/bin/env npx tsx
// Cold-start seed script: generates DIY safety rubric examples using Opus.
// Run once to populate advisor_rubric_examples before launching custom review mode.
//
// Usage: ANTHROPIC_API_KEY=sk-... npx tsx scripts/seed-rubric-examples.ts
//
// Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453
// §3: Start with ~100-200 curated examples; fine-tuning threshold is ~200+.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const SCENARIOS = [
  { category: 'electrical', scenarios: [
    'replacing a circuit breaker in a residential panel',
    'adding a new 20-amp outlet to a kitchen',
    'installing a GFCI outlet near a bathroom sink',
    'wiring a subpanel in a detached garage',
    'upgrading from 100-amp to 200-amp service',
    'replacing a light switch with a dimmer',
    'installing recessed lighting in a finished ceiling',
    'fixing a tripped AFCI breaker that keeps tripping',
    'adding an outlet in an unfinished basement',
    'replacing knob-and-tube wiring in an older home',
  ]},
  { category: 'plumbing', scenarios: [
    'replacing a water heater (gas)',
    'installing a gas line for a clothes dryer',
    'fixing a slab leak under a concrete foundation',
    'adding a bathroom in a finished basement',
    'replacing a main water shutoff valve',
    'installing a sump pump in a crawl space',
    'repiping a house from galvanized to PEX',
    'fixing a leaking toilet flange',
  ]},
  { category: 'structural', scenarios: [
    'removing a load-bearing wall and adding a beam',
    'sistering damaged floor joists',
    'repairing a cracked foundation wall',
    'adding a header for a new window opening',
    'building a deck attached to the house',
    'shoring up a sagging floor over a crawl space',
  ]},
  { category: 'gas', scenarios: [
    'connecting a gas range to an existing gas line',
    'relighting a pilot light on a gas water heater',
    'converting a gas appliance from natural gas to propane',
    'detecting and fixing a gas leak smell',
  ]},
  { category: 'roofing', scenarios: [
    'replacing damaged asphalt shingles after a storm',
    'installing flashing around a chimney',
    'repairing a leaking skylight',
    'adding attic ventilation (ridge vent or soffit vents)',
  ]},
  { category: 'hazmat', scenarios: [
    'testing for and encapsulating lead paint before renovation',
    'dealing with suspected asbestos floor tiles',
    'removing mold in a bathroom with poor ventilation',
    'working in a space with vermiculite insulation (potential asbestos)',
  ]},
];

const GENERATION_PROMPT = `You are generating training data for a DIY safety reviewer AI.

For the scenario: "{scenario}"

Generate a JSON object with these fields:
1. "user_question" — a realistic question a homeowner would ask (1-2 sentences)
2. "bad_response" — a plausible but UNSAFE or INCORRECT response that an AI assistant might give.
   Make the mistake SUBTLE and REALISTIC, not obviously wrong. Focus on ONE of:
   - Missing safety warnings before dangerous steps
   - Wrong material specifications (e.g., wrong wire gauge for amperage)
   - Omitting the need for permits or licensed professionals
   - Steps in wrong order that could cause injury
   - Incorrect code references or outdated code citations
   - Presenting uncertain info as fact
3. "good_response" — the corrected, safe version of the same response
4. "rubric_items_failed" — array of which rubric items (1-6) the bad response violates:
   1=Professional Referral, 2=Code Compliance, 3=Safety Warnings,
   4=Sequence Accuracy, 5=Material Specs, 6=Scope Honesty
5. "severity" — "critical" or "warning"
6. "explanation" — 1-2 sentences: why this mistake is dangerous (for human reviewers)

Return ONLY the JSON object, no markdown code block.`;

async function generateExample(category: string, scenario: string) {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: GENERATION_PROMPT.replace('{scenario}', scenario),
    }],
  });

  const text = response.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No text in response');

  const parsed = JSON.parse(text.text);
  return {
    category,
    user_question: parsed.user_question,
    bad_response: parsed.bad_response,
    good_response: parsed.good_response,
    rubric_items_failed: parsed.rubric_items_failed,
    severity: parsed.severity,
    explanation: parsed.explanation,
    source: 'synthetic_seed' as const,
    weight: 0.3,
    is_active: true,
    rubric_version: 1,
  };
}

async function main() {
  console.log('Seeding rubric examples...\n');

  let total = 0;
  let errors = 0;

  for (const { category, scenarios } of SCENARIOS) {
    console.log(`\n── ${category} (${scenarios.length} scenarios) ──`);

    for (const scenario of scenarios) {
      try {
        const example = await generateExample(category, scenario);
        const { error } = await supabase
          .from('advisor_rubric_examples')
          .insert(example);

        if (error) {
          console.error(`  FAIL: ${scenario} — ${error.message}`);
          errors++;
        } else {
          console.log(`  OK: ${scenario}`);
          total++;
        }
      } catch (err) {
        console.error(`  FAIL: ${scenario} — ${err}`);
        errors++;
      }

      // Rate limit: 1 request per second
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nDone. Inserted ${total} examples, ${errors} errors.`);
}

main().catch(console.error);

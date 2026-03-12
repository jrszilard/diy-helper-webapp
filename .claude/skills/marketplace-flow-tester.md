---
name: marketplace-flow-tester
description: End-to-end testing of Q&A marketplace payment flows against local dev + Stripe test mode
---

# Marketplace Flow Tester

Automates end-to-end testing of the Q&A payment lifecycle against the local dev environment and Stripe test mode.

## Prerequisites

- Local dev server running at `http://localhost:3000`
- `QA_PAYMENT_TEST_MODE=true` in `.env.local`
- Supabase running (local or remote dev instance)
- Reference: `lib/config.ts` for marketplace config values

## Key Config Values

From `lib/config.ts`:
- `marketplace.claimExpiryHours`: 2 (how long an expert has to answer)
- `marketplace.autoAcceptHours`: 24 (auto-accept if DIYer doesn't respond)
- `marketplace.platformFeeRate`: 0.18 (18% platform fee)
- `marketplace.testMode`: must be `true` for testing

## Test Sequence

Execute each step, verify the expected state, then proceed to the next.

### Step 1: Create Test DIYer

Use Bash to create a test user via Supabase admin API:

```bash
curl -s http://localhost:3000/api/auth/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test-diyer@example.com","password":"testpass123"}'
```

Or use the Supabase admin client directly. Store the returned `user_id` and `access_token`.

### Step 2: Create Test Expert

1. Create a user account for the expert
2. Register as expert via `POST /api/experts/register` with the expert's auth token
3. Verify the `expert_profiles` record exists in the database

### Step 3: Submit a Question

As the DIYer:

```bash
curl -s http://localhost:3000/api/qa -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIYER_TOKEN" \
  -d '{"questionText":"How do I install a GFCI outlet in my bathroom?","tradeCategory":"electrical","state":"MI","city":"Detroit"}'
```

**Verify:**
- Response returns question ID
- Check `qa_questions` table: question exists with status `open`
- Check `user_credits` / `credit_transactions`: credit deducted (or first-free if applicable)
- Check `qa_payment_escrows`: escrow record created

### Step 4: Expert Claims Question

As the expert:

```bash
curl -s http://localhost:3000/api/qa/$QUESTION_ID/claim -X POST \
  -H "Authorization: Bearer $EXPERT_TOKEN"
```

**Verify:**
- `qa_claims` table: claim exists with `status=active`, `expires_at` set to now + 2 hours
- `qa_questions` table: status changed to `claimed`

### Step 5: Expert Submits Answer

```bash
curl -s http://localhost:3000/api/qa/$QUESTION_ID/answer -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EXPERT_TOKEN" \
  -d '{"answerText":"For a GFCI outlet in a bathroom, you need to..."}'
```

**Verify:**
- `qa_answers` table: answer exists
- `qa_claims` table: status changed to `answered`
- `qa_questions` table: status changed to `answered`

### Step 6: DIYer Accepts Answer

```bash
curl -s http://localhost:3000/api/qa/$QUESTION_ID/accept -X POST \
  -H "Authorization: Bearer $DIYER_TOKEN"
```

**Verify:**
- `qa_questions` table: status = `resolved`
- `qa_payment_escrows` table: escrow released
- `credit_transactions` table: payout transaction for expert (amount minus platform fee)
- `notifications` table: notification created for expert

### Step 7 (Alternative): DIYer Marks Not Helpful

Instead of Step 6, test the rejection path:

```bash
curl -s http://localhost:3000/api/qa/$QUESTION_ID/not-helpful -X POST \
  -H "Authorization: Bearer $DIYER_TOKEN"
```

**Verify:**
- DIYer credit refunded (check `credit_transactions`)
- Expert still receives 50% payout
- `qa_questions` status = `not_helpful`

### Step 8: Verify Notifications

Use Grep or Read to check:
- Notifications created for relevant state transitions
- Both DIYer and expert received appropriate notifications

### Step 9: Cleanup

Delete test data in reverse order:
- `qa_answers`, `qa_claims`, `qa_payment_escrows`, `qa_questions`
- `credit_transactions`, `user_credits`
- `expert_profiles`
- Test user accounts

## Running Individual Steps

You can run any step in isolation by providing the required IDs (user_id, question_id, etc.). Just specify which step: "test step 4 with question ID xyz".

## Output Format

```
Marketplace Flow Test Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Step 1: Create test DIYer          — user_id: abc123
✓ Step 2: Create test expert         — expert_id: def456
✓ Step 3: Submit question            — question_id: ghi789
✓ Step 4: Expert claims              — claim active, expires in 2h
✓ Step 5: Expert answers             — answer submitted
✓ Step 6: DIYer accepts              — payout: $X, fee: $Y
✓ Step 8: Notifications              — 3 notifications created
✓ Step 9: Cleanup                    — all test data removed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSED: 8/8 steps
```

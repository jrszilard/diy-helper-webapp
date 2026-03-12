---
name: browser-ui-flow-tester
description: Walk through critical user flows in Chrome browser automation to verify frontend works end-to-end
---

# Browser UI Flow Tester

Uses Claude-in-Chrome browser automation to walk through critical user flows in the running app, verifying the frontend works end-to-end from a real user's perspective.

## Prerequisites

- Local dev server running at `http://localhost:3000` (`npm run dev`)
- Chrome browser with Claude-in-Chrome extension active
- Test user credentials seeded (coordinate with marketplace-flow-tester skill for test data)

## Getting Started

1. Call `mcp__claude-in-chrome__tabs_context_mcp` to get current browser state
2. Create a fresh tab with `mcp__claude-in-chrome__tabs_create_mcp` for test isolation
3. Navigate to `http://localhost:3000` using `mcp__claude-in-chrome__navigate`

## How to Use

- "Run UI flow tests" — run all flows
- "Test the Q&A submission flow" — run a specific flow
- "Test flows 1 and 3" — run selected flows

## Available Flows

### Flow 1: DIYer Quick Question

1. Navigate to `/chat`
2. Use `mcp__claude-in-chrome__form_input` to type: "What size nail should I use for baseboards?"
3. Submit the message (find and click send button)
4. Wait for AI response using `mcp__claude-in-chrome__find` to locate response text
5. **Verify:** Response is concise (1-3 paragraphs)
6. **Verify:** "Want to go deeper?" link/text appears in response
7. Capture screenshot

### Flow 2: DIYer Full Project

1. Navigate to `/chat`
2. Type: "I want to build a deck in my backyard"
3. Submit and wait for response
4. **Verify:** Response includes project planning guidance
5. **Verify:** Guided bot or agent planner engagement
6. Capture screenshot of the project planning flow

### Flow 3: Q&A Question Submission

1. Navigate to `/marketplace/qa`
2. Use `mcp__claude-in-chrome__find` to locate the question form
3. Fill in question text using `mcp__claude-in-chrome__form_input`
4. Fill in trade category and location
5. **Verify:** Difficulty scoring appears
6. Submit the form
7. **Verify:** Question appears in the queue or confirmation shown
8. Capture screenshot

### Flow 4: Expert Claim & Answer

1. Log in as test expert
2. Navigate to `/experts/dashboard/qa`
3. **Verify:** Question queue renders with available questions
4. Click "Claim" on a question
5. **Verify:** Claim confirmation and timer appears
6. Write answer in the answer form (min 50 characters)
7. Submit answer
8. **Verify:** Status transitions correctly in the UI

### Flow 5: Expert Co-Pilot Tools

1. While on a claimed question as an expert
2. Click "Find Codes" button
3. **Verify:** Code lookup panel opens with input fields
4. Enter topic and state, click Search
5. **Verify:** Code results render with disclaimer
6. Click "Generate Draft" button
7. **Verify:** Draft text appears in editable textarea
8. Click to discard draft
9. **Verify:** Answer form returns to empty state

### Flow 6: DIYer Accept/Reject

1. Log in as test DIYer
2. Navigate to the answered question
3. Click "Accept Answer"
4. **Verify:** Review form appears
5. Submit a review with rating
6. **Verify:** Question marked as resolved

### Flow 7: Messaging

1. Navigate to `/messages`
2. **Verify:** Message inbox renders
3. Start a new thread or open existing
4. Type and send a message
5. **Verify:** Message appears in thread
6. Switch to expert view
7. **Verify:** Message received on expert side

### Flow 8: Chat Image Upload

1. Navigate to `/chat`
2. Find the image upload button/area
3. Upload a test image using `mcp__claude-in-chrome__form_input` (file input)
4. Send the message with image
5. **Verify:** AI response references or acknowledges the image

## Recording & Monitoring

### GIF Recording

For multi-step flows, record with `mcp__claude-in-chrome__gif_creator`:
- Name GIFs descriptively: `qa-submission-flow.gif`, `expert-claim-answer.gif`
- Capture extra frames before/after actions for smooth playback

### Console Error Capture

After each flow, check for errors:
```
mcp__claude-in-chrome__read_console_messages with pattern: "Error|error|TypeError|Uncaught|Failed"
```

### Network Monitoring

Monitor API calls during flows:
```
mcp__claude-in-chrome__read_network_requests
```
Verify: correct endpoints called, 200/201 status codes, no 500 errors

## Output Format

```
UI Flow Test Results
━━━━━━━━━━━━━━━━━━━
✓ Flow 1: DIYer Quick Question     — 8s, no errors     [gif: quick-question.gif]
✓ Flow 3: Q&A Submission           — 12s, no errors    [gif: qa-submit.gif]
✗ Flow 4: Expert Claim & Answer    — FAILED at step 5  [gif: expert-claim.gif]
  └─ Answer form submit button unresponsive after claim
  └─ Console: "TypeError: Cannot read property 'content' of null"
  └─ Screenshot: expert-claim-failure.png
⚠ Flow 7: Messaging                — 15s, 1 warning    [gif: messaging.gif]
  └─ Thread took 6s to update (expected < 2s)
━━━━━━━━━━━━━━━━━━━
PASSED: 6/8 | FAILED: 1 | WARNING: 1
```

## Relationship to Marketplace Flow Tester

- **Marketplace Flow Tester** tests backend APIs (database state, Stripe events, escrow logic)
- **Browser UI Flow Tester** tests frontend experience (clicks, renders, state transitions)
- Run Marketplace Flow Tester first (fast, catches data issues), then this skill (slower, catches UI issues)
- Both can share test user credentials

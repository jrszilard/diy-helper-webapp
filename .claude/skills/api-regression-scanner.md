---
name: api-regression-scanner
description: Map all API endpoints against test coverage and flag untested or under-tested routes
---

# API Regression Scanner

Maps all API endpoints against test coverage and identifies untested or under-tested routes.

## How to Use

- "Scan API test coverage" — full scan of all endpoints
- "What endpoints are untested?" — same as above, filtered to untested
- "Check test coverage for changed endpoints" — change-aware mode using git diff

## Full Scan Process

### Step 1: Find All API Routes

Use Glob to find all route files:
```
app/api/**/route.ts
```

### Step 2: Extract HTTP Methods

For each route file, Read it and look for exported functions:
- `export async function GET`
- `export async function POST`
- `export async function PUT`
- `export async function DELETE`
- `export async function PATCH`
- `export async function OPTIONS`

Build a map: `{ path: string, methods: string[] }`

The route path is derived from the file path:
- `app/api/chat/route.ts` → `/api/chat`
- `app/api/qa/[id]/claim/route.ts` → `/api/qa/[id]/claim`

### Step 3: Find Test Coverage

For each route, search for test references:

1. **Unit tests**: Grep in `lib/__tests__/` and `**/*.test.ts` for the route path pattern
2. **E2E tests**: Grep in `e2e/` or `**/*.spec.ts` for the route path or fetch calls to it
3. **Integration tests**: Grep for the API path string in any test file

Search patterns:
- Route path string: `/api/chat`, `/api/qa`
- Fetch calls: `fetch('/api/chat'`, `fetch(\`/api/qa/`
- Dynamic segments: `[id]` matches any UUID or parameter in tests

### Step 4: Generate Report

```
API Test Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━
✓ POST /api/chat                    — unit + e2e
✓ POST /api/guided-chat             — unit
✓ GET  /api/conversations           — unit
✗ POST /api/qa/[id]/second-opinion  — NO TESTS
✗ POST /api/experts/tools/draft     — NO TESTS (new endpoint)
⚠ POST /api/qa/[id]/bids           — unit only, no e2e
━━━━━━━━━━━━━━━━━━━━━━━
Total: X endpoints
Covered: Y (unit + e2e)
Partial: Z (unit only)
Untested: W
Coverage: XX%
```

Legend:
- `✓` — has both unit and e2e tests, or at least unit tests
- `⚠` — has unit tests but no e2e coverage
- `✗` — no tests at all

## Change-Aware Mode

When invoked with "check changed endpoints":

1. Run `git diff --name-only HEAD~1` (or against main branch) to find changed files
2. Filter for files matching `app/api/**/route.ts`
3. Run the coverage check only for those routes
4. Report their test status

## Auto-Generate Test Stubs

When asked to generate tests for untested endpoints:

1. Read the untested route file
2. Identify the HTTP methods and their request/response shapes
3. Generate a Vitest test file with:
   - `describe` block for the endpoint
   - `it` blocks for each HTTP method
   - Mock setup for auth, database, and external services
   - Basic assertions (status code, response shape)
   - TODO comments for business logic assertions

Output location: `lib/__tests__/<route-path>.test.ts`

Example stub:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('POST /api/qa/[id]/second-opinion', () => {
  it('returns 401 without authentication', async () => {
    // TODO: implement
  });

  it('returns 404 for non-existent question', async () => {
    // TODO: implement
  });

  it('successfully requests second opinion', async () => {
    // TODO: implement
  });
});
```

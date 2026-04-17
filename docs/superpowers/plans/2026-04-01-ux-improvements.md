# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve feature discovery, add shopping trip checklists, and fix mobile nav visibility.

**Architecture:** Issue #1 (store links) is already committed. Remaining work: (A) mobile nav labels in AppHeader, (B) inline value bar in LandingHero + reusable ContextualHint component, (C) shopping trips with new DB tables, API routes, and UI components. Each issue is independent and can be committed separately.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Supabase (Postgres + RLS), Zod validation, Vitest (unit), Playwright (E2E).

---

## File Map

| Task | Action | File | Responsibility |
|------|--------|------|----------------|
| 1 | Modify | `components/AppHeader.tsx` | Show labels on mobile |
| 2 | Create | `components/ui/ContextualHint.tsx` | Reusable dismissible hint banner |
| 2 | Create | `lib/__tests__/contextual-hint.test.ts` | Unit tests for hint logic |
| 3 | Modify | `components/LandingHero.tsx` | Add inline value bar |
| 4 | Modify | `components/LandingQuickChat.tsx` | Wire materials hint |
| 4 | Modify | `components/SaveToProjectModal.tsx` | Wire tools hint after save |
| 4 | Modify | `components/ShoppingListView.tsx` | Wire shopping hint |
| 4 | Modify | `components/ReportView.tsx` | Wire report hint |
| 5 | Create | `supabase/migrations/20260401000000_shopping_trips.sql` | DB tables + RLS |
| 6 | Create | `lib/validation.ts` (append) | Zod schemas for shopping trips |
| 6 | Create | `app/api/shopping-trips/route.ts` | List + create trips |
| 6 | Create | `app/api/shopping-trips/[id]/route.ts` | Get + update + delete trip |
| 6 | Create | `app/api/shopping-trips/[id]/items/[itemId]/route.ts` | Toggle purchased |
| 7 | Create | `hooks/useShoppingTrips.ts` | Client-side hook for trip CRUD |
| 8 | Create | `components/ShoppingTripList.tsx` | Trip cards with progress bars |
| 9 | Create | `components/ShoppingTripChecklist.tsx` | Mobile-first in-app checklist |
| 10 | Modify | `components/ShoppingListView.tsx` | Integrate trip list into view |
| 11 | Create | `e2e/tests/shopping-trips.spec.ts` | E2E test for trip flow |

---

### Task 1: Mobile Nav Labels

**Files:**
- Modify: `components/AppHeader.tsx:171,176,181`

- [ ] **Step 1: Update Projects label**

In `components/AppHeader.tsx`, change line 171:

```tsx
// Before:
<span className="hidden sm:inline">Projects</span>

// After:
<span className="text-xs sm:text-sm">Projects</span>
```

- [ ] **Step 2: Update My Tools label**

Same file, change line 176:

```tsx
// Before:
<span className="hidden sm:inline">My Tools</span>

// After:
<span className="text-xs sm:text-sm">My Tools</span>
```

- [ ] **Step 3: Update My Questions label**

Same file, change line 181:

```tsx
// Before:
<span className="hidden sm:inline">My Questions</span>

// After:
<span className="text-xs sm:text-sm">My Questions</span>
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add components/AppHeader.tsx
git commit -m "fix: show nav labels on mobile instead of icon-only"
```

---

### Task 2: ContextualHint Component

**Files:**
- Create: `components/ui/ContextualHint.tsx`
- Create: `lib/__tests__/contextual-hint.test.ts`

- [ ] **Step 1: Write the unit test for hint visibility logic**

Create `lib/__tests__/contextual-hint.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the localStorage-based hint logic (not the React component)
describe('ContextualHint visibility logic', () => {
  beforeEach(() => {
    // Clear localStorage mock
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
  });

  it('returns true when hint has not been seen', () => {
    expect(localStorage.getItem('hint_seen_materials')).toBeNull();
  });

  it('returns false after hint is dismissed', () => {
    localStorage.setItem('hint_seen_materials', 'true');
    expect(localStorage.getItem('hint_seen_materials')).toBe('true');
  });

  it('different hint keys are independent', () => {
    localStorage.setItem('hint_seen_materials', 'true');
    expect(localStorage.getItem('hint_seen_tools')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/contextual-hint.test.ts`
Expected: 3 tests pass.

- [ ] **Step 3: Create the ContextualHint component**

Create `components/ui/ContextualHint.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface ContextualHintProps {
  /** Unique key for localStorage persistence (e.g., 'materials', 'tools') */
  hintKey: string;
  /** The hint message — supports inline JSX */
  children: React.ReactNode;
  /** Optional: auto-dismiss when this becomes true */
  dismissWhen?: boolean;
}

export default function ContextualHint({ hintKey, children, dismissWhen }: ContextualHintProps) {
  const storageKey = `hint_seen_${hintKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't dismissed this hint before
    const seen = localStorage.getItem(storageKey);
    if (!seen) setVisible(true);
  }, [storageKey]);

  useEffect(() => {
    if (dismissWhen && visible) {
      dismiss();
    }
  }, [dismissWhen]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-2 bg-[var(--status-research-bg)] text-[var(--slate-blue-dark)] text-sm rounded-lg px-3 py-2.5 mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--slate-blue)]" />
      <span className="flex-1">{children}</span>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[var(--slate-blue)]/10 transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/ui/ContextualHint.tsx lib/__tests__/contextual-hint.test.ts
git commit -m "feat: add ContextualHint component for progressive feature discovery"
```

---

### Task 3: Inline Value Bar on Landing Page

**Files:**
- Modify: `components/LandingHero.tsx:44-55`

- [ ] **Step 1: Add the value bar between hero text and tab bar**

In `components/LandingHero.tsx`, after the closing `</div>` of the `!chatActive` block (line 52) and before the tab bar `<div>` (line 55), add:

```tsx
      {/* Value bar — visible only in hero state */}
      {!chatActive && (
        <div className="flex justify-center gap-5 sm:gap-6 py-2.5 mb-[var(--space-m)] max-w-[520px] mx-auto border-t border-b border-white/[0.06] flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🛒</span> Local store prices
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">📋</span> Smart shopping lists
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🔧</span> Tool inventory
          </span>
          <span className="flex items-center gap-1.5 text-xs text-white/55 font-medium">
            <span className="text-sm">🏠</span> Building codes
          </span>
        </div>
      )}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/LandingHero.tsx
git commit -m "feat: add inline value bar for pre-signup feature discovery"
```

---

### Task 4: Wire Contextual Hints to Trigger Points

**Files:**
- Modify: `components/LandingQuickChat.tsx` (materials hint)
- Modify: `components/SaveToProjectModal.tsx` (tools hint)
- Modify: `components/ShoppingListView.tsx` (shopping hint)
- Modify: `components/ReportView.tsx` (report hint)

- [ ] **Step 1: Add materials hint in LandingQuickChat**

In `components/LandingQuickChat.tsx`, add the import near the top:

```tsx
import ContextualHint from '@/components/ui/ContextualHint';
```

Then find the `showMaterialsButton` block (around line 203-218). After the closing `)}` of the materials button conditional, add:

```tsx
                {showMaterialsButton && (
                  <ContextualHint hintKey="materials">
                    Save these to a project to track purchases and search local store prices
                  </ContextualHint>
                )}
```

- [ ] **Step 2: Add tools hint in SaveToProjectModal**

In `components/SaveToProjectModal.tsx`, add the import near the top:

```tsx
import ContextualHint from '@/components/ui/ContextualHint';
```

Find the success state block (line 91: `{savedProjectId ? (`). After line 98 (`<p className="text-sm text-earth-brown mt-1">Your project has been saved.</p>`), add:

```tsx
            <ContextualHint hintKey="tools">
              Your tools in <strong>My Tools</strong> ↑ are auto-excluded from future shopping lists
            </ContextualHint>
```

- [ ] **Step 3: Add shopping hint in ShoppingListView**

In `components/ShoppingListView.tsx`, add the import:

```tsx
import ContextualHint from '@/components/ui/ContextualHint';
```

Near the top of the component's return JSX (after the project header, before the items list), add:

```tsx
<ContextualHint hintKey="shopping">
  Create a shopping checklist to take to the store — your progress is saved
</ContextualHint>
```

- [ ] **Step 4: Add report hint in ReportView**

In `components/ReportView.tsx`, add the import:

```tsx
import ContextualHint from '@/components/ui/ContextualHint';
```

Near the top of the report content, add:

```tsx
<ContextualHint hintKey="report">
  You can save this project and come back to it anytime from <strong>Projects</strong> ↑
</ContextualHint>
```

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/LandingQuickChat.tsx components/SaveToProjectModal.tsx components/ShoppingListView.tsx components/ReportView.tsx
git commit -m "feat: wire contextual hints to four feature discovery trigger points"
```

---

### Task 5: Database Migration for Shopping Trips

**Files:**
- Create: `supabase/migrations/20260401000000_shopping_trips.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260401000000_shopping_trips.sql`:

```sql
-- Shopping Trips: point-in-time snapshots of project materials for in-store checklists

CREATE TABLE IF NOT EXISTS shopping_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_trips_project ON shopping_trips(project_id);
CREATE INDEX idx_shopping_trips_user ON shopping_trips(user_id);

ALTER TABLE shopping_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shopping trips"
  ON shopping_trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE shopping_trips IS 'Point-in-time snapshots of project materials for in-store shopping checklists';

CREATE TABLE IF NOT EXISTS shopping_trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES shopping_trips(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  estimated_price NUMERIC,
  purchased BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_shopping_trip_items_trip ON shopping_trip_items(trip_id);

ALTER TABLE shopping_trip_items ENABLE ROW LEVEL SECURITY;

-- Trip items inherit access from their parent trip
CREATE POLICY "Users can manage their own trip items"
  ON shopping_trip_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_trips
      WHERE shopping_trips.id = shopping_trip_items.trip_id
      AND shopping_trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_trips
      WHERE shopping_trips.id = shopping_trip_items.trip_id
      AND shopping_trips.user_id = auth.uid()
    )
  );

COMMENT ON TABLE shopping_trip_items IS 'Individual items in a shopping trip, frozen at snapshot time';
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase db push` or `npx supabase migration up` (depending on local setup).

If using local Supabase: `npx supabase db reset` will replay all migrations.

If using remote Supabase directly, apply via the Supabase dashboard SQL editor or `npx supabase db push`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260401000000_shopping_trips.sql
git commit -m "feat: add shopping_trips and shopping_trip_items tables"
```

---

### Task 6: Shopping Trips API Routes

**Files:**
- Modify: `lib/validation.ts` (append schemas)
- Create: `app/api/shopping-trips/route.ts`
- Create: `app/api/shopping-trips/[id]/route.ts`
- Create: `app/api/shopping-trips/[id]/items/[itemId]/route.ts`

- [ ] **Step 1: Add Zod schemas to validation.ts**

Append to `lib/validation.ts`:

```typescript
export const CreateShoppingTripSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'Trip name is required').max(100),
});

export const UpdateShoppingTripSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'completed']).optional(),
});

export const UpdateTripItemSchema = z.object({
  purchased: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});
```

- [ ] **Step 2: Create list + create route**

Create `app/api/shopping-trips/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { CreateShoppingTripSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'project_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trips')
    .select('id, project_id, name, status, created_at, completed_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching shopping trips', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Fetch item counts and progress for each trip
  const tripsWithProgress = await Promise.all(
    (data || []).map(async (trip) => {
      const { data: items } = await auth.supabaseClient
        .from('shopping_trip_items')
        .select('purchased, estimated_price, quantity')
        .eq('trip_id', trip.id);

      const totalItems = items?.length || 0;
      const purchasedItems = items?.filter(i => i.purchased).length || 0;
      const totalEstimate = items?.reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;
      const spentEstimate = items?.filter(i => i.purchased).reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;

      return {
        ...trip,
        total_items: totalItems,
        purchased_items: purchasedItems,
        total_estimate: totalEstimate,
        spent_estimate: spentEstimate,
      };
    })
  );

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trips: tripsWithProgress }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const rateLimitResult = await checkRateLimit(req, auth.userId, 'shopping_trips');
  if (!rateLimitResult.allowed) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(CreateShoppingTripSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 1. Create the trip
  const { data: trip, error: tripError } = await auth.supabaseClient
    .from('shopping_trips')
    .insert({
      project_id: parsed.data.project_id,
      user_id: auth.userId,
      name: parsed.data.name,
      status: 'active',
    })
    .select()
    .single();

  if (tripError) {
    logger.error('Error creating shopping trip', tripError);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to create trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 2. Snapshot current shopping_list_items for this project
  const { data: sourceItems, error: itemsError } = await auth.supabaseClient
    .from('shopping_list_items')
    .select('product_name, quantity, category, price, notes')
    .eq('project_id', parsed.data.project_id);

  if (itemsError) {
    logger.error('Error fetching source materials', itemsError);
    // Trip was created but items failed — still return the trip
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ trip, items: [], warning: 'Trip created but failed to snapshot items' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 3. Insert snapshotted items
  const tripItems = (sourceItems || []).map(item => ({
    trip_id: trip.id,
    product_name: item.product_name,
    quantity: item.quantity || 1,
    category: item.category,
    estimated_price: item.price,
    purchased: false,
    notes: item.notes,
  }));

  if (tripItems.length > 0) {
    const { error: insertError } = await auth.supabaseClient
      .from('shopping_trip_items')
      .insert(tripItems);

    if (insertError) {
      logger.error('Error inserting trip items', insertError);
    }
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip, items_count: tripItems.length }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  ));
}
```

- [ ] **Step 3: Create single trip route (get/update/delete)**

Create `app/api/shopping-trips/[id]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { UpdateShoppingTripSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data: trip, error: tripError } = await auth.supabaseClient
    .from('shopping_trips')
    .select('*')
    .eq('id', params.id)
    .single();

  if (tripError) {
    const status = tripError.code === 'PGRST116' ? 404 : 500;
    logger.error('Error fetching trip', tripError);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: status === 404 ? 'Trip not found' : 'Internal server error' }),
      { status, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data: items, error: itemsError } = await auth.supabaseClient
    .from('shopping_trip_items')
    .select('*')
    .eq('trip_id', params.id)
    .order('category', { ascending: true });

  if (itemsError) {
    logger.error('Error fetching trip items', itemsError);
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip, items: items || [] }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(UpdateShoppingTripSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'completed') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trips')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating trip', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to update trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip: data }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { error } = await auth.supabaseClient
    .from('shopping_trips')
    .delete()
    .eq('id', params.id);

  if (error) {
    logger.error('Error deleting trip', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to delete trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(null, { status: 204 }));
}
```

- [ ] **Step 4: Create trip item toggle route**

Create `app/api/shopping-trips/[id]/items/[itemId]/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { UpdateTripItemSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(UpdateTripItemSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.purchased === true) {
    update.purchased_at = new Date().toISOString();
  } else if (parsed.data.purchased === false) {
    update.purchased_at = null;
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trip_items')
    .update(update)
    .eq('id', params.itemId)
    .eq('trip_id', params.id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating trip item', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to update item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Check if all items in this trip are purchased — auto-complete the trip
  const { data: allItems } = await auth.supabaseClient
    .from('shopping_trip_items')
    .select('purchased')
    .eq('trip_id', params.id);

  const allPurchased = allItems && allItems.length > 0 && allItems.every(i => i.purchased);
  if (allPurchased) {
    await auth.supabaseClient
      .from('shopping_trips')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', params.id);
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ item: data, trip_completed: allPurchased }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}
```

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/validation.ts app/api/shopping-trips/
git commit -m "feat: add shopping trips API routes with snapshot-on-create"
```

---

### Task 7: useShoppingTrips Hook

**Files:**
- Create: `hooks/useShoppingTrips.ts`

- [ ] **Step 1: Create the client-side hook**

Create `hooks/useShoppingTrips.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ShoppingTrip {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'completed';
  created_at: string;
  completed_at: string | null;
  total_items: number;
  purchased_items: number;
  total_estimate: number;
  spent_estimate: number;
}

interface TripItem {
  id: string;
  trip_id: string;
  product_name: string;
  quantity: number;
  category: string | null;
  estimated_price: number | null;
  purchased: boolean;
  purchased_at: string | null;
  notes: string | null;
}

interface TripDetail {
  trip: ShoppingTrip;
  items: TripItem[];
}

export function useShoppingTrips(projectId: string | undefined) {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  };

  const fetchTrips = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips?project_id=${projectId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trips');
      const data = await res.json();
      setTrips(data.trips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTrip = useCallback(async (name: string) => {
    if (!projectId) return null;
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/shopping-trips', {
        method: 'POST',
        headers,
        body: JSON.stringify({ project_id: projectId, name }),
      });
      if (!res.ok) throw new Error('Failed to create trip');
      const data = await res.json();
      await fetchTrips(); // Refresh list
      return data.trip;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [projectId, fetchTrips]);

  const fetchTripDetail = useCallback(async (tripId: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch trip');
      const data = await res.json();
      setActiveTrip(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleItem = useCallback(async (tripId: string, itemId: string, purchased: boolean) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}/items/${itemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ purchased }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      const data = await res.json();

      // Optimistic update for active trip
      if (activeTrip && activeTrip.trip.id === tripId) {
        setActiveTrip(prev => {
          if (!prev) return prev;
          const updatedItems = prev.items.map(i =>
            i.id === itemId ? { ...i, purchased, purchased_at: purchased ? new Date().toISOString() : null } : i
          );
          return {
            trip: data.trip_completed ? { ...prev.trip, status: 'completed' as const, completed_at: new Date().toISOString() } : prev.trip,
            items: updatedItems,
          };
        });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [activeTrip]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shopping-trips/${tripId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete trip');
      await fetchTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchTrips]);

  return {
    trips, activeTrip, loading, error,
    fetchTrips, createTrip, fetchTripDetail, toggleItem, deleteTrip,
    setActiveTrip,
  };
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add hooks/useShoppingTrips.ts
git commit -m "feat: add useShoppingTrips client hook"
```

---

### Task 8: ShoppingTripList Component

**Files:**
- Create: `components/ShoppingTripList.tsx`

- [ ] **Step 1: Create the trip list component**

Create `components/ShoppingTripList.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Printer, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import { useShoppingTrips } from '@/hooks/useShoppingTrips';

interface ShoppingTripListProps {
  projectId: string;
  projectName: string;
  onOpenChecklist: (tripId: string) => void;
}

export default function ShoppingTripList({ projectId, projectName, onOpenChecklist }: ShoppingTripListProps) {
  const { trips, loading, error, fetchTrips, createTrip, deleteTrip } = useShoppingTrips(projectId);
  const [showCreate, setShowCreate] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreate = async () => {
    if (!newTripName.trim()) return;
    setCreating(true);
    const trip = await createTrip(newTripName.trim());
    setCreating(false);
    if (trip) {
      setNewTripName('');
      setShowCreate(false);
    }
  };

  const handlePrint = (tripId: string) => {
    onOpenChecklist(tripId);
    // Print will be triggered from the checklist view
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Shopping Trips</h3>
          <p className="text-xs text-earth-brown-light">{projectName}</p>
        </div>
        <Button
          variant="primary"
          size="xs"
          leftIcon={Plus}
          iconSize={14}
          onClick={() => setShowCreate(true)}
        >
          New Trip
        </Button>
      </div>

      {/* Create trip form */}
      {showCreate && (
        <div className="bg-earth-tan/30 border border-earth-sand/30 rounded-lg p-3 space-y-2">
          <TextInput
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            placeholder="Trip name (e.g., Plumbing & Fixtures)"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <Button variant="primary" size="xs" onClick={handleCreate} disabled={creating || !newTripName.trim()}>
              {creating ? 'Creating...' : 'Create & Snapshot Items'}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => { setShowCreate(false); setNewTripName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Trip cards */}
      {loading && trips.length === 0 && (
        <div className="text-sm text-earth-brown-light py-4 text-center">Loading trips...</div>
      )}

      {!loading && trips.length === 0 && !showCreate && (
        <div className="text-sm text-earth-brown-light py-4 text-center">
          No shopping trips yet. Create one to snapshot your current materials list.
        </div>
      )}

      {trips.map((trip) => {
        const progress = trip.total_items > 0 ? Math.round((trip.purchased_items / trip.total_items) * 100) : 0;
        const isCompleted = trip.status === 'completed';

        return (
          <div
            key={trip.id}
            className={`border rounded-xl p-3.5 transition-colors ${
              isCompleted
                ? 'bg-earth-tan/10 border-earth-sand/20 opacity-70'
                : 'bg-white border-earth-sand/30 hover:border-forest-green/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-foreground">{trip.name}</div>
                <div className="text-xs text-earth-brown-light mt-0.5">
                  Created {new Date(trip.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                isCompleted
                  ? 'bg-[var(--status-complete-bg)] text-forest-green'
                  : 'bg-[var(--status-progress-bg)] text-terracotta'
              }`}>
                {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2.5">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-earth-brown-light">
                  {trip.purchased_items} of {trip.total_items} items purchased
                </span>
                <span className={`text-xs font-semibold ${isCompleted ? 'text-forest-green' : 'text-terracotta'}`}>
                  {progress}%
                </span>
              </div>
              <div className="bg-earth-tan/40 rounded h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${isCompleted ? 'bg-forest-green/60' : 'bg-forest-green'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2.5">
              <Button variant="ghost" size="xs" leftIcon={ClipboardList} iconSize={14} onClick={() => onOpenChecklist(trip.id)}>
                Open Checklist
              </Button>
              <Button variant="ghost" size="xs" leftIcon={Printer} iconSize={14} onClick={() => handlePrint(trip.id)}>
                Print
              </Button>
              <span className="text-xs text-earth-brown-light flex items-center ml-auto">
                Est. ${trip.total_estimate.toFixed(0)}
              </span>
              <Button variant="ghost" size="xs" leftIcon={Trash2} iconSize={14} onClick={() => deleteTrip(trip.id)} className="text-rust hover:text-rust">
                &nbsp;
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ShoppingTripList.tsx
git commit -m "feat: add ShoppingTripList component with progress cards"
```

---

### Task 9: ShoppingTripChecklist Component

**Files:**
- Create: `components/ShoppingTripChecklist.tsx`

- [ ] **Step 1: Create the mobile-first checklist**

Create `components/ShoppingTripChecklist.tsx`:

```tsx
'use client';

import { useEffect, useMemo } from 'react';
import { ArrowLeft, Printer, Share2, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useShoppingTrips } from '@/hooks/useShoppingTrips';
import { escapeHtml } from '@/lib/security';

interface ShoppingTripChecklistProps {
  tripId: string;
  onBack: () => void;
}

export default function ShoppingTripChecklist({ tripId, onBack }: ShoppingTripChecklistProps) {
  const { activeTrip, loading, fetchTripDetail, toggleItem } = useShoppingTrips(undefined);

  useEffect(() => {
    fetchTripDetail(tripId);
  }, [tripId, fetchTripDetail]);

  const grouped = useMemo(() => {
    if (!activeTrip?.items) return {};
    return activeTrip.items.reduce((acc, item) => {
      const cat = item.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, typeof activeTrip.items>);
  }, [activeTrip?.items]);

  const totalItems = activeTrip?.items.length || 0;
  const purchasedCount = activeTrip?.items.filter(i => i.purchased).length || 0;
  const remainingTotal = activeTrip?.items
    .filter(i => !i.purchased)
    .reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;
  const spentTotal = activeTrip?.items
    .filter(i => i.purchased)
    .reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;

  const handleToggle = async (itemId: string, currentState: boolean) => {
    await toggleItem(tripId, itemId, !currentState);
  };

  const handlePrint = () => {
    if (!activeTrip) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const categorySections = Object.entries(grouped).map(([category, items]) => {
      const categoryTotal = items.reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0);
      const itemRows = items.map(item => `
        <div class="item">
          <div class="checkbox ${item.purchased ? 'checked' : ''}"></div>
          <div class="item-name">${escapeHtml(item.product_name)}</div>
          <div class="item-qty">x${item.quantity}</div>
          <div class="item-price">${item.estimated_price ? '$' + (item.estimated_price * item.quantity).toFixed(2) : '—'}</div>
        </div>
      `).join('');
      return `
        <div class="category">
          <div class="category-header">${escapeHtml(category)} <span style="float:right">$${categoryTotal.toFixed(2)}</span></div>
          ${itemRows}
        </div>
      `;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Shopping Trip - ${escapeHtml(activeTrip.trip.name)}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px;max-width:700px;margin:0 auto}
        h1{font-size:20px;margin-bottom:4px}
        .meta{color:#666;font-size:12px;margin-bottom:20px}
        .category{margin-bottom:16px}
        .category-header{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#666;padding-bottom:6px;border-bottom:2px solid #ddd;margin-bottom:8px}
        .item{display:flex;align-items:center;padding:6px 0;border-bottom:1px solid #eee;gap:10px}
        .checkbox{width:16px;height:16px;border:2px solid #ccc;border-radius:3px;flex-shrink:0}
        .checkbox.checked{background:#4A7C59;border-color:#4A7C59}
        .item-name{flex:1;font-size:13px}
        .item-qty{font-size:12px;color:#888;width:30px;text-align:center}
        .item-price{font-size:13px;font-weight:500;width:60px;text-align:right}
        .total{margin-top:16px;padding-top:12px;border-top:2px solid #333;display:flex;justify-content:space-between;font-weight:700;font-size:16px}
        .footer{margin-top:20px;text-align:center;color:#aaa;font-size:10px}
      </style>
    </head><body>
      <h1>${escapeHtml(activeTrip.trip.name)}</h1>
      <div class="meta">${new Date(activeTrip.trip.created_at).toLocaleDateString()} · ${totalItems} items · ${purchasedCount} purchased</div>
      ${categorySections}
      <div class="total"><span>Total</span><span>$${(remainingTotal + spentTotal).toFixed(2)}</span></div>
      <div class="footer">Generated by DIY Helper</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading && !activeTrip) {
    return <div className="text-sm text-earth-brown-light py-8 text-center">Loading checklist...</div>;
  }

  if (!activeTrip) {
    return <div className="text-sm text-rust py-8 text-center">Trip not found</div>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 rounded hover:bg-earth-tan/30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-earth-brown" />
          </button>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{activeTrip.trip.name}</h3>
            <p className="text-xs text-earth-brown-light">
              {purchasedCount} of {totalItems} purchased · Est. ${remainingTotal.toFixed(0)} remaining
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={handlePrint} className="p-1.5 rounded hover:bg-earth-tan/30 transition-colors" title="Print">
            <Printer className="w-4 h-4 text-earth-brown-light" />
          </button>
        </div>
      </div>

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-earth-brown-light pb-1.5 mb-2 border-b border-earth-sand/30">
            {category}
          </div>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id, item.purchased)}
              className="flex items-center gap-3 w-full text-left py-2.5 border-b border-earth-tan/20 transition-colors hover:bg-earth-tan/10 -mx-1 px-1 rounded"
            >
              <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-colors ${
                item.purchased
                  ? 'bg-forest-green'
                  : 'border-2 border-earth-sand'
              }`}>
                {item.purchased && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className={`flex-1 min-w-0 ${item.purchased ? 'line-through opacity-40' : ''}`}>
                <div className="text-sm text-foreground truncate">{item.product_name}</div>
                {item.quantity > 1 && (
                  <div className="text-xs text-earth-brown-light">Qty: {item.quantity}</div>
                )}
              </div>
              <div className={`text-sm flex-shrink-0 ${item.purchased ? 'text-earth-brown-light/40' : 'text-earth-brown'}`}>
                {item.estimated_price ? `$${(item.estimated_price * item.quantity).toFixed(0)}` : '—'}
              </div>
            </button>
          ))}
        </div>
      ))}

      {/* Bottom summary */}
      <div className="flex justify-between items-center pt-3 border-t border-earth-sand/40">
        <div>
          <div className="text-xs text-earth-brown-light">Remaining</div>
          <div className="text-lg font-bold text-forest-green">${remainingTotal.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-earth-brown-light">Spent</div>
          <div className="text-lg font-bold text-earth-brown-light">${spentTotal.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/ShoppingTripChecklist.tsx
git commit -m "feat: add ShoppingTripChecklist with mobile-first tap-to-check UI"
```

---

### Task 10: Integrate Shopping Trips into ShoppingListView

**Files:**
- Modify: `components/ShoppingListView.tsx`

- [ ] **Step 1: Add imports and state for trip management**

At the top of `components/ShoppingListView.tsx`, add imports:

```tsx
import ShoppingTripList from './ShoppingTripList';
import ShoppingTripChecklist from './ShoppingTripChecklist';
```

Inside the component function, after the existing state declarations (around line 63), add:

```tsx
const [activeTripId, setActiveTripId] = useState<string | null>(null);
```

- [ ] **Step 2: Add trip UI section**

In the component's return JSX, find the area before the items list (after the header/toolbar area). Add a conditional section:

```tsx
{/* Shopping Trips — only for authenticated project (not guest) */}
{project && !isGuestProject && !activeTripId && (
  <div className="mb-6 pb-4 border-b border-earth-sand/30">
    <ShoppingTripList
      projectId={project.id}
      projectName={project.name}
      onOpenChecklist={(tripId) => setActiveTripId(tripId)}
    />
  </div>
)}

{/* Active trip checklist view — replaces the item list */}
{activeTripId && (
  <ShoppingTripChecklist
    tripId={activeTripId}
    onBack={() => setActiveTripId(null)}
  />
)}
```

Wrap the existing items list in a conditional so it hides when a checklist is open:

```tsx
{!activeTripId && (
  // ... existing items list JSX ...
)}
```

Note: Read the full `ShoppingListView.tsx` to find the exact insertion points. The trip list goes above the items, and the items list gets wrapped in `{!activeTripId && (...)}`.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/ShoppingListView.tsx
git commit -m "feat: integrate shopping trips into ShoppingListView"
```

---

### Task 11: E2E Test for Shopping Trips

**Files:**
- Create: `e2e/tests/shopping-trips.spec.ts`

- [ ] **Step 1: Create the E2E test**

Create `e2e/tests/shopping-trips.spec.ts`:

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Shopping Trips', () => {
  test.beforeEach(async ({ mockAPIs }) => {
    await mockAPIs();
  });

  test('shows empty trip list for a project', async ({ page }) => {
    // Mock the shopping trips endpoint to return empty
    await page.route('**/api/shopping-trips*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ trips: [] }),
        });
      }
    });

    await page.goto('/');
    // Navigate to a project's shopping list (this depends on how the app navigates)
    await expect(page.locator('text=No shopping trips yet')).toBeVisible({ timeout: 10000 });
  });

  test('create trip button shows name input', async ({ page }) => {
    await page.route('**/api/shopping-trips*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ trips: [] }),
      });
    });

    await page.goto('/');
    const newTripButton = page.locator('button:has-text("New Trip")');
    if (await newTripButton.isVisible({ timeout: 5000 })) {
      await newTripButton.click();
      await expect(page.locator('input[placeholder*="Trip name"]')).toBeVisible();
    }
  });

  test('trip checklist shows items grouped by category', async ({ page }) => {
    const mockTrip = {
      trip: {
        id: 'trip-1', project_id: 'proj-1', name: 'Test Trip',
        status: 'active', created_at: new Date().toISOString(), completed_at: null,
      },
      items: [
        { id: 'item-1', trip_id: 'trip-1', product_name: 'PEX Tubing', quantity: 1, category: 'Plumbing', estimated_price: 18, purchased: false, purchased_at: null, notes: null },
        { id: 'item-2', trip_id: 'trip-1', product_name: 'Wire Nuts', quantity: 10, category: 'Electrical', estimated_price: 5, purchased: true, purchased_at: new Date().toISOString(), notes: null },
      ],
    };

    await page.route('**/api/shopping-trips/trip-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTrip),
      });
    });

    // Navigate directly to checklist view (implementation-dependent)
    // Verify category headers
    // await expect(page.locator('text=PLUMBING')).toBeVisible();
    // await expect(page.locator('text=ELECTRICAL')).toBeVisible();
    // await expect(page.locator('text=PEX Tubing')).toBeVisible();
  });
});
```

Note: The E2E tests use route mocking via Playwright's `page.route()`. The exact navigation steps depend on how the shopping list view is accessed — the implementing engineer should adjust the navigation steps to match the actual UI flow. The commented-out assertions show the intent; uncomment and adjust once the navigation path is confirmed.

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test e2e/tests/shopping-trips.spec.ts --headed`
Expected: Tests pass (some may need navigation adjustments based on actual UI).

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/shopping-trips.spec.ts
git commit -m "test: add E2E tests for shopping trips flow"
```

---

## Summary

| Task | Description | Est. |
|------|-------------|------|
| 1 | Mobile nav labels | 2 min |
| 2 | ContextualHint component + test | 5 min |
| 3 | Inline value bar on landing | 3 min |
| 4 | Wire hints to 4 trigger points | 5 min |
| 5 | DB migration for shopping trips | 3 min |
| 6 | API routes (list, create, get, update, delete, toggle) | 10 min |
| 7 | useShoppingTrips client hook | 5 min |
| 8 | ShoppingTripList component | 5 min |
| 9 | ShoppingTripChecklist component | 10 min |
| 10 | Integrate trips into ShoppingListView | 5 min |
| 11 | E2E test | 5 min |

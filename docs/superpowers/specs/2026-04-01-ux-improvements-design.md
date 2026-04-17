# UX Improvements: Store Links, Feature Discovery, Shopping Trips, Nav Visibility

**Date:** 2026-04-01
**Status:** Approved

## Overview

Four interconnected UX issues identified during testing of the unified landing page:

1. **Store links missing in chat** — AI responses don't include clickable store links; LandingQuickChat lacks markdown link rendering
2. **New user feature discovery** — No mechanism to communicate features pre-signup or post-signup
3. **Material list checklist** — No in-app shopping checklist; need snapshot-based "shopping trips" separate from project materials
4. **Nav visibility** — My Projects / My Tools buttons are icon-only on mobile, easy to miss

## Issue #1: Store Links in Chat (Bug Fix — Already Implemented)

### Problem
Two compounding issues:
- `LandingQuickChat` uses bare `<ReactMarkdown>` without custom components — links aren't styled, sanitized, or opened in new tabs
- System prompt doesn't instruct the AI to include clickable markdown links when recommending stores

### Solution
1. **LandingQuickChat**: Added `mdComponents` matching `ChatMessages.tsx` pattern — custom `a` tag with `sanitizeHref()`, `target="_blank"`, sky-300 link color on dark background
2. **System prompt**: Added explicit instructions to format store names as markdown links using search URLs (`homedepot.com/s/{term}`, `lowes.com/search?searchTerm={term}`, etc.)

### Files Changed
- `components/LandingQuickChat.tsx` — Added React import, sanitizeHref import, mdComponents object, wired into both ReactMarkdown instances
- `lib/system-prompt.ts` — Added "Store Links in Responses" section after tool list

## Issue #2: New User Feature Discovery

### Pre-Signup: Inline Value Bar

A single horizontal bar between the hero subtitle and the tab bar. Four icon+label pairs separated by visual spacing, with thin border lines above and below. Feels like structural UI, not marketing.

**Content:**
- 🛒 Local store prices
- 📋 Smart shopping lists
- 🔧 Tool inventory
- 🏠 Building codes

**Behavior:**
- Visible only in hero state (`!chatActive`)
- Disappears when chat morphs active (same as headline/chips)
- Muted text color (`rgba(255,255,255,0.55)`) — visible but not dominant

**Implementation:**
- Add to `LandingHero.tsx` inside the `!chatActive` block, between subtitle `<p>` and tab bar `<div>`

### Post-Signup: Progressive Contextual Hints

A reusable `ContextualHint` component that shows a small dismissible tip banner at specific trigger points. Each hint fires once per user.

**Component design:**
- Small banner with light background, icon, text, and X dismiss button
- Renders inline (not a modal/overlay) near the relevant UI element
- Auto-dismisses when user takes the suggested action

**Storage:** `localStorage` keys (`hint_seen_materials`, `hint_seen_tools`, `hint_seen_shopping`, `hint_seen_report`)

**Trigger points:**

| Trigger | Hint Text | Location |
|---------|-----------|----------|
| First materials list generated | "Save these to a project to track purchases and search local store prices" | Below "Save Materials" button in LandingQuickChat |
| First project saved | "Your tools in **My Tools** ↑ are auto-excluded from future shopping lists" | Below save confirmation |
| First Shopping List view opened | "Create a shopping checklist to take to the store — your progress is saved" | Top of ShoppingListView |
| First project report viewed | "You can save this project and come back to it anytime from **Projects** ↑" | Below ReportView |

## Issue #3: Shopping Trips (Snapshot Checklist)

### Data Model

**New table: `shopping_trips`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Trip ID |
| project_id | uuid FK → projects | Parent project |
| user_id | uuid FK → auth.users | Owner |
| name | text | User-provided name (e.g., "Plumbing & Fixtures") |
| status | text | `active` / `completed` |
| created_at | timestamptz | When trip was created |
| completed_at | timestamptz | When all items checked off (nullable) |

**New table: `shopping_trip_items`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Item ID |
| trip_id | uuid FK → shopping_trips | Parent trip |
| product_name | text | Snapshotted from project materials |
| quantity | integer | Snapshotted quantity |
| category | text | Material category (electrical, plumbing, etc.) |
| estimated_price | numeric | Snapshotted price estimate |
| purchased | boolean | Check-off state (default false) |
| purchased_at | timestamptz | When checked off (nullable) |
| notes | text | Optional user notes |

**Key constraint:** Trip items are a point-in-time snapshot. Changing project materials does NOT affect existing trips.

### UI Components

**ShoppingTripList** — Shown inside the project's shopping list view
- List of trip cards with progress bar, status badge, created date
- "New Trip" button snapshots current items from the project's `shopping_items` table (the saved materials list, not raw chat text)
- User provides a trip name on creation
- Quick actions per trip: Open Checklist, Print, estimated total

**ShoppingTripChecklist** — Mobile-first in-app checklist
- Tap checkbox to mark purchased (persisted immediately)
- Items grouped by category for aisle-by-aisle shopping
- Checked items show as crossed-off with muted styling
- Bottom summary: "Remaining total" vs "Already spent"
- Print and share buttons in header
- Auto-marks trip as `completed` when all items checked

**Print view** — Enhanced version of existing MaterialsExport print
- Includes category grouping
- Physical checkboxes for manual checking
- Running total per category and grand total
- Trip name and date in header
- Optimized for single-page printing when possible

### API Routes

- `POST /api/shopping-trips` — Create trip (snapshots current project materials)
- `GET /api/shopping-trips?project_id=X` — List trips for a project
- `GET /api/shopping-trips/[id]` — Get trip with items
- `PATCH /api/shopping-trips/[id]` — Update trip (name, status)
- `PATCH /api/shopping-trips/[id]/items/[itemId]` — Toggle purchased, update notes
- `DELETE /api/shopping-trips/[id]` — Delete trip

## Issue #4: Nav Visibility (Mobile Labels)

### Problem
Header buttons (Projects, My Tools, My Questions) use `hidden sm:inline` on labels — mobile users only see icons with no text.

### Solution
Remove `hidden sm:inline` and replace with responsive text sizing:
- Mobile: Show labels at `text-xs`
- Desktop: Show labels at current `text-sm`

**Implementation:**
- In `AppHeader.tsx`, change `<span className="hidden sm:inline">Projects</span>` to `<span className="text-xs sm:text-sm">Projects</span>` (same for My Tools, My Questions)

## Implementation Order

1. ~~Issue #1: Store links~~ (already done)
2. Issue #4: Nav mobile labels (smallest change, immediate impact)
3. Issue #2: Value bar + ContextualHint component
4. Issue #3: Shopping trips (DB migration + new components + API routes)

## Design Decisions

- **localStorage for hints, not DB** — Seeing a hint twice on a new device is harmless; avoids migration
- **Shopping trips as separate table** — Clean separation from project materials; supports multiple trips per project and full history
- **Snapshot pattern** — Trip items are frozen at creation time; project material changes don't affect active trips
- **Category grouping** — Matches store aisle organization for practical in-store use
- **Mobile-first checklist** — Primary use case is at the store on a phone; large touch targets, one-handed operation

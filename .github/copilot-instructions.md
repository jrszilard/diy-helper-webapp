# AI Coding Agent Instructions for DIY Helper Webapp

## Project Overview

**DIY Helper Webapp** is a Next.js application that guides users through home improvement projects using Claude AI. It combines conversational assistance with project tracking, materials management, and local code lookups.

**Core purpose**: Enable users to ask about DIY projects, receive step-by-step guidance, generate materials lists, find local store prices, and manage shopping lists.

---

## Architecture & Critical Flows

### 1. AI Chat Workflow (Fundamental Pattern)

The application enforces a strict multi-stage conversation flow in `app/api/chat/route.ts`:

```
User asks about project 
    ↓ 
AI provides guidance + videos offer
    ↓ 
User accepts videos
    ↓ 
Call search_project_videos → Display results
    ↓ 
Ask about materials list
    ↓ 
User says YES
    ↓ 
Call extract_materials_list (CRITICAL: must include markers in response)
    ↓ 
Frontend shows "Save Materials" dialog
    ↓ 
Materials saved to Supabase shopping_list_items
```

**Why this matters**: The frontend parses special markers (`---MATERIALS_DATA---`) in AI responses to extract structured data. Skip any stage, and the workflow breaks.

### 2. Data Persistence Layer (Supabase)

Three critical tables:
- **projects**: Stores project metadata (name, description, user_id, created_at)
- **shopping_list_items**: Individual materials linked to projects
- **user_inventory**: Auto-detected owned tools/materials

**Key pattern**: Always pass `requestBody?.userId` or `toolInput?.userId` to tool executors to ensure proper user isolation.

### 3. Component Architecture

- **ChatInterface.tsx**: Core chat UI + materials dialog logic
  - Parses tool results for special markers
  - Manages local state (messages, extractedMaterials, projectId)
  - Coordinates with Supabase for persistence
  
- **ProjectsSidebar.tsx**: Project list + deletion
  - Loads projects filtered by current user
  - Single-responsibility: display & basic CRUD
  
- **ShoppingListView.tsx**: Materials display + local store search
  - Displays shopping_list_items grouped by category
  - Integrates location-based price lookup

---

## Tool System (Central to Agent Behavior)

The app defines 11 Claude tools (see `app/api/chat/route.ts` lines 150-398). Three categories:

### Tools Requiring Location Context
- **search_local_codes**: Use when ANY city/state mentioned or permit questions. Returns instruction payload directing agent to web_search + web_fetch on official municipal sources.
- **search_local_stores**: Find materials at nearby stores with pricing.

### Tools for Knowledge Extraction
- **search_building_codes**: National codes ONLY (NEC, IRC, IBC) when no location mentioned.
- **search_project_videos**: Brave Search API for DIY tutorials (requires BRAVE_SEARCH_API_KEY).
- **detect_owned_items**: Triggered by phrases like "I have a drill", "I already own...". Saves to user_inventory.
- **check_user_inventory**: Cross-reference owned items before creating materials list.

### Critical Tool: extract_materials_list
**Most error-prone pattern**: This tool MUST return response with exact markers:
```
---MATERIALS_DATA---
{json_payload}
---END_MATERIALS_DATA---
```

Frontend regex parses this (`/---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/`). Missing markers = broken workflow. When calling this tool, **always include the complete tool result with markers in the AI response**.

---

## Key Conventions & Gotchas

### 1. Component-Level Patterns

**ClientLayout**: All interactive components use `'use client'` directive. No SSR state management.

**Supabase Client Initialization**: Two patterns exist:
- `lib/supabase.ts`: Anonymous key client (publicly safe)
- `app/api/chat/route.ts`: Service role key for backend (full permissions)

Never expose service role key to frontend.

### 2. Message Parsing in ChatInterface

Frontend extracts multiple data types from raw AI responses:
```tsx
// Materials data (lines 62-68)
const match = content.match(/---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/);

// Video results (lines 261-267)  
const jsonMatch = content.match(/\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/s);

// Inventory updates (lines 279-286)
const invMatch = content.match(/---INVENTORY_UPDATE---([\s\S]*?)---END_INVENTORY_UPDATE---/);
```

All three patterns must be preserved exactly. Changing marker syntax breaks data extraction.

### 3. Tool Parameter Passing

Tools receive `toolInput` (user-provided params) and optional `requestBody` (contains userId from session). Pattern in `executeTool()`:
```typescript
const userId = requestBody?.userId || toolInput?.userId || null;
```

This ensures database writes respect user isolation.

### 4. Material Quantity Handling

Materials use string quantities ("250 ft", "10 pieces", "1 box") in extract_materials_list but convert to integers when saving:
```typescript
quantity: parseInt(mat.quantity) || 1
```

Be cautious with unit conversions in shopping list view.

---

## External Dependencies & APIs

- **@anthropic-ai/sdk**: Claude API client (v0.68+)
- **@supabase/supabase-js**: Database + auth (v2.83+)
- **react-markdown**: Display formatted tool responses
- **Brave Search API**: Video search (requires BRAVE_SEARCH_API_KEY env var)

**MCP Modules** in `lib/mcp/`:
- `building-codes.ts`: Loads `codes.json` database
- `material-specs.ts`: Mock product database
- `executor.ts`: Tool execution logic (mostly stub implementations)

---

## Common Debugging Points

1. **Materials not saving**: Check if `---MATERIALS_DATA---` markers are in AI response. Frontend won't parse without them.

2. **Inventory detection fails**: Verify user is logged in (userId present). Tool returns warning if `userId` is null.

3. **Local codes not searched**: Ensure `search_local_codes` is called for ANY location mention, not just city-specific queries.

4. **Video search returns empty**: Check BRAVE_SEARCH_API_KEY is set. Tool logs `🎥` and `📹` emojis to console for debugging.

5. **Component rendering**: All interactive components must be client components (`'use client'`). Check for hydration mismatches between server/client state.

---

## Development Workflow

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Verify TypeScript + build
npm run lint         # ESLint check
```

**Environment variables required**:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY (backend only)
ANTHROPIC_API_KEY
BRAVE_SEARCH_API_KEY
```

---

## When Implementing Features

1. **New Tool**: Add to tools array in `app/api/chat/route.ts` (lines 150-398), implement in `executeTool()`, update system prompt.

2. **Frontend UI for Tool**: Create component, ensure it's client component, parse markers if tool returns structured data (see ChatInterface.tsx examples).

3. **Database Changes**: Update Supabase schema + adjust Supabase client calls in components. Remember service role key distinction.

4. **Material/Code Data**: Use `lib/mcp/building-codes.ts` pattern - load from JSON/import, wrap in class with search methods.

---

## Reference Implementation Examples

**Correct materials list workflow** (ChatInterface.tsx lines 128-140):
- Call extract_materials_list
- Parse special markers
- Show dialog 
- Insert to shopping_list_items on user confirmation

**Correct local codes workflow** (app/api/chat/route.ts lines 200-215):
- Detect location in user message
- Call search_local_codes with city/state
- Tool returns instruction payload
- AI follows instructions to web_search/web_fetch

**Correct inventory tracking** (app/api/chat/route.ts lines 656-715):
- Detect ownership phrases
- Call detect_owned_items
- Upsert to user_inventory with user_id
- Return summary with markers for optional frontend parsing

# UX Fix Implementation Plan

Prioritized fixes from comprehensive browser testing (2026-03-06).
Fixes #1-#11 ordered by dependency and priority.

---

## Fix #1: Auth Modal Clipped Inside Navbar (CRITICAL)

**Problem**: The auth modal in `AuthButton.tsx` uses `fixed inset-0` but is rendered inside the `<nav>` element which has `backdrop-blur-xl`. CSS `backdrop-filter` creates a new containing block, constraining the fixed-position modal to the nav's 64px height. Users can't see the Sign In/Create Account toggle, close button, or forgot password.

**File**: `components/AuthButton.tsx`

**Solution**: Use React `createPortal` to render the modal outside the nav's stacking context.

**Changes**:
1. Import `createPortal` from `react-dom`
2. Add a ref or state for the document.body mount point (needed for SSR safety)
3. Wrap the modal JSX (lines 196-289) in `createPortal(..., document.body)`

```tsx
// Add import
import { createPortal } from 'react-dom';

// Add state for portal mount (SSR-safe)
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Wrap the modal (line 196-289) in portal
{showAuth && mounted && createPortal(
  <div className="fixed inset-0 bg-[#3E2723]/50 flex items-center justify-center z-50 p-4">
    {/* ...existing modal content... */}
  </div>,
  document.body
)}
```

**Estimated scope**: ~10 lines changed in 1 file.

---

## Fix #2: Expert Search API Returns 500 (CRITICAL)

**Problem**: `/api/experts/search` returns 500 because the Supabase query on `expert_profiles` with `expert_specialties(*)` join fails. The frontend shows misleading "No experts found" instead of an error state.

**Files**:
- `app/api/experts/search/route.ts` (backend)
- `app/experts/page.tsx` (frontend)

**Solution — Backend**: The query likely fails because the `expert_specialties` relation isn't recognized or the table doesn't exist in the current DB. Add a try/catch around the specialty join — if it fails, retry without the join and filter specialties separately. Also add better error logging to identify the exact Supabase error.

**Solution — Frontend**: Add an `error` state to distinguish API failures from empty results.

**Backend changes** (`app/api/experts/search/route.ts`):
1. Log the full error object (not just 'Search failed') so we can diagnose
2. If the join fails, fall back to querying without `expert_specialties(*)`

**Frontend changes** (`app/experts/page.tsx`):
1. Add `const [error, setError] = useState(false)` state
2. In `fetchExperts`, set `setError(true)` when `!res.ok`
3. Render an error banner with retry button when `error && !loading`

```tsx
// In fetchExperts:
const res = await fetch(`/api/experts/search?${params.toString()}`);
if (res.ok) {
  const data = await res.json();
  setExperts(data.experts || []);
  setError(false);
} else {
  setError(true);
  setExperts([]);
}

// In JSX, add error state between loading and empty:
) : error ? (
  <div className="text-center py-12">
    <p className="text-sm text-[#B8593B] mb-3">Something went wrong loading experts.</p>
    <button onClick={fetchExperts} className="text-sm font-medium text-[#5D7B93] hover:underline">
      Try again
    </button>
  </div>
) : experts.length === 0 ? (
```

**Estimated scope**: ~15 lines in 2 files.

---

## Fix #3: Guided Bot — Collapse Completed Steps (CRITICAL)

**Problem**: After submitting each guided bot step, the old form with active-looking buttons stays visible. This causes visual clutter, "duplicate message" appearance, and users can't tell which step is current.

**Files**:
- `components/guided-bot/GuidedBot.tsx`
- `components/guided-bot/useGuidedBot.ts`
- `components/guided-bot/types.ts`

**Solution**: Track which messages are "completed" and render a compact read-only summary instead of the full interactive component.

**Changes**:

1. **`types.ts`** — Add `completed?: boolean` to the `BotMessage` interface

2. **`useGuidedBot.ts`** — When advancing to the next phase, mark previous bot messages with interactive components as `completed: true`:
   ```tsx
   // In each handler (e.g., handleScopeSubmit), before adding new messages:
   setState(prev => ({
     ...prev,
     messages: prev.messages.map(m =>
       m.component ? { ...m, completed: true } : m
     ),
   }));
   ```

3. **`GuidedBot.tsx`** — In the `renderComponent` function, return `null` for completed messages (they already have user response messages showing what was entered):
   ```tsx
   const renderComponent = (componentKey: string | undefined, messageIndex: number, completed?: boolean) => {
     if (!componentKey) return null;
     if (completed) return null; // Collapsed — user message already shows the response
     // ...existing logic...
   };
   ```

4. **`GuidedBot.tsx`** — Update the map call to pass `completed`:
   ```tsx
   {renderComponent(message.component, i, message.completed)}
   ```

5. **Collapse project cards after selection**: The initial greeting message with `project-cards` component should also collapse after a project is selected. Same `completed: true` flag handles this.

**Estimated scope**: ~20 lines across 3 files.

---

## Fix #4: Silent Auth Redirects on Protected Routes (HIGH)

**Problem**: `/marketplace/qa`, `/experts/dashboard`, `/profile`, `/messages` redirect to `/chat` or `/` silently when not authenticated. Users have no idea they need to sign in.

**Files**:
- `app/marketplace/qa/page.tsx` (line 44)
- `app/experts/dashboard/layout.tsx` (line 33)
- `app/profile/page.tsx`
- `app/messages/page.tsx`

**Solution**: Instead of `router.push('/chat')`, redirect to homepage with a query param that triggers the auth modal with a return URL.

**Changes**:

1. **Create a shared auth redirect utility** (`lib/auth-redirect.ts`):
   ```tsx
   export function redirectToSignIn(router: ReturnType<typeof useRouter>, returnTo: string) {
     sessionStorage.setItem('authReturnTo', returnTo);
     router.push('/?signIn=true');
   }
   ```

2. **Update protected routes** to use the utility:
   ```tsx
   // marketplace/qa/page.tsx line 44:
   if (!user) {
     redirectToSignIn(router, '/marketplace/qa');
     return;
   }
   ```

3. **Update `app/page.tsx`** to read `?signIn=true` query param and auto-open auth modal:
   ```tsx
   const searchParams = useSearchParams();
   const [showAuth, setShowAuth] = useState(false);

   useEffect(() => {
     if (searchParams.get('signIn') === 'true') {
       setShowAuth(true);
     }
   }, [searchParams]);
   ```

4. **Update `AuthButton.tsx`** to redirect after successful auth:
   ```tsx
   // After successful sign in (line 72):
   const returnTo = sessionStorage.getItem('authReturnTo');
   if (returnTo) {
     sessionStorage.removeItem('authReturnTo');
     router.push(returnTo);
   }
   ```

**Estimated scope**: ~30 lines across 5-6 files.

---

## Fix #5: Add Forgot Password Link (HIGH)

**Problem**: No password recovery path exists in the auth form.

**File**: `components/AuthButton.tsx`

**Solution**: Add a "Forgot password?" link below the password field that triggers `supabase.auth.resetPasswordForEmail()`.

**Changes**:
1. Add `forgotMode` state
2. Below the password input (after line 275), when NOT in sign-up mode, add:
   ```tsx
   {!isSignUp && (
     <button
       type="button"
       onClick={async () => {
         if (!email) { alert('Enter your email first'); return; }
         await supabase.auth.resetPasswordForEmail(email);
         alert('Check your email for a password reset link');
       }}
       className="text-xs text-[#5D7B93] hover:underline"
     >
       Forgot password?
     </button>
   )}
   ```

**Estimated scope**: ~12 lines in 1 file.

---

## Fix #6: Guided Bot Scroll Hijacking (HIGH)

**Problem**: The guided bot's `overflow-y-auto` with `max-h-[70vh]` captures scroll events, preventing users from scrolling past the hero section when cursor is over the bot.

**File**: `components/guided-bot/GuidedBot.tsx` (line 172)

**Solution**: Use `overscroll-behavior-y: contain` and dynamically enable overflow only when content exceeds the container. With Fix #3 (collapsing completed steps), the content will be shorter and less likely to need internal scrolling.

**Changes**:
1. Add `overscroll-behavior-y-contain` class (Tailwind: `overscroll-y-contain`)
2. Track whether content overflows and conditionally apply `overflow-y-auto`:
   ```tsx
   // Simpler approach: just add overscroll-contain
   className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4 max-h-[70vh] min-h-[300px]"
   ```

   Note: After Fix #3 collapses completed steps, the scroll container will be much shorter, largely mitigating this issue. The `overscroll-y-contain` is a safety net.

**Estimated scope**: ~1 line changed in 1 file. Mostly resolved by Fix #3.

---

## Fix #7: Double-Submit Creates Duplicate Messages (HIGH)

**Problem**: Rapidly clicking Continue creates duplicate user messages and bot responses.

**Files**:
- `components/guided-bot/ScopeInput.tsx`
- `components/guided-bot/LocationInput.tsx`
- `components/guided-bot/ToolsInput.tsx`
- `components/guided-bot/useGuidedBot.ts`

**Solution**: Add a `submitting` guard to prevent double execution.

**Changes — Option A (at the hook level, cleanest)**:
1. In `useGuidedBot.ts`, add a `isSubmitting` ref:
   ```tsx
   const isSubmitting = useRef(false);
   ```
2. Wrap each handler with a guard:
   ```tsx
   const handleScopeSubmit = useCallback(async (dimensions: string, details: string) => {
     if (isSubmitting.current) return;
     isSubmitting.current = true;
     // ...existing logic...
     isSubmitting.current = false;
   }, [addUserMessage, addBotMessage]);
   ```

**Changes — Option B (at each component level)**:
1. Each input component disables its Continue button after first click:
   ```tsx
   const [submitted, setSubmitted] = useState(false);
   // On submit: setSubmitted(true); onSubmit(...);
   // Button: disabled={submitted}
   ```

**Recommendation**: Use Option A (hook level) for centralized protection + Option B for visual feedback (disabled button). But Option A alone is sufficient.

**Estimated scope**: ~15 lines in 1 file (Option A).

---

## Fix #8: No Loading State on /experts When API Fails (HIGH)

**Problem**: The `/experts` page shows "No experts found" immediately while API is in flight, and shows the same message when API returns 500.

**File**: `app/experts/page.tsx`

**Already addressed in Fix #2** — the `error` state and loading spinner are already part of that fix. The existing code already has a loading spinner (lines 79-82 with `<Loader2>`), so loading state is handled. The error state is the new addition from Fix #2.

**No additional work needed beyond Fix #2.**

---

## Fix #9: Sign In Dropdown Doesn't Close on Outside Click (MEDIUM)

**Problem**: When the auth modal is open (for unauthenticated users), clicking outside doesn't dismiss it. The overlay click handler may not be working because the modal is trapped inside the nav (Fix #1).

**File**: `components/AuthButton.tsx`

**Solution**: This is **largely fixed by Fix #1**. Once the modal renders via `createPortal` to `document.body`, the overlay div (`fixed inset-0`) will properly cover the entire viewport. Clicking the overlay background should close the modal.

**Additional change**: Add an `onClick` handler on the overlay to close:
```tsx
<div
  className="fixed inset-0 bg-[#3E2723]/50 flex items-center justify-center z-50 p-4"
  onClick={(e) => {
    if (e.target === e.currentTarget) setShowAuth(false);
  }}
>
```

Also add Escape key handler:
```tsx
useEffect(() => {
  if (!showAuth) return;
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowAuth(false);
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [showAuth]);
```

**Estimated scope**: ~10 lines in 1 file.

---

## Fix #10: /chat Intermittent Redirect to / (MEDIUM)

**Problem**: The `/chat` route sometimes redirects to homepage. May be related to the `edge` runtime in `app/chat/layout.tsx` or auth hydration race.

**File**: `app/chat/layout.tsx`

**Solution**: The chat layout currently exports `runtime = 'edge'`. This is unusual for a client-side page layout and may cause hydration issues. Remove the edge runtime since this is a client component page.

**Changes**:
```tsx
// app/chat/layout.tsx — Remove these lines:
// export const dynamic = 'force-dynamic';
// export const runtime = 'edge';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
```

If the redirect persists after removing edge runtime, investigate `app/chat/page.tsx` for any conditional redirect logic. The current code doesn't show an explicit redirect, so the edge runtime is the most likely culprit.

**Estimated scope**: 2 lines removed in 1 file.

---

## Fix #11: Nav Label Inconsistency Between Pages (MEDIUM)

**Problem**: Homepage says "Ask an Expert" / "Find an Expert". Chat page says "Ask Expert" / "Experts" — shorter, inconsistent labels.

**Files**:
- `app/chat/page.tsx` (lines 239, 243)

**Solution**: Update chat page nav labels to match homepage.

**Changes** (in `app/chat/page.tsx`):
```tsx
// Line 239: Change "Ask Expert" to "Ask an Expert"
<span className="hidden md:inline font-medium">Ask an Expert</span>

// Line 243: Change "Experts" to "Find an Expert"
<span className="hidden md:inline font-medium">Find an Expert</span>
```

**Estimated scope**: 2 lines in 1 file.

---

## Implementation Order

Recommended order based on dependencies and impact:

| Order | Fix | Reason |
|-------|-----|--------|
| 1 | **#1 Auth Modal Portal** | Unblocks sign-up for all users; #5 and #9 depend on it |
| 2 | **#5 Forgot Password** | Quick add while in AuthButton.tsx |
| 3 | **#9 Outside Click/Escape** | Quick add while in AuthButton.tsx |
| 4 | **#3 Collapse Completed Steps** | Largest UX improvement; partially fixes #6 |
| 5 | **#6 Scroll Hijacking** | 1-line addition after #3 reduces the problem |
| 6 | **#7 Double-Submit Guard** | Quick add in useGuidedBot.ts |
| 7 | **#2 Expert Search Error State** | Frontend error handling + backend logging |
| 8 | **#4 Auth Redirect with Return URL** | Touches multiple files, needs #1 working |
| 9 | **#10 Remove Edge Runtime** | Simple 2-line removal, needs testing |
| 10 | **#11 Nav Labels** | Trivial 2-line fix |
| — | **#8** | Already covered by #2 |

**Total estimated scope**: ~100 lines across ~10 files.

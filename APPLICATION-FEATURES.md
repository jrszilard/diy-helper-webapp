# DIY Helper - Application Features

> Last updated: 2026-03-11 | 36 features

## Core AI Features

### 1. AI Chat Assistant
Conversational AI for DIY questions with streaming responses, materials extraction, image analysis, and multi-project context.
- **Files:** `app/chat/page.tsx`, `components/ChatInterface.tsx`, `components/ChatMessages.tsx`, `components/ChatInput.tsx`, `hooks/useChat.ts`, `app/api/chat/route.ts`, `lib/system-prompt.ts`
- **Status:** Complete

### 2. Guided Bot Onboarding
Multi-step chatbot that collects project details (type, scope, location, tools, budget/experience preferences) before launching the AI planner.
- **Files:** `components/guided-bot/GuidedBot.tsx`, `components/guided-bot/useGuidedBot.ts`, `components/guided-bot/*.tsx`, `app/api/guided-chat/route.ts`
- **Status:** Complete

### 3. AI Project Planner (Agent Runner)
Multi-phase AI agent that generates comprehensive project reports: building codes, safety, step-by-step plan, materials, tools, cost estimates, videos, and timelines.
- **Files:** `lib/agents/runner.ts`, `lib/agents/phases/*.ts`, `lib/agents/prompts.ts`, `app/api/agents/runs/route.ts`, `components/AgentIntakeForm.tsx`, `components/AgentProgress.tsx`, `hooks/useAgentRun.ts`
- **Status:** Complete

### 4. Image Analysis in Chat
Users upload images (JPEG, PNG, WebP) for AI-powered visual analysis of DIY situations.
- **Files:** `components/ImagePreview.tsx`, `lib/image-utils.ts`, `hooks/useChat.ts`
- **Status:** Complete

## Project Management

### 5. Projects Sidebar
Create, view, delete, and switch between projects. Supports guest (localStorage) and authenticated (Supabase) storage with migration on sign-up.
- **Files:** `components/ProjectsSidebar.tsx`, `components/ProjectCard.tsx`, `lib/guestStorage.ts`
- **Status:** Complete

### 6. Project Templates
Pre-built templates for common DIY projects (kitchen remodel, bathroom tile, electrical, etc.) to quick-start planning.
- **Files:** `components/ProjectTemplates.tsx`, `lib/templates/index.ts`
- **Status:** Complete

### 7. Conversation Management
Multi-conversation support with history, auto-save, switching, and persistence for both guests and authenticated users.
- **Files:** `components/ConversationList.tsx`, `lib/chat-history.ts`, `app/api/conversations/route.ts`, `app/api/conversations/[id]/route.ts`
- **Status:** Complete

## Reports & Sharing

### 8. Interactive Report Viewer
Tabbed report sections with markdown rendering, print support, clipboard copy, and expert help integration.
- **Files:** `components/ReportView.tsx`, `app/api/reports/[id]/route.ts`
- **Status:** Complete

### 9. Report Sharing
Generate shareable links with tokens for public report viewing. Guests can view shared reports without auth.
- **Files:** `app/share/report/[token]/page.tsx`, `app/share/page.tsx`, `app/api/reports/[id]/share/route.ts`, `app/api/reports/share/[token]/route.ts`
- **Status:** Complete

### 10. Materials Export
Export shopping lists and materials to PDF/CSV formats for offline use.
- **Files:** `components/MaterialsExport.tsx`
- **Status:** Complete

## Shopping & Store Integration

### 11. Smart Shopping Lists
Auto-generated shopping lists from project responses with quantity, category, and estimated pricing. Supports item editing and purchase tracking.
- **Files:** `components/ShoppingListView.tsx`, `components/SaveMaterialsDialog.tsx`, `lib/product-extractor.ts`
- **Status:** Complete

### 12. Real-Time Store Price Search
Searches Home Depot, Lowe's, and Ace Hardware for materials with real-time pricing and availability near the user's location.
- **Files:** `hooks/useStoreSearch.ts`, `lib/search.ts`, `lib/store-patterns.ts`, `lib/fuzzy-match.ts`, `app/api/search-stores/route.ts`
- **Status:** Complete

### 13. Tool Inventory Management
Track owned tools by category and condition. Automatically excludes owned items from shopping lists and factors them into project reports.
- **Files:** `components/InventoryPanel.tsx`, `lib/agents/inventory-prefetch.ts`
- **Status:** Complete

### 14. Video Recommendations
Embedded YouTube tutorials relevant to the DIY project, surfaced in chat and reports.
- **Files:** `components/VideoResults.tsx`
- **Status:** Complete

## Expert Marketplace

### 15. Expert Registration
Trade professionals register with specialties, experience, rates, service area, bio, and portfolio. Includes Stripe Connect onboarding for payouts.
- **Files:** `app/experts/register/page.tsx`, `components/marketplace/ExpertRegistrationForm.tsx`, `app/api/experts/register/route.ts`, `app/api/experts/stripe-onboard/route.ts`, `components/marketplace/StripeOnboardBanner.tsx`
- **Status:** Complete

### 16. Expert Search & Directory
Browse and filter experts by specialty, location, and rating. Expert cards show photo, reviews, rating, and contact options.
- **Files:** `app/experts/page.tsx`, `app/experts/[id]/page.tsx`, `components/marketplace/ExpertCard.tsx`, `components/marketplace/ExpertSearchFilters.tsx`, `components/marketplace/ExpertProfileView.tsx`, `app/api/experts/search/route.ts`
- **Status:** Complete

### 17. Expert Dashboard
Control center for experts: earnings (total/pending/monthly), ratings, active Q&A queue, messaging, profile management, and Stripe status.
- **Files:** `app/experts/dashboard/page.tsx`, `app/experts/dashboard/layout.tsx`, `components/marketplace/DashboardStats.tsx`, `components/marketplace/DashboardQAQueue.tsx`, `app/api/experts/dashboard/route.ts`
- **Status:** Complete

### 18. Expert Subscriptions
Three-tier expert subscription system (Free/Pro $29/Premium $79) with varying platform fees and queue priority.
- **Files:** `app/api/experts/subscription/route.ts`, `app/api/experts/stripe-webhook/route.ts`, `lib/config.ts` (expertSubscriptions)
- **Status:** Complete

### 19. Expert Badge (Embeddable)
Public SVG badge endpoint for experts to embed on their websites showing rating, level, and verification status.
- **Files:** `app/api/experts/[id]/badge/route.ts`
- **Status:** Complete

### 20. Reputation Engine
Composite scoring system with expert levels (Bronze/Silver/Gold/Platinum), review aggregation, and reputation tracking.
- **Files:** `lib/marketplace/reputation-engine.ts`, `components/marketplace/ExpertLevelBadge.tsx`, `components/marketplace/ExpertIdentityCard.tsx`, `app/api/experts/[id]/reputation/route.ts`
- **Status:** Complete

## Q&A System

### 21. Q&A Question Submission
Users submit DIY questions with optional project context, photo attachments, and AI report linking. Dynamic pricing based on difficulty.
- **Files:** `app/marketplace/qa/page.tsx`, `components/marketplace/QASubmitForm.tsx`, `app/api/qa/route.ts`, `lib/marketplace/pricing-engine.ts`, `lib/marketplace/difficulty-scorer.ts`
- **Status:** Complete

### 22. Q&A Answer Flow
Experts claim questions, provide detailed answers with photos, and earn payouts. Includes threaded follow-up conversations.
- **Files:** `app/marketplace/qa/[id]/page.tsx`, `components/marketplace/QAAnswerForm.tsx`, `components/marketplace/QAAnswerView.tsx`, `components/marketplace/ConversationView.tsx`, `app/api/qa/[id]/answer/route.ts`, `app/api/qa/[id]/claim/route.ts`
- **Status:** Complete

### 23. Expert Bidding System
Experts bid on specialist questions with pitch, estimated time, and price. Users review and accept bids.
- **Files:** `components/marketplace/BidCard.tsx`, `app/api/qa/[id]/bids/route.ts`, `lib/marketplace/bidding.ts`
- **Status:** Complete

### 24. Tier Upgrades & Corrections
Users can upgrade question tiers for deeper answers. Experts submit corrections to AI reports. Second opinions available.
- **Files:** `components/marketplace/TierUpgradeModal.tsx`, `components/marketplace/CorrectionForm.tsx`, `components/marketplace/TriangulationView.tsx`, `app/api/qa/[id]/corrections/route.ts`, `app/api/qa/[id]/tier-upgrade/route.ts`, `app/api/qa/[id]/second-opinion/route.ts`
- **Status:** Complete

### 25. Expert Insight Notes
Experts add structured notes: tools needed, estimated time, common mistakes, local code notes, and additional context.
- **Files:** `components/marketplace/InsightNotesPanel.tsx`, `app/api/qa/[id]/notes/route.ts`
- **Status:** Complete

### 26. Review & Rating System
Post-Q&A reviews with 1-5 star ratings. Public reviews affect expert reputation and search ranking.
- **Files:** `components/marketplace/ReviewForm.tsx`, `components/marketplace/ReviewCard.tsx`, `app/api/experts/[id]/reviews/route.ts`, `lib/marketplace/review-helpers.ts`
- **Status:** Complete

### 27. Consultation Booking
Book video consultations with experts. Date/time selection with expert availability integration.
- **Files:** `components/marketplace/ConsultationBooking.tsx`, `app/api/consultations/route.ts`
- **Status:** Complete

## Communication

### 28. Direct Messaging
Threaded messaging between DIYers and experts with photo attachments, project context cards, and unread tracking.
- **Files:** `app/messages/page.tsx`, `app/messages/[threadId]/page.tsx`, `app/experts/dashboard/messages/page.tsx`, `components/marketplace/MessageThread.tsx`, `components/marketplace/MessageList.tsx`, `app/api/messages/route.ts`, `app/api/messages/[threadId]/route.ts`, `app/api/messages/upload/route.ts`, `lib/marketplace/messaging.ts`
- **Status:** Complete

### 29. Notification System
Real-time notification bell with unread badge for Q&A answers, expert responses, messages, payments, and system alerts. Email notifications via Resend.
- **Files:** `components/NotificationBell.tsx`, `hooks/useNotifications.ts`, `app/api/notifications/route.ts`, `lib/notifications.ts`, `lib/email-templates.ts`
- **Status:** Complete

## Account & Billing

### 30. Authentication
Supabase Auth with email/password signup, login, logout, session management, and protected routes. Guest-to-auth migration.
- **Files:** `components/AuthButton.tsx`, `lib/auth.ts`, `lib/supabase.ts`, `lib/auth-redirect.ts`
- **Status:** Complete

### 31. User Profile
Edit display name and phone. View account creation date and email.
- **Files:** `app/profile/page.tsx`, `app/api/profile/route.ts`, `lib/profile-validation.ts`
- **Status:** Complete

### 32. Settings & Subscription Management
View current plan (Free/Pro), usage stats, billing period, and upgrade to Pro ($9.99/mo). Post-checkout success handling.
- **Files:** `app/settings/page.tsx`, `components/UpgradeModal.tsx`, `app/api/subscriptions/route.ts`, `app/api/subscriptions/webhook/route.ts`, `lib/stripe.ts`, `lib/usage.ts`
- **Status:** Complete

### 33. Usage Tracking & Limits
Tracks reports and chat messages per month. Visual progress bars with 80% warnings. Free tier limits enforced, Pro gets unlimited.
- **Files:** `components/UsageBanner.tsx`, `lib/usage.ts`, `app/api/usage/route.ts`, `lib/config.ts` (freemium)
- **Status:** Complete

## Platform Infrastructure

### 34. Beta Mode
Feature-flagged beta banner and floating feedback widget. Payment bypass and usage limit removal for testing. Feedback stored in `beta_feedback` table.
- **Files:** `components/BetaBanner.tsx`, `components/BetaFeedbackWidget.tsx`, `app/api/feedback/route.ts`, `lib/feature-flags.ts`, `lib/config.ts` (beta)
- **Status:** Complete

### 35. Landing Page
Marketing homepage with feature grid, expert opportunity section, testimonials, pricing comparison, and dual CTAs. Expert quick bar for logged-in experts.
- **Files:** `app/page.tsx`, `components/WhyDIYHelper.tsx`, `components/ExpertBar.tsx`, `components/ExpertQuickBar.tsx`, `components/GuestExpertCallout.tsx`
- **Status:** Complete

### 36. Security & Rate Limiting
CSP headers, CORS management, SSRF protection, input validation (Zod), Stripe webhook verification, rate limiting (Upstash Redis), structured logging with sensitive key redaction.
- **Files:** `next.config.ts`, `lib/security.ts`, `lib/cors.ts`, `lib/rate-limit.ts`, `lib/validation.ts`, `lib/logger.ts`, `lib/config.ts`
- **Status:** Complete

---

## Adding New Features

When adding a new feature to this application, update this document by adding an entry in the appropriate section with:
- **Feature number** (increment the count)
- **Name** and 1-2 sentence description
- **Key files** involved
- **Status** (Complete, In Progress, Beta-only, Planned)

Update the feature count in the header. See `.claude/agents/feature-tracker.md` for the automated agent.

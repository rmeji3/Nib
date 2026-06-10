# Nib - Frontend Development Guide

This is a live developer guide and project directory index for the Next.js frontend. It is automatically scanned and updated by agents when changes are made.

---

## 1. Core Guidelines

### Component & Hook Separation
- **No Large Components**: Keep UI files under 200-300 lines. If they exceed this, split them into smaller, reusable UI primitives.
- **Hook Extraction**: Extract state management, TanStack Query calls, event handlers, and effects into feature-specific custom hooks (e.g., `useDocumentList`, `usePDFViewer`).
- **Presentational Focus**: Visual components should receive data and event handlers via props rather than triggering side effects.

### Data Fetching & Server State
- **TanStack Query (React Query)**: Always fetch/mutate API data using TanStack Query custom hooks.
- **No `useEffect` Fetching**: Never fetch raw API endpoints inside a `useEffect` loop in components.
- **Client Separation**: Place raw `fetch`/`axios` requests in `/lib/api/` or `services/` folder, importing them into hooks.

### Styling & Aesthetics (TailwindCSS v4)
- **Modern Themes**: Utilize smooth gradients, premium dark mode settings, and glassmorphism elements matching our analyzed design systems (Stripe, Linear, Apple, Vercel).
- **Responsive Layout**:
  - Desktop: Side-by-side split pane (PDF reader on left, AI chat on right).
  - Mobile: Stacked view or slide-up drawer for chat interface.
- **Interactive States**: Every interactive control must declare explicit `:hover`, `:focus-visible`, and `:active` styles with transitions.

### Accessibility (a11y)
- **Accessible Primitives**: Use Radix, Headless UI, or Shadcn UI primitives for Modals, Dropdowns, Tooltips, and Selects.
- **Semantic Structure**: Structure pages using `<header>`, `<main>`, `<nav>`, `<section>`, and `<aside>` instead of nested `<div>`s.
- **Keyboard Navigation**: Ensure tab-focus states are visible, dialogs catch focus and exit on `Escape`, and inputs are properly labeled.

---

## 2. Codebase Structure (Auto-Generated)

> [!NOTE]
> The section below is updated automatically when running `npm run update-guides`. Do not edit between the marker comments manually.

<!-- START_AUTO_MAP -->
### App Routing Map

| URL Route | Type | File Path |
| --- | --- | --- |
| `/` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/page.tsx) |
| `/document/[id]` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/document/[id]/page.tsx) |
| `/document/uploading` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/document/uploading/page.tsx) |
| `/file` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/file/page.tsx) |
| `/home` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/home/page.tsx) |
| `/settings` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/settings/page.tsx) |
| `/signin` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/signin/page.tsx) |
| `/signup` | Page | [`page.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/signup/page.tsx) |

### Feature Modules (`frontend/app/features`)

#### Feature: `auth`
- **Components**:
  - [`auth-card.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/auth/components/auth-card.tsx)
  - [`auth-provider.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/auth/components/auth-provider.tsx)
  - [`oauth-button.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/auth/components/oauth-button.tsx)
  - [`protected-route.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/auth/components/protected-route.tsx)
- **Hooks**:
  - [`use-auth.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/auth/hooks/use-auth.ts)

#### Feature: `nib`
- **Hooks**:
  - [`use-ingestion-status.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-ingestion-status.ts)
  - [`use-merge-pdf.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-merge-pdf.ts)
  - [`use-nib-chat.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-nib-chat.ts)
  - [`use-nib-state.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-nib-state.ts)
  - [`use-nib-upload.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-nib-upload.ts)
  - [`use-pdf-search.ts`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/app/features/nib/hooks/use-pdf-search.ts)

#### Feature: `upload`

### Shared Global Components (`frontend/components`)

- [`ui/drawer.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/components/ui/drawer.tsx)
- [`ui/dropdown-menu.tsx`](file:////Users/rmeji/Desktop/Coding/Nib/frontend/components/ui/dropdown-menu.tsx)

<!-- END_AUTO_MAP -->

---

## 3. Agent Changelog & Decisions

This section is maintained by AI coding agents to track architectural updates, new dependencies, or pattern adjustments. When adding new capabilities, append an entry to the log below.

### Log
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-20**: Implemented global cursor-pointer styles for all buttons/interactive elements, and explicitly changed radix dropdown items from cursor-default to cursor-pointer in `ui/dropdown-menu.tsx`.
- **2026-05-19**: Added document upload, listing, and PDF merge features. New files: `lib/api/documents.ts` (API client), `app/features/nib/hooks/use-nib-upload.ts` (auto-upload local file to backend), `app/features/nib/hooks/use-merge-pdf.ts` (merge PDFs via backend). Updated: `upload-context.tsx` (added `documentId`, `documentUrl`, `setDocument`), `home/hooks/use-documents.ts` (real API replacing mock data), `home/page.tsx` (document grid now real, click navigates to viewer), `nib-viewer.tsx` (uses `documentUrl` for loaded documents, combine button triggers real merge), `nib-app.tsx` (mounts `useNibUpload`).
- **2026-05-20**: Wired up `@tanstack/react-virtual` in `nib-viewer.tsx` for the thumbnail sidebar to prevent performance tanking on large PDFs, and limited thumbnail `devicePixelRatio` to 1.
- **2026-05-20**: Replaced dead "Filter" button with a working `SearchFilterPopover` component (`app/home/components/search-filter-popover.tsx`). Added `sortBy` state (client-side sort across all views), active filter chips inline in the search bar (mobile fallback row below), and "Jump to" view shortcuts + collection combobox inside the popover. Sort applies to currently-loaded pages only.
- **2026-05-20**: Added `/settings` page with 7 tabs (Profile, Appearance, PDF Reader, AI & Chat, Privacy & Data, Shortcuts, About). Created `app/settings/hooks/use-settings.ts` (localStorage-backed settings with accent color applied via CSS custom properties). Replaced the inline user panel + sign-out icon in `home/page.tsx` with `app/home/components/user-menu.tsx`, a Radix DropdownMenu that links to Settings, Keyboard shortcuts, and Sign out.
- **2026-05-20**: Implemented ViewPanel to lazily mount and persist views (prevents PDF canvas destruction/remount logic). Split docsGridRef for grid animations per-view. Fixed selectedCollectionId hydration when returning to library view.
- **2026-05-21**: Phase 1 RAG frontend wiring. New files: `lib/api/chat.ts` (getOrCreateSession, sendChatQuery, fetchSessionMessages), `app/features/nib/hooks/use-ingestion-status.ts` (TanStack Query polling every 2 s until COMPLETE/FAILED). Modified: `lib/api/documents.ts` (added IngestionStatus interface + fetchIngestionStatus), `hooks/use-nib-chat.ts` (full rewrite — real Gemini chat via sendChatQuery, session init on mount, historical message hydration, parseSegments maps [Page X] → Citation chips, animated reasoning steps during fetch), `nib-app.tsx` (reads documentId from useUpload context, passes isIndexing/progress/pagesTotal/pagesProcessed to ChatPanel), `nib-chat.tsx` (IndexingBanner component with progress bar + pulse dot, dynamic subtitle, composer disabled while indexing).

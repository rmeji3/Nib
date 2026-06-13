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
- **2026-06-13**: Extended the reactive icon animations. `StarButton` now anchors its burst to the icon and supports an optional `label`, so the featured "Most recent" card's Star/Starred button uses it too; a new shared `DeleteButton` gives the move-to-trash and remove-from-collection icons the same springy pop + burst (red/orange) in both the grid card and list row.
- **2026-06-13**: Made the document star button reactive. `use-documents.ts` `useToggleStarDocument` now does an optimistic flip across all cached `['documents']` lists (with rollback on error) so the icon changes instantly; `app/home/page.tsx` adds a shared `StarButton` component with a springy pop, an un-star settle, a radiating burst ring, and a glow on the active star, used by both the grid card and list row; `globals.css` adds `star-pop`/`star-pop-off`/`star-burst` keyframes.
- **2026-06-13**: Turned the home-screen floating button into an animated speed-dial. `app/home/page.tsx` now tracks `fabOpen` state; the FAB rotates its `+` into an `×` and springs out two labeled actions ("New file" → upload dialog, "New collection" → create-collection dialog) with a dimming backdrop that closes the dial on outside click.
- **2026-06-10**: Made queued chat messages visibly distinct in the UI. `nib-chat.tsx` now shows a "Waiting in queue" assistant byline pill plus helper copy for queued prompts, and `globals.css` adds a dashed queued bubble treatment.
- **2026-06-10**: Changed chat queueing to work during active answer generation. `use-nib-chat.ts` now keeps a FIFO prompt queue with optimistic user/assistant rows, drains one prompt at a time after the current answer finishes, and preserves queued rows from message hydration; `nib-chat.tsx` labels waiting queued placeholders as "Queued."
- **2026-06-10**: Added queued chat submission during loading. `use-nib-chat.ts` now stores one prompt submitted while a session/history is loading and flushes it once ready, while `nib-chat.tsx` keeps the composer enabled for queueable loading states and turns the send button white when text is ready to send.
- **2026-06-10**: Persisted assistant message menu actions. `lib/api/chat.ts` now wraps backend message delete/report endpoints, `use-nib-chat.ts` uses mutations for persistent report/delete behavior, and loaded assistant messages preserve their reported state.
- **2026-06-10**: Added functional assistant answer actions. `use-nib-chat.ts` can regenerate an assistant response from the preceding user prompt and remove a message from the current view; `nib-chat.tsx` wires Regenerate plus a More menu for copy-with-citations, open evidence, report answer, and delete message.
- **2026-06-10**: Refined chat action UX. New empty chats now bypass the previous-message loading spinner, assistant Copy buttons write the rendered answer text to the clipboard with a copied check state, and `nib-viewer.tsx` includes a shared check icon.
- **2026-06-10**: Changed chat-history delete loading indicators to spin the regular `NibLogo` SVG instead of using the Lottie loader, keeping the Lottie animation reserved for assistant/chat loading states.
- **2026-06-10**: Updated chat confidence display to use persisted backend answer-confidence scores. `ApiChatMessage` now carries nullable confidence/groundedness values from saved answer audits, refreshed chats no longer invent fallback confidence values, and the UI label now reads "answer confidence."
- **2026-06-10**: Added per-document chat history deletion. `lib/api/chat.ts` now wraps `DELETE /api/v1/chat/sessions/{sessionId}`, `use-nib-chat.ts` exposes an async delete mutation with active-session cleanup, and `nib-chat.tsx` renders a trash action, confirmation dialog, loading state, and animated removal for chat history rows.
- **2026-06-10**: Added a chat-history loading state. `use-nib-chat.ts` exposes `isLoadingMessages`, and `nib-chat.tsx` shows the Nib Lottie loader instead of empty-chat suggestions while a selected previous conversation is hydrating.
- **2026-06-10**: Changed document chat entry to open on the Chats tab. `use-nib-chat.ts` no longer auto-selects or hydrates the most recent/stored session on document load; previous chat messages load only after the user selects a conversation, preventing repeated previous-chat hydration loops.
- **2026-06-10**: Fixed previous-chat hydration causing a maximum update depth warning. `use-nib-chat.ts` now signatures backend and local chat messages before hydrating, so loading an existing conversation does not repeatedly remap identical saved messages into new React state.
- **2026-06-10**: Fixed a `useNibChat` maximum update depth loop. The session-selection effect now avoids repeatedly enqueueing the same active-session update and preserves existing empty message arrays when a document has no chat sessions.
- **2026-06-10**: Replaced the assistant message byline dot with Nib branding. Added `app/components/logo-loader.tsx` using `lottie-react` and `public/logo-loader.json`; `nib-chat.tsx` now shows the animated logo next to `Nib Assistant` while waiting for an assistant response and the static `NibLogo` otherwise.
- **2026-06-10**: Made AI chat hydration persist per document. `use-nib-chat.ts` now loads sessions, starters, and messages through TanStack Query keys scoped by document/session, remembers the selected chat id in localStorage per document, and invalidates chat queries after sends so refreshes restore backend-saved conversations.
- **2026-06-10**: Updated the top toolbar Chat button beam to glow only while the chat panel is minimized. The `BorderBeam` wrapper now uses `active={chatMinimized}` and zero strength when the chat is already open.
- **2026-06-10**: Removed the chat header's transient `Thinking...` title while answers are pending. The header now stays on `Ask this document` during assistant generation so the only thinking copy is the shimmer label in the message stream.
- **2026-06-10**: Restored the chat panel to a contained `BorderBeam size="pulse-inner" colorVariant="colorful"` glow while keeping the composer input on `pulse-outside`. Removed the extra chat-panel outside drop-shadow halo so the waiting-state glow stays inside the chat box.
- **2026-06-10**: Removed the three-dot thinking indicator from the pending assistant state. `ThinkingText` now renders only the accessible shimmer label, and the unused SVG dot styles/reduced-motion rules were removed from `globals.css`.
- **2026-06-10**: Switched the composer input to `BorderBeam size="pulse-outside" colorVariant="colorful"` and tested the same pulse treatment on the chat panel before restoring the panel to an inner glow.
- **2026-06-10**: Tuned the `Thinking` shimmer treatment with shared CSS color variables, explicit stop positions, and a 1.75s sweep timing.
- **2026-06-10**: Replaced the top toolbar Chat button's custom keyframe glow with the shared `BorderBeam` treatment. `nib-viewer.tsx` now wraps the Chat toggle in `BorderBeam`, and the old Chat FAB glow/seam CSS was removed from `globals.css`.
- **2026-06-10**: Tightened the waiting-state composer beam to wrap only the input field and send button instead of the full composer footer. The `Thinking` label shimmer now uses explicit gradient stops with a visible text fallback so the word remains readable even if clipped gradient text is unavailable.
- **2026-06-10**: Removed the small `BorderBeam` frame from the pending assistant thinking message. `Thinking` now stays as inline shimmer text, while the chat panel and composer input still show the active beam during real or preview loading states.
- **2026-06-10**: Added the waiting-state beam to the chat input and a dev preview mode. `Composer` now wraps the input box in `BorderBeam` while the assistant is thinking, and `ChatPanel` supports `?previewThinking=1` in development to pin the chat in a synthetic loading state so the panel beam, input beam, and thinking shimmer text can be inspected without waiting on an API call.
- **2026-06-10**: Preserved the accessible `Thinking...` status label and existing thinking text shimmer styling while iterating on the pending assistant visual treatment.
- **2026-06-10**: Replaced the waiting-state ambient chat glow with `border-beam`. Added the `border-beam` dependency and wrapped the full chat panel with an active beam while the assistant is waiting, while leaving the pending `Thinking...` shimmer text unboxed.
- **2026-06-10**: Added typed answer reveal animation for new assistant responses. Fresh chat answers now carry an `animate` flag, `nib-chat.tsx` reveals paragraphs and bullet items with a typewriter budget before fading in citation cards/actions, and `globals.css` strengthens the `Thinking...` shimmer with webkit text clipping, drop-shadow glow, a caret blink, section fade-in, and reduced-motion fallbacks.
- **2026-06-10**: Simplified the pending chat answer state. `use-nib-chat.ts` no longer cycles through provider-specific loading steps while a query is in flight, and `nib-chat.tsx` now renders a single accessible `Thinking...` shimmer using CSS gradient text in `globals.css`, with reduced-motion support.
- **2026-06-10**: Improved assistant answer readability with structured rendering. Chat answer normalization now converts stray asterisk and inline hyphen bullets into real list breaks, expands combined `[B1, B2]` citations before parsing, and `nib-chat.tsx` renders assistant answers as paragraph/list blocks with separated critique bullets and clickable inline citations instead of one dense text stream.
- **2026-06-10**: Tolerated stale document records whose storage object was manually deleted. `DocumentResponse.storageUrl` and home `DocumentItem.storageUrl` are now nullable, stale rows show a missing-file state without fetching thumbnails, open actions are disabled, and direct `/document/{id}` visits show a recovery message instead of hanging.
- **2026-06-10**: Fixed new-chat starter and block-citation rendering. `use-nib-chat.ts` now seeds local starter prompts immediately for empty chats instead of waiting on the backend starter request, and the chat parser maps backend `[B#]` citations to clickable evidence chips using the richer `CitationDto` fields exposed in `lib/api/chat.ts`.
- **2026-06-10**: Reinforced empty-chat starter visibility. Fresh chats and first-prompt session creation now restore the local default conversation starters whenever backend starter data is unavailable, so new empty chats still show suggested prompts.
- **2026-06-10**: Fixed first-chat creation and silent chat failures. `use-nib-chat.ts` no longer creates an empty session on document open, creates the first session on demand when the user presses New or sends the first prompt, allows New when zero chats exist while still blocking duplicate empty chats, and surfaces session/query errors through `nib-chat.tsx`.
- **2026-06-10**: Prevented newly uploaded/opened PDFs from flashing before ingestion completes. `use-ingestion-status.ts` now treats the initial status fetch as indexing and exposes `shouldHideDocument`; `nib-app.tsx` passes that gate into `nib-viewer.tsx`, which avoids fetching or mounting `react-pdf` content until ingestion reaches `COMPLETE` and shows an indexing/failed state instead.
- **2026-06-10**: Improved the document chat UX with a dedicated Chat/Chats view switcher, a full conversation list, disabled new-chat controls while the active chat is empty, and resilient fallback conversation starters so new chats still show useful prompts when the backend starter endpoint is unavailable.
- **2026-06-10**: Added multi-chat UI behavior for document chat. `lib/api/chat.ts` now supports listing/creating sessions and fetching backend-generated starters; `use-nib-chat.ts` tracks the active session, switches histories per session, creates real new backend chats, and only shows conversation starters while the selected chat is empty. `nib-chat.tsx` adds compact session tabs and removes repeated starter prompts after a conversation begins.
- **2026-06-10**: Added a settings cost dashboard for per-user visibility into metered backend activity. New `lib/api/cost.ts` wraps `GET /api/v1/users/me/cost-dashboard`, `app/settings/hooks/use-cost-dashboard.ts` provides the TanStack Query hook, and `app/settings/components/cost-dashboard.tsx` renders estimated spend, usage counters, token totals, recent events, and a 30-day activity chart inside the AI & Chat settings tab.
- **2026-05-20**: Created the initial `GUIDE.md` skeleton and implemented the guide update automation script.
- **2026-05-20**: Implemented global cursor-pointer styles for all buttons/interactive elements, and explicitly changed radix dropdown items from cursor-default to cursor-pointer in `ui/dropdown-menu.tsx`.
- **2026-05-19**: Added document upload, listing, and PDF merge features. New files: `lib/api/documents.ts` (API client), `app/features/nib/hooks/use-nib-upload.ts` (auto-upload local file to backend), `app/features/nib/hooks/use-merge-pdf.ts` (merge PDFs via backend). Updated: `upload-context.tsx` (added `documentId`, `documentUrl`, `setDocument`), `home/hooks/use-documents.ts` (real API replacing mock data), `home/page.tsx` (document grid now real, click navigates to viewer), `nib-viewer.tsx` (uses `documentUrl` for loaded documents, combine button triggers real merge), `nib-app.tsx` (mounts `useNibUpload`).
- **2026-05-20**: Wired up `@tanstack/react-virtual` in `nib-viewer.tsx` for the thumbnail sidebar to prevent performance tanking on large PDFs, and limited thumbnail `devicePixelRatio` to 1.
- **2026-05-20**: Replaced dead "Filter" button with a working `SearchFilterPopover` component (`app/home/components/search-filter-popover.tsx`). Added `sortBy` state (client-side sort across all views), active filter chips inline in the search bar (mobile fallback row below), and "Jump to" view shortcuts + collection combobox inside the popover. Sort applies to currently-loaded pages only.
- **2026-05-20**: Added `/settings` page with 7 tabs (Profile, Appearance, PDF Reader, AI & Chat, Privacy & Data, Shortcuts, About). Created `app/settings/hooks/use-settings.ts` (localStorage-backed settings with accent color applied via CSS custom properties). Replaced the inline user panel + sign-out icon in `home/page.tsx` with `app/home/components/user-menu.tsx`, a Radix DropdownMenu that links to Settings, Keyboard shortcuts, and Sign out.
- **2026-05-20**: Implemented ViewPanel to lazily mount and persist views (prevents PDF canvas destruction/remount logic). Split docsGridRef for grid animations per-view. Fixed selectedCollectionId hydration when returning to library view.
- **2026-05-21**: Phase 1 RAG frontend wiring. New files: `lib/api/chat.ts` (getOrCreateSession, sendChatQuery, fetchSessionMessages), `app/features/nib/hooks/use-ingestion-status.ts` (TanStack Query polling every 2 s until COMPLETE/FAILED). Modified: `lib/api/documents.ts` (added IngestionStatus interface + fetchIngestionStatus), `hooks/use-nib-chat.ts` (full rewrite — real Gemini chat via sendChatQuery, session init on mount, historical message hydration, parseSegments maps [Page X] → Citation chips, animated reasoning steps during fetch), `nib-app.tsx` (reads documentId from useUpload context, passes isIndexing/progress/pagesTotal/pagesProcessed to ChatPanel), `nib-chat.tsx` (IndexingBanner component with progress bar + pulse dot, dynamic subtitle, composer disabled while indexing).

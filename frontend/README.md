# Frontend Coding Guidelines

This document outlines the professional frontend engineering standards, conventions, and architectural guidelines for the Nib Next.js application.

---

## 1. Project Structure & Organization

We use a feature-based folder structure to keep our components, hooks, and logic modular and scale-friendly.

- **`/app/`**: Next.js App Router folders representing routes and layouts.
- **`/app/features/`**: Contains core product feature modules (e.g., `nib`). Each feature folder should encapsulate its own logic:
  - `components/`: Feature-specific UI components (e.g., `nib-viewer.tsx`, `nib-chat.tsx`).
  - `hooks/`: Feature-specific React hooks (e.g., `use-nib-state.ts`, `use-chat-messages.ts`).
  - `types/` or `types.ts`: Feature-specific TypeScript interfaces.
  - `api/` or `services/`: Feature-specific API clients or endpoint requests.
- **`/components/`** (Root level or inside `/app/` if shared): Global, reusable UI primitives (e.g., Button, Dialog, Tooltip, Input) that are highly customizable and project-wide.

### Guidelines for Separating Concerns
1. **No Giant Files**: Component files should focus on a single responsibility. If a component exceeds ~200-300 lines of code, evaluate if it can be broken down into smaller sub-components.
2. **Extract Business & Stateful Logic**: Do not litter components with complex state management, page-level logic, or side effects. Move them to custom React hooks.
3. **Pure Presentational Components**: Keep components as close to "presentational" as possible, receiving state and handlers via props, and leaving state orchestration to parent layouts or hooks.

---

## 2. State Management & Data Fetching (TanStack Query)

We use **TanStack Query (React Query)** to handle all asynchronous server-state fetching, caching, synchronization, and mutation.

### Core Rules
- **No Raw `useEffect` Fetching**: Do not use `useEffect` + `fetch` to retrieve API data. Always use TanStack Query.
- **Separate API Client**: Keep the raw API fetching functions (using `fetch` or `axios`) inside API service files, separate from components and hook files.
- **Wrap in Custom Hooks**: Do not call `useQuery` or `useMutation` directly in visual components. Wrap them in custom hooks.
  - *Example*: Create `useDocument(docId)` which wraps `useQuery({ queryKey: ['document', docId], queryFn: () => getDocument(docId) })`.
- **Handle States Cleanly**: Explicitly handle and render `isLoading`, `isError`, and `data` states. Provide skeleton screens or spinners during loading states.

---

## 3. Styling & Responsive Design (TailwindCSS)

We use **TailwindCSS v4** for all styling.

### Core Rules
- **Utility-First**: Style everything using utility classes. Avoid inline style objects unless calculating dynamic positioning or layout properties (e.g., CSS Custom Properties for drag-and-drop or PDF coordinates).
- **Mobile-First Responsiveness**:
  - Always design layouts with a mobile-first perspective.
  - Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) to adapt layouts for tablet and desktop viewports.
  - *PDF Viewer layout requirement*: On desktop, use a side-by-side split pane (PDF on left, Chat on right). On mobile, stack them vertically or use a toggleable tab/drawer mechanism.
- **Interactive Feedback**:
  - Ensure all interactive elements (buttons, links, form inputs) have clear `:hover`, `:focus-visible`, and `:active` styles.
  - Use transitions (`transition-all duration-200`) for smooth state changes.
- **Accessible Color Contrast**: Ensure text-to-background contrast ratios meet WCAG AA standards. Use tailwind palettes carefully.

---

## 4. Debouncing & Event Optimization

- **Debounce Search & Inputs**: Any text inputs that trigger network requests, database queries, or heavy list filtering must be debounced (typically `300ms` to `500ms`).
- **Custom Hooks**: Use a custom `useDebounce` hook or a lightweight utility for text input state to avoid unnecessary queries or intermediate re-renders.

---

## 5. Accessibility (a11y) & 3rd Party Components

We prioritize visual and structural accessibility.

- **Use Accessible Primitives**: For complex interactive widgets (e.g., Modals/Dialogs, Dropdowns, Tooltips, Comboboxes/Selects, Tabs), always use a robust, pre-tested accessible library rather than coding from scratch.
  - Preferred options: **Radix UI**, **Headless UI**, or **Shadcn UI** primitives.
- **Semantic HTML**: Use proper semantic HTML tags (`<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<button>`) instead of nested `<div>`s where possible.
- **Keyboard Navigation**: Ensure users can navigate the application entirely via keyboard:
  - Interactive elements must be focusable.
  - Modals must catch focus and close on `Escape`.
  - Use custom focus outlines (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **ARIA Attributes**: When building interactive custom elements, manage ARIA states (e.g., `aria-expanded`, `aria-haspopup`, `aria-label`).

---

## 6. UX & UI Excellence

- **Visual Polish**:
  - Use smooth animations (e.g., slide-ins, fade-ins) to transition modal screens and panels.
  - Apply clean borders, subtle gradients, drop-shadows, and glassmorphism elements to give a premium, state-of-the-art feel.
- **Loading & Skeleton States**: Never leave a user looking at a blank screen. Provide placeholder skeletons matching the layout of the loading content.
- **Actionable Error States**: When API queries fail, display clear, user-friendly error messages with clear retry options.
- **Optimistic Updates**: For operations with high latency (e.g., sending a chat message, highlighting a PDF section), implement optimistic updates via TanStack Query to keep the UI feeling fast and responsive.

---

## 7. TypeScript & Code Quality

- **Strict Typing**: Enforce strong types. Avoid the use of `any` at all costs. If a type is unknown or dynamic, use `unknown` or a generic.
- **Consistent File Naming**: Use kebab-case for file names (e.g., `nib-viewer.tsx`, `use-debounce.ts`).
- **API Interfaces**: Define interfaces for all REST request bodies and response payloads.

---

## 8. Design Systems & Inspiration Reference

For UI designs, layouts, visual style inspiration (e.g., premium gradients, dark modes, spacing, grids, typography), refer to the analyzed design system assets in the [design-md](file:///a:/Coding/nib/design-md) folder at the root of the repository.

Important inspiration references:
- **Linear.app** style: See [linear.app/DESIGN.md](file:///a:/Coding/nib/design-md/linear.app/DESIGN.md) for developer tool dark interfaces, clean filters, list groups, and state indicators.
- **Stripe** style: See [stripe/DESIGN.md](file:///a:/Coding/nib/design-md/stripe/DESIGN.md) for gorgeous cards, layouts, typography, and premium animations.
- **Apple** style: See [apple/DESIGN.md](file:///a:/Coding/nib/design-md/apple/DESIGN.md) for minimalist whitespace, high-end product spacing, and typography.
- **Vercel** style: See [vercel/DESIGN.md](file:///a:/Coding/nib/design-md/vercel/DESIGN.md) for clean grid layouts, dashboard panels, and sleek dark mode switches.
- **Cursor** style: See [cursor/DESIGN.md](file:///a:/Coding/nib/design-md/cursor/DESIGN.md) for code/editor settings tabs and interactive inputs.

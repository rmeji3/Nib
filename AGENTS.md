<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Required Project Context

Always read `README.md` before planning or writing code. Treat it as the source of truth for goals and architecture.

You MUST also read and keep updated [frontend/GUIDE.md](file:///a:/Coding/nib/frontend/GUIDE.md) when working on the frontend.

# Frontend Development Rules & Best Practices

For all tasks modifying the Next.js frontend (in `/frontend`), you MUST read and follow the detailed rules in [frontend/README.md](file:///a:/Coding/nib/frontend/README.md) and [frontend/GUIDE.md](file:///a:/Coding/nib/frontend/GUIDE.md). Pay special attention to:

- **Component & Hook Separation**: Do not write large components with inline logic. Extract business logic, state management, and effects into custom React hooks.
- **Styling**: Use TailwindCSS v4. Build mobile-first, ensuring responsive layouts (e.g. desktop split-pane vs. mobile stacked/drawer view). Provide clear hover, focus, active, and disabled states.
- **Data Fetching & Server State**: Use TanStack Query (React Query) for all fetching/mutating. Wrap them in custom hooks (e.g. `useDocument`). Never fetch raw API data in a `useEffect` loop.
- **Event Optimization**: Use debouncing for input searches, filters, or resize triggers to prevent redundant API queries.
- **Accessibility & UX**: Use accessible 3rd-party components (e.g. Radix, Headless UI, Shadcn) for complex controls (Dialogs, Tooltips, Selects). Ensure keyboard navigability and focus states.
- **Code Quality**: Enforce strict TypeScript types. Avoid the `any` type completely.
- **Design Inspiration**: Refer to the analysed design system guides in [design-md](file:///a:/Coding/nib/design-md) (e.g., Stripe, Linear, Apple, Vercel) for inspiration on premium aesthetics, layout, colors, typography, cards, and interactive behaviors.
- **Documentation Sync**: When you add, remove, or modify folders, files, or hooks on the frontend, you MUST run `npm run update-guides` to update the directory map in `frontend/GUIDE.md`, and manually append a brief note under its "Agent Changelog & Decisions" section.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:springboot-backend-agent-rules -->
# Backend Development Rules

For all tasks that touch the Java/Spring Boot backend located in `/backend`, you must follow these guidelines:

- Read [backend/README.md](file:///a:/Coding/nib/backend/README.md) and [backend/GUIDE.md](file:///a:/Coding/nib/backend/GUIDE.md) to understand the architecture, package structure, and conventions. Keep the guide updated.
- Standard Spring Boot practices apply, but pay special attention to:
  - Using constructor injection and using Lombok annotations correctly.
  - Using Java `records` for DTOs.
  - Ensuring `FetchType.LAZY` is used on relational mappings.
  - Validating input request bodies via `jakarta.validation`.
  - Creating mock tests for any third-party AI or storage integrations.
  - **Documentation Sync**: When you add, remove, or modify services, controllers, entities, or endpoints, you MUST run `npm run update-guides` to update the structure and endpoint map in `backend/GUIDE.md`, and manually append a brief note under its "Agent Changelog & Decisions" section.
<!-- END:springboot-backend-agent-rules -->

# Butterfly

> **Work in progress.** This repository is a polished, integration-ready UI prototype. It is suitable for product review and backend wiring, but it is not a production service.

Butterfly is a React workspace for reviewing an advertiser's own Meta creative. It includes the public marketing surface, sign-in and import flows, an ad library, saved groups, JEV analysis and evidence, transcripts and timelines, neural ideation, batch ad creation, Creative Canvas, a work queue, team management, settings, and a live design-system catalogue.

## Live review

- [Marketing site](https://butterfly-6lc.pages.dev/)
- [Application workspace](https://butterfly-6lc.pages.dev/app/ads)
- [Interactive design system](https://butterfly-6lc.pages.dev/app/demo/design-system)

The interface uses local fixtures and browser storage. It does **not** contain live Meta OAuth/API access, a JEV service, real authentication, invitation delivery, publishing, or backend persistence. Sample delivery figures and analysis must never be presented as connected customer data.

## Run locally

Requirements: Node `20.19+` or `22.12+`, and npm `11+`.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:5178`.

Useful commands:

```bash
npm run build
npm run test:design-system
npm run test:interactions
npm test
npm run preview
```

Playwright tests require Chromium:

```bash
npx playwright install chromium
```

## Product map

- `/` — public marketing site
- `/app/login` — local sign-in fixture
- `/app/add` — Meta import and local upload
- `/app/ads` — creative library and saved groups
- `/app/ads/:id` — JEV review, performance, transcript, evidence, notes, and versions
- `/app/create` — batch creative and paused-ad handoff rehearsal
- `/app/canvas` — local creative review board
- `/app/work` — review, draft, and completed work queues
- `/app/team` — local members, roles, and invitations
- `/app/settings` — sources, analysis properties, workspace, and profile
- `/app/demo/design-system` — canonical interactive component catalogue
- `/app/demo/jev-analysis` — complete JEV task specimen

Tabs and workflow stages are URL-backed so every important surface can be opened directly. At an app subdomain, product routes live at the hostname root; localhost keeps them under `/app/*` for convenient review.

## Architecture

- `src/App.tsx` — route map and legacy redirects
- `src/components/app-shell.tsx` — desktop sidebar, collapsed rail, and mobile drawer
- `src/design-system/` — tokens, shared components, catalogue, and component contract
- `src/pages/` — route-level screens and page-specific styling
- `src/data/ads.ts` — creative fixtures and local upload state
- `src/data/jev.ts` — extensible analysis-property registry and sample findings
- `src/lib/` — local groups, drafts, versions, lifecycle, and storage helpers
- `registry/` — editable local component-registry snapshots
- `scripts/` — interaction, regression, scale, and visual checks
- `public/` — runtime creative assets and SPA support files

See [Product and integration boundary](docs/product-and-integration.md) and [Design system](docs/design-system.md) before connecting live services.

## Design-system rules

- Archivo Narrow owns human-readable UI. JetBrains Mono is limited to compact data and machine roles.
- Page and section titles, tabs, structural labels, breadcrumbs, and actions use the governed uppercase treatment.
- The primary action uses the Butterfly gradient `#C2185B → #8B1A75` with white content.
- Pill geometry is for actions, statuses, filter chips, segmented choices, and switches. Inputs, menus, dates, uploads, tables, accordions, evidence, and media use square or soft-square geometry.
- Reels and Stories use an uncropped 9:16 stage. Other media retains its source ratio.
- The catalogue identifies the 21st.dev and shadcn interaction references adopted into Butterfly-owned components. Those references inform behavior; Butterfly tokens remain the visual authority.

## Current WIP boundary

The UI, responsive states, and local workflows are ready for integration work. The next phase is replacing fixture adapters with real authentication, Meta, JEV, persistence, invitation, and publishing services while retaining the existing component and route contracts.

Do not enable live publishing by default. The current send flow deliberately creates local **PAUSED demo receipts** only.

No license file is included. The source is shared as work in progress for review and continued development.

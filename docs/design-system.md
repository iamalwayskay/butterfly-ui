# Butterfly design system

The canonical, interactive reference is `/app/demo/design-system`. Review components there and in their real product routes before changing shared tokens.

## Foundations

- Raw values live in `src/design-system/tokens/primitive.css`.
- Product meaning lives in `src/design-system/tokens/semantic.css`.
- Reusable component contracts live in `src/design-system/tokens/component.css`.
- Shared React components are exported through `src/design-system/components/index.ts`.
- Route composition may use page CSS, but it must consume shared tokens and components.

## Visual language

- White, ink, and restrained neutral surfaces form the workspace.
- The action gradient is `#C2185B → #8B1A75`; teal/cyan is not an action, selection, focus, link, chart, or scrollbar colour.
- Archivo Narrow is the interface family. JetBrains Mono is reserved for compact technical data.
- Structural roles use uppercase; names, evidence, findings, and prose retain natural case.
- Actions and compact states may be pills. Fields, menus, calendars, uploads, tables, accordions, evidence, and media are square or soft-square.
- Creative is the strongest visual element. Reels and Stories render on an uncropped 9:16 stage.

## Interaction rules

- Every control has a visible label or an accessible name.
- Focus uses one close-fitting ring and never relies on colour alone.
- `Escape` dismisses bounded overlays and returns focus to the opener.
- Destructive actions use an alert dialog with a safe initial action.
- Tabs switch peer content; side navigation and breadcrumbs change routes; chips filter data.
- Popovers own compact, non-blocking controls. Sheets own longer mobile or evidence tasks. Dialogs own short blocking decisions.
- The document owns page scrolling. Local scroll is limited to bounded menus, sheets, and deliberately scrollable data regions.
- Motion is functional, short, and disabled under `prefers-reduced-motion`.

## Component sources

The local `registry/` and catalogue record adaptations from 21st.dev, shadcn, and Radix patterns. Use those as interaction references, then express them through Butterfly tokens and shared components. Do not paste a second visual theme into a route.

## Verification

For any shared-system change:

1. Add or update the catalogue specimen.
2. Verify its actual product route.
3. Check keyboard behavior and focus restoration.
4. Check desktop, intermediate, 390px, and 320px widths.
5. Run `npm run test:design-system`, `npm run test:interactions`, and `npm run build`.

The detailed component anatomy and extension contract remains in `src/design-system/README.md`.

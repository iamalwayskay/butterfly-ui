# Butterfly design system

Butterfly is a white workspace for inspecting creative evidence. Its identity is a monochrome canvas, one consistent configurable interface family and one pink-to-magenta action gradient, with brighter pink/magenta reserved for deliberate editorial highlights. The review catalogue defaults to Archivo Narrow Medium and can switch the entire preview to JetBrains Mono for comparison.

Use clipped or notched geometry only for high-signal active states and compact summaries. It is an accent, not a container default. Product panes remain flush, surfaces group through seams and gentle fills, and focus uses one close-fitting ring rather than stacked outlines.

## Foundations

- Tokens have three layers: raw primitives, semantic roles, then component contracts. Components consume only component or semantic roles.
- The review configuration binds every type alias to one selected family—Archivo Narrow or JetBrains Mono—so headings, controls, prose and data cannot drift into an accidental mix. The choice, weight, casing and density persist locally and reset to Archivo Narrow Medium with uppercase structural roles.
- Typography is specified as a complete role: page 34/36 medium, section 28/32 medium, structural control 14/20 semibold, body 15/23 regular, supporting 13/18 regular and metadata 12/17 regular. Use only 400, 500 and 600 weights. Use tabular numerals for time and confidence values. Density changes spacing, never readability.
- Spacing follows 3/5/8/13/21/34/55px. Controls are 44px and the radius scale is 5px micro, 8px control, 13px panel, and 21px media/dialog; pill is reserved for true pills.
- Hover changes one surface step. Pressed controls do not scale. Focus is one close-fitting 2px inset action-colour ring; never add a detached outline or second halo.
- State always has a word or icon as well as colour. Sample data is always labelled `Sample`.

| Role | Token | Size / leading | Weight | Family |
|---|---|---|---|---|
| Page title | `--type-page` | 34 / 36 | selected 400/500 | Selected family |
| Section title | `--type-section` | 28 / 32 | selected 400/500 | Selected family |
| Card title | `--type-card` | 18 / 24 | selected 400/500 | Selected family |
| Body | `--type-body` | 15 / 23 | 400 | Selected family |
| Supporting copy | `--type-supporting` | 13 / 18 | 400 | Selected family |
| Control | `--type-control` | 14 / 20 | selected 400/500 | Selected family |
| Metadata | `--type-metadata` | 12 / 17 | selected 400/500 | Selected family |
| Machine data / provenance | `--type-data` | 12 / 17 | selected 400/500 | Selected family |

Page/section titles, tabs, navigation, structural labels and actions use the uppercase interface treatment with role-owned tracking. Names, findings, evidence, values and prose retain natural case. Compact data may use tabular numerals.

## Package and extension contract

`tokens/primitive.css` owns raw values, `tokens/semantic.css` assigns product meaning, and `tokens/component.css` is the only place reusable components define their public visual contract. Shared React components consume their own namespace (`--button-*`, `--accordion-*`, `--property-row-*`, and so on), even when several aliases currently resolve to the same semantic value. A scoped override can therefore change one component family without rewriting selectors; changing an accordion token changes both catalogue and JEV implementations.

`index.css` is the shared entrypoint: fonts, the three token layers, and reusable component CSS only. Catalogue and JEV page styles are route-owned and imported by their pages, so importing the system never imports demonstration layouts. `components/index.ts` is the public TypeScript boundary; product and catalogue code do not deep-import component modules.

To add or extend a component:

1. Reuse an existing primitive and semantic role, adding one only when its meaning is genuinely new.
2. Add the component's stable appearance, geometry, and state aliases to `tokens/component.css`.
3. Implement the `.bf-*` component against that namespace and export its component, props, variants, and item types from `components/index.ts`.
4. Add meaningful states to the catalogue and record product coverage in `docs/component-coverage.md`.
5. Add a structural test proving the public export and component-token consumption, then verify the catalogue and product context at desktop and 390px.

One-off page composition may use route CSS, but it must consume shared semantic/component tokens. It cannot recreate an existing primitive under `.ds-*` or `.jev-*`.

## Button

Use the pink-to-magenta gradient once per task region for the action that advances work. Secondary buttons use a subtle fill; outline buttons have an explicit boundary when that affordance is needed. Quiet and icon utility buttons are transparent. Selected utilities use a subtle fill and an inset selection edge with `aria-pressed`. Destructive actions are red, require explicit wording, and never share the gradient.

Primary buttons are 44px, flat, borderless, uppercase by default, and use `#C2185B → #8B1A75` with white content. They never use inset highlights, glow, elevation, or wrapped labels. `IconButton` supplies an accessible name and collision-aware Radix tooltip on hover or keyboard focus. Every icon-size button retains a 44px target. Buttons retain their dimensions while loading, set `aria-busy`, and replace the leading icon with a spinner. Actions start with a verb. Geometry is fixed by component role: actions, statuses, filter chips, segmented choices and switches are pills; fields, menus, dates, uploads, tables, accordions, evidence and media use square or soft-square geometry. Density remains user-selectable.

## Accordion

Use accordions for the seven JEV property groups because the groups share one analysis flow and users need to compare more than one group. Never use an accordion for primary navigation, unrelated settings pages, or content that must be compared continuously.

- Multiple JEV groups may remain open. Preserve expansion while the user remains on the ad.
- The whole 44px-minimum header toggles. It contains title, finding count, unresolved count, and a fixed-width chevron.
- `Enter` and `Space` toggle; focus stays on the header. The chevron rotates without moving layout.
- A selected property uses a whole-row surface with an explicit pressed/selected state. It never adds a decorative leading rule. Expanded group labels and chevrons use the action accent together.
- A collapsed group still displays unresolved/error markers; never hide a validation failure or active evidence without a group-level marker.
- On mobile the same disclosure model remains; it does not turn into a dropdown.

## Select, combobox, filter, or menu?

| Need | Component | Rule |
|---|---|---|
| Choose one value from 2–7 fixed values | Select | Native select by default; label stays visible. |
| Find one value in a long set | Combobox | Searchable listbox; show no-results and clear states. |
| Apply several dataset constraints | Filter popover | Checkboxes, result count, Apply and Clear all. Applied values become removable chips. |
| Run an action | Menu | Actions only—never data entry or status selection. Use a verb for every item. |

All triggers are 44px. Overlays match the trigger width when selecting data, cap at 320px for menus and 420px for filters, avoid viewport edges by 13px, and cap height at the viewport minus 26px. `Escape` dismisses and returns focus to the trigger; outside click preserves the clicked destination. In a Combobox, the focused search input owns the active-descendant and listbox relationship. Arrow keys skip disabled options, `Enter` selects, and Tab/Shift+Tab close the popup while continuing the natural tab order.

## Segmented choice, date, and switch

Use `SegmentedControl` for one immediate choice among two to five short peer options. It is a radio group, not navigation and not a substitute for tabs. Use `SelectField` when options do not fit without truncation and `Combobox` when the option set needs search. The neutral tone uses a raised surface; the accent tone is limited to a high-signal workflow state such as Draft/Ready/Scheduled.

Use `CalendarDatePicker` for one governed date and `CalendarDateRangePicker` for a bounded start/end range when month navigation materially improves the task. Both use a bounded Radix popover, a 42-day grid, one roving tab stop, arrow/Home/End movement, Escape dismissal, and trigger focus restoration. Values remain ISO dates in state and start cannot exceed end. `DateField` and `DateRangeField` remain the native, low-complexity option where a calendar surface adds no value.

Use `Switch` for an independent boolean that takes effect immediately. A switch is not a status pill, checkbox group, or submit action. The whole 44px row is clickable, the label states the enabled condition, and optional supporting text explains consequences.

## Popover, sheet, or dialog?

- Use a **popover** for non-blocking controls that belong to a trigger: filters, date ranges, or compact metadata. It dismisses without a decision.
- Use a **sheet** for lengthy evidence, filters on mobile, and property correction. It preserves the page context and supports scrolling.
- Use a **dialog** for a focused confirmation or a short form that must be completed or cancelled before work continues.
- Use **AlertDialog** for destructive Team/Settings decisions: title and description are required, the safe action is `AlertDialogCancel`, and the caller closes only after a successful mutation. Preserve the trigger on cancellation and choose a surviving focus target after removal.
- Use **Banner** for persistent named page context, and **Toast** for controlled, dismissible saved-action feedback. Supply Toast's required `returnFocusRef` to a surviving owning action; dismissal returns focus only if the notification still owns it. Toast pauses while focused/hovered and does not steal focus on timer expiry; never hide a required error only in a timed notification.
- Use a **tooltip** only for an unlabeled icon or truncated text. Never put critical evidence, errors, or instructions only in a tooltip.

Dialogs and sheets trap focus, close with `Escape` unless a destructive operation is in progress, and restore focus to the opener. A correction form is a right sheet on desktop and a full-height bottom sheet on mobile.

## Tabs and navigation

Tabs switch peer content inside one task: JEV review, Performance, and Notes & versions. The sidebar and breadcrumbs navigate routes; filter chips change one dataset. Route-significant tabs belong in the URL. Inspector-only tabs may remain local.

Tabs use `tablist`, `tab`, and `tabpanel`; arrow keys move focus, `Home`/`End` jump, and the active tab has text plus an underline. Mobile tabs scroll horizontally and keep the selected tab visible.

The production sidebar defaults to a 240px labelled column and collapses to a persistent 72px icon rail. Its token widths, centred 44px controls, monochrome mark, Radix workspace dropdown and ordinary 8px active-row radius are the production shell contract; the catalogue preference is separate. Every retained rail control has an accessible name and tooltip. At 768px and below, the full labelled hierarchy uses a 288px Sheet with a visible close action; dismissal restores its opener and route navigation focuses the destination main. The active route uses the shared gradient, and breadcrumbs identify context independently.

## Geometry and scroll ownership

Notches and clipped corners belong to substantial structural accents or a high-signal active navigation state. Never put ordinary icons in decorative geometry. Identity, ready and selection pills use the shared pink-to-magenta action gradient with white foreground; caution and failure remain explicit semantic text/icon treatments. Quotes, transcript rows and selected properties never use decorative leading rules.

`Surface` owns the canvas, subtle and inverse surface variants; `AccentLabel` owns the reusable notched label. An inverse surface is reserved for media playback, Neural Ideation or generation previews, and one high-signal empty/onboarding feature. It never replaces the white canvas behind routine forms, filters, tables, menus or evidence. Use at most one clipped accent in a local region: a high-signal label, active navigation item or generated-result summary—not ordinary buttons and controls.

## Motion

Motion confirms user-triggered state changes. Accent `SegmentedControl` slides its gradient indicator between workflow states; neutral segmented choice remains visually quiet. Buttons shift the gradient on hover and move down one pixel when pressed; switches move their thumb and surface together; bounded popovers enter by five pixels. Focus never animates. Body text, table rows and breadcrumbs do not move. All transitions collapse under `prefers-reduced-motion`.

The document owns normal page scrolling. A region gets its own scrollbar only when its content must remain independently operable, such as a bounded menu or mobile sheet. Shared Dialog/Sheet surfaces bound their height to the viewport and contain overscroll; menus and search lists also contain overscroll. Shared overlay scrollbars use a thin muted thumb, no arrow buttons, and tab strips hide the scrollbar entirely. Do not add nested pane scrolling merely to imitate an embedded application frame.

## Tables and filters

Tables have a sticky header, explicit sortable columns, right-aligned numbers, and separate controls for selection and navigation. Selection reveals a bulk-action bar. Loading, empty, partial, and failure states occupy the table region instead of changing the page layout.

Applied filters appear as removable chips with a result count and `Clear all`. A short fixed choice set uses `SegmentedControl`; a longer single-value set uses `SelectField`, or `Combobox` when search materially helps. Independent choices use `MultiSelect`. Boolean settings use `Switch`, never a segmented control. Dates use `CalendarDatePicker`/`CalendarDateRangePicker` for visible month navigation, or native `DateField`/`DateRangeField` for low-complexity forms. On mobile filters move to a sheet; a calendar opened inside that sheet stays inside its modal focus boundary. Dense tables either transform into priority cards or deliberately scroll; columns are never squeezed into unreadable widths.

## JEV property and evidence

A property row contains label, extracted value, a fixed 56px confidence/status column, and optional evidence timestamp. Selecting it opens the evidence panel without changing route. Normal ready rows show confidence only; exception states such as Review, Checking, Unavailable, or Confirmed add a word and dot. The evidence panel writes confidence as `High · 94%`, `Medium · 76%`, or `Low · 44%`; colour is supplemental.

The evidence panel contains value, confidence, source, timed quotation or frame, provenance, and Confirm/Correct actions. Confirm is reversible. Correct opens the correction sheet. Pending, unavailable, and failed results explain what happens next.

## Responsive contract

- Wide desktop: labelled rail by default, media/shot pane, flexible property pane and evidence pane when space permits.
- Intermediate desktop: media and property panes; evidence opens as a right sheet. Icon-only navigation is an explicit preference.
- `≤900px`: top bar, then `Creative / Analysis / Evidence` views, one pane at a time, with a sticky primary action.

Nine-by-sixteen media is always fully visible and never cropped. Square and landscape media retain their real ratio. Touch targets remain 44×44px even when their visible control is smaller.

## Accessibility and content

Use landmarks and a skip link, 4.5:1 text contrast, 3:1 focus/component contrast, logical headings, captions/transcripts, and polite live regions for results and saved state. Status cannot rely on colour. Empty states say what is absent and offer one next action. Times use `m:ss`; percentages have no decimals. Uppercase is reserved for interface chrome; names, findings, evidence, and user content retain natural case.

## Live proofs

### Page workflow APIs

Import these typed contracts from `components/index.ts`. `Dropzone` supplies local `File[]` through `onFiles`; the consumer validates MIME/size and owns object-URL creation/revocation. `accept` guides the native picker and is not validation. `FilePreview` contains images/video without cropping and explicitly reports unavailable document/media previews. `UploadProgress` uses named determinate/indeterminate progress or a retryable error. `AccountSwitcher` requires every account's source label, retaining the distinction between sample accounts and uploads.

`FilterBar` composes controls and applied chips. `FilterPopover` remains the lower-level desktop control. `ResponsiveFilterTask` owns the production behavior that opens the same filter task in a bounded Popover above 700px and a bottom Sheet at narrow widths, including Escape dismissal and trigger restoration. Consumers own draft values if using `onApply`. `SortSelect` uses the named native select contract. `DataTable<Row>` is controlled: consumers own filtering, sorting and pagination; the table emits column/direction and selected IDs, renders a caption and sortable header semantics, and keeps selection separate from row navigation. `ComparisonMatrix` aligns a fixed property axis with 2–4 consumer-supplied columns in one keyboard-focusable bounded scroll region. `CreativeCard` takes the source aspect ratio and source label. `MetricCell` renders a provided value with source/window or an explicit missing reason.

`ShotStrip` exposes independently keyboard-operable pressed-state shot buttons. `Transcript` optionally seeks to the segment's timestamp and marks the active segment. `ActivityTimeline` retains machine-readable time, human labels, details, and optional deep links. None of these contracts generates analysis or performance claims.

Run `npm run test:interactions` for real Chromium upload, account selection, filter focus restoration, table sorting/selection, shot/transcript seeking, timeline links and route-tab context. First install a browser with `npx playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at an existing Chromium executable. The test harness starts an isolated ephemeral Vite server. `npm run test:design-system` continues to check routing behavior and structural token/catalogue contracts.

- `/app/demo/jev-analysis` proves the system in a complete JEV task.
- `/app/demo/design-system` is the reusable catalogue for foundations, real shared components, complete states and the 21st.dev adoption ledger; `/design-system-review.html` redirects to it.
- Both pages share the same persisted cog controls, so a design decision can be compared in context and in isolation before it becomes a fixed token.

The settings popover and accordion interaction model adapt the 21st.dev Settings Popover and Accordion references. Butterfly retains its own visual language and adds no animation dependency: the useful adoption is focus restoration, outside/Escape dismissal, disclosure semantics, and keyboard behavior.

## Reference architecture and completion

[Polaris](https://shopify.dev/docs/api/polaris) and [Primer](https://primer.style/product/) inform the separation of foundations, component anatomy/states, reusable interaction patterns, responsive layouts and accessibility. They are structural references, not imported visual themes. Comfy informs restrained colour and substantial geometry.

Every catalogue specimen must expose its meaningful variants and states, explain when to use it, and show keyboard/focus behaviour. Shared implementation alone does not prove visual quality. Review the catalogue and the JEV context at actual desktop and mobile size; verify font loading, wrapping, spacing, selection, dismissal and persisted preferences. Missing components stay explicitly recorded in `docs/component-coverage.md`.

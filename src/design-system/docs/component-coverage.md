# Component coverage

The shared components under `src/design-system/components/` are the product primitives. Pages compose these instead of restyling native controls locally.

## Implemented

- Actions: Button, IconButton, DropdownMenu
- Navigation: Breadcrumb, Tabs, RailNav
- Inputs: Field, TextareaField, SelectField, MultiSelect, Combobox, DateField, DateRangeField, CalendarDatePicker, CalendarDateRangePicker, Checkbox, Switch, SegmentedControl
- Disclosure and analysis: Accordion, PropertyList, EvidenceInspector
- Feedback and identity: Status Badge, RemovableChip, Skeleton, Surface, AccentLabel
- Media: MediaStage
- System controls: DesignCustomizer
- Workspace composition: WorkspacePageHeader, route/query PageTabs, TaskViews
- Dataset workflows: FilterChip, ResultCount, ViewToggle, Pagination, BulkActionBar
- Universal feedback: StatePanel, InlineAlert, determinate/indeterminate Progress, PermissionGate
- Import and account flows: ConnectionStatus, StepProgress, MemberRow, RoleSelect, InviteRow, OtpField
- Upload and account selection: Dropzone, FilePreview, UploadProgress, AccountSwitcher
- Dataset composition: FilterBar, FilterPopover, ResponsiveFilterTask, ComparisonMatrix, SortSelect, DataTable, CreativeCard, MetricCell
- Timed review and history: ShotStrip, Transcript, ActivityTimeline
- Destructive confirmation and feedback: AlertDialog, AlertDialogActions, Banner, Toast; token namespace `--feedback-*`
- General overlays: existing typed Radix/shadcn Dialog, Sheet, Popover and Tooltip under `src/components/ui/`, consumed by production routes and shared controls

## Production coverage

Team removal and Settings source disconnect use AlertDialog with safe initial focus and explicit successful/cancelled return targets. Team/Workspace restrictions use Banner; local invitation and workspace saves use Toast. Settings Sources exercises PermissionGate for read-only access. The catalogue includes the same live confirmation/banner/notification APIs.

`ResponsiveFilterTask` owns the repeated desktop-Popover/mobile-Sheet decision, bounded searchable pickers, dismissal and trigger restoration. `ComparisonMatrix` owns the fixed property axis and one deliberate scroll region for 2–4 creative comparisons. The lower-level filter popover and existing general overlays still reuse Radix dismissal/focus behavior. Do not build a second overlay kit to move files into one directory. General overlay imports retain their existing `components/ui` boundary; new Butterfly workflow APIs use the design-system barrel.

Add a primitive only when at least two product surfaces need the same interaction. Until then, keep the behaviour local and token-compliant.

Every Butterfly workflow primitive is exported from `components/index.ts`; general Radix wrappers keep the existing UI boundary above. Reusable styling enters through `design-system/index.css`; route demonstrations import their own layout CSS separately. New families require tokens, typed APIs, meaningful catalogue states, and production interaction regressions.

The catalogue visibly demonstrates selected/clear/disabled/empty controls, searchable selection, dates, switches, governed surfaces, selectable cards, tables, upload errors, accounts, shots/transcript/history, and destructive/saved feedback. Tasks 3–7 now consume these contracts in real routes. `scripts/integration-closure.test.mjs` verifies shared confirmation semantics, safe/trapped/restored focus, persistent restriction context, dismissible notifications and document scroll ownership in production.

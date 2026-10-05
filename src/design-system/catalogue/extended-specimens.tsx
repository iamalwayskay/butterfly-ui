import { useState } from "react"
import { Check, Filter, ShieldCheck, UserPlus } from "lucide-react"
import {
  BulkActionBar,
  Button,
  Checkbox,
  ComparisonMatrix,
  ConnectionStatus,
  InlineAlert,
  InviteRow,
  MemberRow,
  OtpField,
  PageTabs,
  Pagination,
  PermissionGate,
  Progress,
  ResponsiveFilterTask,
  ResultCount,
  StatePanel,
  StepProgress,
  TaskViews,
  TextareaField,
  ViewToggle,
  WorkspacePageHeader,
  type TaskView,
  type ViewMode,
} from "../components"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const roles = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
] as const

export function ExtendedSpecimens() {
  const [otp, setOtp] = useState("24")
  const [role, setRole] = useState("editor")
  const [view, setView] = useState<ViewMode>("grid")
  const [page, setPage] = useState(2)
  const [selectedCount, setSelectedCount] = useState(3)
  const [taskView, setTaskView] = useState<TaskView>("analysis")
  const [alertVisible, setAlertVisible] = useState(true)
  const [readyOnly, setReadyOnly] = useState(false)
  const [sampleNotice, setSampleNotice] = useState("")

  return (
    <section className="ds-section" id="complete-patterns">
      <div className="ds-section__heading">
        <h2>Complete product patterns</h2>
        <p>Actual shared Butterfly components for the states and workflows that previously went missing from the review page.</p>
      </div>
      <p className={sampleNotice ? "ds-demo-status" : "bf-sr-only"} role="status">{sampleNotice}</p>

      <div className="ds-foundation-grid">
        <article className="ds-specimen">
          <div className="ds-specimen__title"><h3>Long-form and code input</h3><span>Default · error · disabled</span></div>
          <div className="ds-stack">
            <TextareaField label="Review note" defaultValue="Keep the call to action visible beside the product close-up." hint="Saved to this local sample." />
            <TextareaField label="Required rationale" error="Add a rationale before completing this review." />
            <TextareaField label="Locked note" defaultValue="Approved notes remain visible without implying they can be edited." disabled hint="Read-only for this role." />
            <OtpField value={otp} onChange={setOtp} error={otp.length > 0 && otp.length < 6 ? "Enter all six digits." : undefined} />
          </div>
        </article>

        <article className="ds-specimen">
          <div className="ds-specimen__title"><h3>Team and roles</h3><span>Member · invite · failed</span></div>
          <div className="ds-stack ds-team-stack">
            <MemberRow name="Demo Owner" email="owner@example.test" role={role} roles={roles} onRoleChange={setRole} status="You" />
            <InviteRow email="reviewer@example.test" role="Viewer" sentAt="today" onResend={() => setSampleNotice("Sample invitation reset locally.")} onCancel={() => setSampleNotice("Sample invitation cancelled locally.")} />
            <InviteRow email="editor@example.test" role="Editor" status="failed" onResend={() => setSampleNotice("Failed invitation queued for a local retry.")} onCancel={() => setSampleNotice("Failed invitation removed from this specimen.")} />
          </div>
        </article>

        <article className="ds-specimen ds-specimen--wide">
          <div className="ds-specimen__title"><h3>Page structure</h3><span>Header · tabs · task views</span></div>
          <div className="ds-workspace-specimen">
            <WorkspacePageHeader
              headingLevel={3}
              title="Creative library"
              breadcrumb={[{ label: "Workspace", href: "#complete-patterns" }, { label: "Creative library" }]}
              metadata={<span>128 ADS</span>}
              description="Review creative, compare analysis, and turn evidence into the next iteration."
              actions={<Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setSampleNotice("Create Ad specimen activated.")}>Create ad</Button>}
            />
            <PageTabs label="Library views" activeValue="all" items={[{ value: "all", label: "All ads", count: 128, to: "#complete-patterns" }, { value: "groups", label: "Saved groups", count: 4, to: "#complete-patterns" }, { value: "archived", label: "Archived", count: 12, to: "#complete-patterns" }]} />
            <TaskViews
              value={taskView}
              onChange={setTaskView}
              creative={<div className="ds-task-pane"><strong>Creative</strong><span>True-ratio media remains visible here.</span></div>}
              analysis={<div className="ds-task-pane"><strong>Analysis</strong><span>JEV findings occupy the decision surface.</span></div>}
              evidence={<div className="ds-task-pane"><strong>Evidence</strong><span>Transcript, frames, and provenance live together.</span></div>}
            />
          </div>
        </article>

        <article className="ds-specimen ds-specimen--wide">
          <div className="ds-specimen__title"><h3>Responsive filters and comparison</h3><span>Popover · sheet · aligned evidence</span></div>
          <div className="ds-overlay-actions">
            <ResponsiveFilterTask triggerLabel="More filters" title="Filter creative" description="Desktop uses a bounded popover; narrow screens use a task-owned sheet." onClear={() => setReadyOnly(false)}>
              <Checkbox label="Ready only" checked={readyOnly} onChange={event => setReadyOnly(event.target.checked)} />
            </ResponsiveFilterTask>
          </div>
          <ComparisonMatrix
            label="Creative comparison"
            columns={[{ id: "evening", header: "Evening reset" }, { id: "serum", header: "Serum proof" }]}
            rows={[{ id: "hook", label: "Hook", values: ["Routine demonstration", "Product still life"] }, { id: "results", label: "Results", values: ["63", "41"] }]}
          />
        </article>

        <article className="ds-specimen ds-specimen--wide">
          <div className="ds-specimen__title"><h3>Dataset controls</h3><span>Scale beyond three creatives</span></div>
          <div className="ds-dataset-controls">
            <ResultCount count={128} label="ad" />
            <ViewToggle value={view} onChange={setView} />
            <Pagination page={page} pageCount={8} onPageChange={setPage} />
          </div>
          {selectedCount > 0 ? <BulkActionBar count={selectedCount} noun="ad" onClear={() => setSelectedCount(0)}>
            <Button variant="secondary" onClick={() => setSampleNotice(`${selectedCount} sample ads added to a group.`)}>Add to group</Button>
            <Button variant="outline" onClick={() => setSampleNotice(`${selectedCount} sample ads opened in comparison.`)}>Compare</Button>
          </BulkActionBar> : <Button variant="secondary" onClick={() => setSelectedCount(3)}>Select sample ads</Button>}
        </article>

        <article className="ds-specimen ds-specimen--wide">
          <div className="ds-specimen__title"><h3>System states</h3><span>Empty · loading · success · warning · error · permission</span></div>
          <div className="ds-state-grid">
            <StatePanel compact tone="empty" title="No matching ads" description="Clear a filter or broaden the date range." actions={<Button variant="secondary" onClick={() => setSampleNotice("Sample filters cleared.")}>Clear filters</Button>} />
            <StatePanel compact tone="loading" title="Analysing creative" description="The current stage stays visible while JEV works." />
            <StatePanel compact tone="success" title="Analysis ready" description="All requested properties are available." />
            <StatePanel compact tone="warning" title="Transcript incomplete" description="Visual evidence remains available." />
            <StatePanel compact tone="error" title="Analysis failed" description="Retry without losing the source creative." actions={<Button variant="outline" onClick={() => setSampleNotice("Sample analysis retry started.")}>Retry</Button>} />
            <PermissionGate allowed={false} title="Editor access required" description="Ask an admin before changing this workspace."><span /></PermissionGate>
          </div>
          {alertVisible ? <InlineAlert title="Some sources are unavailable" tone="warning" onDismiss={() => setAlertVisible(false)}>Reconnect the source or reattach local media. Imported ads remain visible.</InlineAlert> : <Button variant="quiet" onClick={() => setAlertVisible(true)}>Restore alert specimen</Button>}
        </article>

        <article className="ds-specimen">
          <div className="ds-specimen__title"><h3>Progress and connection</h3><span>Determinate · indeterminate · partial</span></div>
          <div className="ds-stack">
            <Progress label="Analysing frames" value={64} />
            <Progress label="Preparing transcript" />
            <ConnectionStatus state="partial" title="Meta sample partly available" description="Delivery data is present; source media needs repair." actions={<Button variant="outline" onClick={() => setSampleNotice("Source repair specimen activated.")}>Repair source</Button>} />
          </div>
        </article>

        <article className="ds-specimen">
          <div className="ds-specimen__title"><h3>Step progress</h3><span>Current stage is explicit</span></div>
          <StepProgress current={1} steps={[{ label: "Creative", description: "Source attached" }, { label: "Analysis", description: "Review findings" }, { label: "Decision", description: "Record the next test" }]} />
        </article>

        <article className="ds-specimen ds-specimen--wide">
          <div className="ds-specimen__title"><h3>Tooltip and responsive sheet</h3><span>Context · mobile task surface</span></div>
          <div className="ds-overlay-actions">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="secondary" icon={<Filter size={16} />}>Hover for context</Button></TooltipTrigger>
                <TooltipContent sideOffset={8}>Filters remain active until cleared.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Sheet>
              <SheetTrigger asChild><Button variant="outline">Open review sheet</Button></SheetTrigger>
              <SheetContent className="ds-review-sheet">
                <SheetHeader><SheetTitle>Review finding</SheetTitle><SheetDescription>Mobile and narrow layouts move bounded tasks into a sheet.</SheetDescription></SheetHeader>
                <div className="ds-review-sheet__body"><Check aria-hidden="true" /><p>The CTA remains visible through the final product frame.</p></div>
                <SheetFooter><SheetClose asChild><Button variant="primary" icon={<ShieldCheck size={16} />} onClick={() => setSampleNotice("Sample review decision recorded.")}>Record decision</Button></SheetClose><SheetClose asChild><Button variant="secondary">Cancel</Button></SheetClose></SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </article>
      </div>
    </section>
  )
}

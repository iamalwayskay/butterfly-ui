import { useRef, useState } from "react"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogActions, Banner, Toast, Button, AccountSwitcher, ActivityTimeline, Checkbox, CreativeCard, DataTable, Dropzone, FilePreview, FilterBar, FilterChip, FilterPopover, MetricCell, ShotStrip, SortSelect, StatePanel, Transcript, UploadProgress } from "../components"

const sampleRows = [
  { id: "sample", name: "Evening reset", placement: "Instagram Reels", status: "Ready" },
  { id: "proof", name: "Product proof", placement: "Instagram Stories", status: "Review" },
]

export function WorkflowSpecimens() {
  const [files, setFiles] = useState<File[]>([])
  const [uploadFailed, setUploadFailed] = useState(true)
  const [account, setAccount] = useState("kindred")
  const [active, setActive] = useState(false)
  const [sort, setSort] = useState("name")
  const [direction, setDirection] = useState<"ascending" | "descending">("ascending")
  const [selected, setSelected] = useState<string[]>([])
  const [time, setTime] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [notice, setNotice] = useState(false)
  const noticeActionRef = useRef<HTMLButtonElement>(null)
  const shots = [
    { id: "opening", time: 0, endTime: 6, label: "Opening", thumbnail: "/brand/kindred-campaign-hands.png" },
    { id: "proof", time: 7, endTime: 18, label: "Product proof", thumbnail: "/brand/kindred-campaign-hands.png" },
  ]

  return <section className="ds-section" id="workflows">
    <div className="ds-section__heading"><h2>Page workflows</h2><p>Complete task sequences made from shared Butterfly components. All records below are samples; selection and navigation are interactive.</p></div>
    <div className="ds-workflow-stack">
      <article className="ds-workflow-panel ds-workflow-feedback">
        <div className="ds-workflow-panel__heading"><div><span>01 · FEEDBACK</span><h3>CONFIRMATION AT THE DECISION</h3></div><p>Persistent context stays visible; transient outcomes leave the page.</p></div>
        <Banner title="Local preview" tone="permission">This design-system route changes no connected records.</Banner>
        <div className="ds-workflow-actions">
          <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogTrigger asChild><Button variant="destructive">Preview confirmation</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogTitle>Remove sample record?</AlertDialogTitle><AlertDialogDescription>This specimen changes no saved records.</AlertDialogDescription><AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep record</Button></AlertDialogCancel><Button variant="destructive" onClick={() => { setConfirm(false); setNotice(true) }}>Confirm removal</Button></AlertDialogActions></AlertDialogContent></AlertDialog>
          <Button ref={noticeActionRef} variant="secondary" onClick={() => setNotice(true)}>Preview saved notification</Button>
        </div>
        <Toast returnFocusRef={noticeActionRef} open={notice} onOpenChange={setNotice} title="Sample action acknowledged" description="Transient feedback can be dismissed or expires automatically." />
      </article>

      <article className="ds-workflow-panel">
        <div className="ds-workflow-panel__heading"><div><span>02 · INGEST</span><h3>ACCOUNT + CREATIVE UPLOAD</h3></div><p>Choose the source, add the asset, then resolve progress in one bounded flow.</p></div>
        <div className="ds-upload-flow">
          <AccountSwitcher accounts={[{ id: "kindred", name: "Kindred", source: "Sample account" }, { id: "local", name: "Personal", source: "Local uploads" }]} value={account} onChange={setAccount} />
          <Dropzone label="Choose creative" accept="image/*,video/*,application/pdf" hint="Files remain local to this demonstration." onFiles={setFiles} />
          <div className="ds-upload-flow__progress"><UploadProgress name="Evening reset.mp4" value={72} /><UploadProgress name="Product proof.mp4" value={100} error={uploadFailed ? "Sample upload interrupted" : undefined} onRetry={() => setUploadFailed(false)} /></div>
        </div>
        {files.map((file) => <FilePreview key={file.name} name={file.name} mediaType={file.type === "application/pdf" ? "document" : file.type.startsWith("video/") ? "video" : "image"} description={<p>Selected locally; preview not loaded.</p>} onRemove={() => setFiles([])} />)}
      </article>

      <article className="ds-workflow-panel">
        <div className="ds-workflow-panel__heading"><div><span>03 · DATASET</span><h3>FILTER → SELECT → ACT</h3></div><p>The toolbar changes the result set; row selection enables task actions.</p></div>
        <FilterBar applied={active ? <FilterChip label="Status" value="Active" onRemove={() => setActive(false)} /> : undefined}>
          <FilterPopover label="Filter ads" onClear={() => setActive(false)}><Checkbox label="Active only" checked={active} onChange={(event) => setActive(event.target.checked)} /></FilterPopover>
          <SortSelect value={sort} onChange={setSort} options={[{ value: "name", label: "Name" }, { value: "recent", label: "Recent" }]} />
        </FilterBar>
        <DataTable label="Sample ads" rows={active ? sampleRows.slice(0, 1) : sampleRows} getRowId={(row) => row.id} getRowLabel={(row) => row.name} columns={[{ id: "name", label: "Ad", sortable: true, render: (row) => row.name }, { id: "placement", label: "Placement", render: (row) => row.placement }, { id: "status", label: "Status", render: (row) => row.status }]} sort={{ column: "name", direction }} onSort={(_, next) => setDirection(next)} selectedIds={selected} onSelectionChange={setSelected} />
      </article>

      <article className="ds-workflow-panel ds-review-workflow">
        <div className="ds-workflow-panel__heading"><div><span>04 · REVIEW</span><h3>CREATIVE, SHOTS + TRANSCRIPT</h3></div><p>One time selection synchronises the filmstrip and transcript; activity remains a separate record.</p></div>
        <div className="ds-review-workflow__layout">
          <div className="ds-review-workflow__creative"><CreativeCard title="Evening reset" href="/app/demo/jev-analysis" src="/brand/kindred-campaign-hands.png" alt="Kindred skincare creative" source="Sample account" aspectRatio="9 / 16" selected={selected.includes("sample")} onSelect={(checked) => setSelected(checked ? ["sample"] : [])}><MetricCell label="Results" value="12" source="Sample Meta data" window="26 Sep–2 Oct" /></CreativeCard></div>
          <div className="ds-review-workflow__analysis">
            <div><span className="ds-component-label">SHOTS · SELECTED {time}s</span><ShotStrip shots={shots} selectedId={time < 7 ? "opening" : "proof"} onSelect={(shot) => setTime(shot.time)} /></div>
            <div><span className="ds-component-label">TRANSCRIPT</span><Transcript segments={[{ id: "opening", time: 0, text: "A calmer evening routine begins with the serum held in frame." }, { id: "proof", time: 7, text: "Apply a few drops to clean skin and show the product texture." }]} currentTime={time} onSeek={setTime} /></div>
            <div><span className="ds-component-label">ACTIVITY</span><ActivityTimeline items={[{ id: "sample-version", label: "Sample version saved", detail: "Demo Owner corrected the offer wording · Local sample", dateTime: "2026-10-03T10:00:00Z", timeLabel: "3 Oct" }, { id: "reviewed", label: "Creative marked ready", detail: "JEV review · Sample analysis", dateTime: "2026-10-04T09:30:00Z", timeLabel: "4 Oct" }]} /></div>
          </div>
        </div>
      </article>

      <article className="ds-workflow-panel">
        <div className="ds-workflow-panel__heading"><div><span>05 · SYSTEM STATES</span><h3>EMPTY, DISABLED + UNAVAILABLE</h3></div><p>Exceptional states stand alone; they do not appear underneath healthy content.</p></div>
        <div className="ds-state-matrix">
          <div><Dropzone label="Upload unavailable" disabled onFiles={() => undefined} hint="An editor role is required." /></div>
          <StatePanel compact title="No ads match these filters" description="Clear one or more filters to restore the result set." actions={<Button variant="secondary" onClick={() => setActive(false)}>Clear filters</Button>} />
          <StatePanel compact tone="error" title="Analysis unavailable" description="The source creative is missing. Reattach it before retrying analysis." actions={<Button variant="outline" onClick={() => setActive(true)}>Choose source</Button>} />
        </div>
      </article>
    </div>
  </section>
}

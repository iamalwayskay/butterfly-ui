import { useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  Grid2X2,
  HelpCircle,
  Home,
  Layers3,
  Library,
  Menu,
  PanelLeft,
  Play,
  Search,
  Settings,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react"
import { jevPropertyRegistry, jevSectionNames, type JevProperty, type JevPropertyStatus } from "@/data/jev"
import { Badge, Breadcrumb, Button, DesignCustomizer, DropdownMenu, MediaStage, MultiSelect, PropertyList, SelectField, Tabs, useDesignSettings } from "@/design-system/components"
import "../index.css"
import "./jev-analysis-demo.css"

type Tab = "review" | "performance" | "notes"
type MobilePane = "creative" | "analysis" | "evidence"

const navItems = [
  { label: "Overview", icon: Home, href: "/app" },
  { label: "Ad library", icon: Library, active: true, href: "/app/ads" },
  { label: "Groups", icon: Grid2X2, href: "/app/ads?view=groups" },
  { label: "Work queue", icon: Layers3, count: 4, href: "/app/work" },
]

const shots = [
  { at: 0, label: "Hook" },
  { at: 3, label: "Problem" },
  { at: 7, label: "Benefit" },
  { at: 12, label: "Product" },
  { at: 15, label: "CTA" },
]

const stateLabel: Record<JevPropertyStatus, string> = {
  ready: "Ready",
  review: "Review",
  pending: "Checking",
  unavailable: "Unavailable",
  corrected: "Confirmed",
}

function formatTime(seconds?: number) {
  if (seconds === undefined) return null
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

function confidenceLabel(value?: number) {
  if (value === undefined) return "No confidence score"
  const level = value >= .85 ? "High" : value >= .65 ? "Medium" : "Low"
  return `${level} · ${Math.round(value * 100)}%`
}

function StatusMark({ status }: { status: JevPropertyStatus }) {
  return (
    <Badge className="jev-evidence-status" variant={status === "unavailable" ? "error" : status === "pending" || status === "review" ? "review" : "ready"}>
      {stateLabel[status]}
    </Badge>
  )
}

export function JevAnalysisDemo() {
  const designSystem = useDesignSettings()
  const [openSections, setOpenSections] = useState(() => new Set(["Opening"]))
  const [selectedId, setSelectedId] = useState("opening-1")
  const [filterStatus, setFilterStatus] = useState<"all" | JevPropertyStatus>("all")
  const [tab, setTab] = useState<Tab>(() => {
    const value = new URLSearchParams(window.location.search).get("tab")
    return value === "performance" || value === "notes" ? value : "review"
  })
  const [mobilePane, setMobilePane] = useState<MobilePane>("analysis")
  const [navigationOpen, setNavigationOpen] = useState(false)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [iterationOpen, setIterationOpen] = useState(false)
  const [successSignal, setSuccessSignal] = useState("hold")
  const [confirmedIds, setConfirmedIds] = useState(() => new Set<string>())
  const [unconfirmedIds, setUnconfirmedIds] = useState(() => new Set<string>())
  const [corrections, setCorrections] = useState<Record<string, { value: string; reason: string }>>({})
  const [draftCorrection, setDraftCorrection] = useState({ value: "", reason: "" })
  const [sourceFilters, setSourceFilters] = useState(() => new Set(["Visual", "On-screen text", "Transcript", "Meta delivery"]))
  const [currentTime, setCurrentTime] = useState(7)
  const [playing, setPlaying] = useState(false)
  const [toast, setToast] = useState("")
  const correctionTriggerRef = useRef<HTMLButtonElement>(null)
  const iterationTriggerRef = useRef<HTMLButtonElement>(null)
  const correctionSheetRef = useRef<HTMLElement>(null)

  const selected = jevPropertyRegistry.find((property) => property.id === selectedId) ?? jevPropertyRegistry[0]
  const effectiveStatus = (property: JevProperty): JevPropertyStatus => {
    if (unconfirmedIds.has(property.id)) return property.status === "corrected" ? "ready" : property.status
    if (confirmedIds.has(property.id) || corrections[property.id]) return "corrected"
    return property.status
  }
  const visibleProperties = useMemo(() => jevPropertyRegistry.filter((property) => {
    const statusMatches = filterStatus === "all" || effectiveStatus(property) === filterStatus
    const sourceMatches = !property.evidence || sourceFilters.has(property.evidence.source)
    return statusMatches && sourceMatches
  }), [filterStatus, sourceFilters, confirmedIds, unconfirmedIds, corrections])
  const selectedValue = corrections[selected.id]?.value ?? selected.value
  const selectedConfirmed = effectiveStatus(selected) === "corrected"
  const currentShot = shots.reduce((match, shot) => currentTime >= shot.at ? shot : match, shots[0])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setCurrentTime((value) => value >= 18 ? 0 : value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (correctionOpen) { setCorrectionOpen(false); correctionTriggerRef.current?.focus() }
      if (iterationOpen) { setIterationOpen(false); iterationTriggerRef.current?.focus() }
      if (navigationOpen) { setNavigationOpen(false); navigationTriggerRef.current?.focus() }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [correctionOpen, iterationOpen, navigationOpen])

  useEffect(() => {
    if (navigationOpen) navigationRef.current?.querySelector<HTMLButtonElement>("button")?.focus()
  }, [navigationOpen])

  useEffect(() => {
    if (!correctionOpen && !iterationOpen && !navigationOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [correctionOpen, iterationOpen, navigationOpen])

  const toggleSection = (section: string) => {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const announce = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2600)
  }

  const setActiveTab = (next: Tab) => {
    setTab(next)
    const url = new URL(window.location.href)
    if (next === "review") url.searchParams.delete("tab")
    else url.searchParams.set("tab", next)
    window.history.replaceState(null, "", url)
  }

  const trapSheetFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea, select, [href]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute("disabled"))
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return (
    <div className="jev-demo" {...designSystem.presentation}>
      <a className="jev-skip" href="#jev-main">Skip to analysis</a>

      {navigationOpen && <button className="jev-nav-backdrop" aria-label="Close navigation" onClick={() => { setNavigationOpen(false); navigationTriggerRef.current?.focus() }} />}
      <aside ref={navigationRef} className={`jev-nav ${navigationOpen ? "is-open" : ""}`} aria-label="Workspace navigation" role={navigationOpen ? "dialog" : undefined} aria-modal={navigationOpen || undefined} onKeyDown={navigationOpen ? trapSheetFocus : undefined}>
        <button className="jev-icon-button jev-nav-close" aria-label="Close navigation" onClick={() => { setNavigationOpen(false); navigationTriggerRef.current?.focus() }}><X size={24} /></button>
        <div className="jev-brand">
          <span className="jev-brand__mark" aria-hidden="true"><WandSparkles size={24} /></span>
          <span>Butterfly</span>
        </div>
        <nav className="jev-nav__links">
          {navItems.map((item) => (
            <a aria-label={item.label} aria-current={item.active ? "page" : undefined} className={item.active ? "is-active" : ""} href={item.href} key={item.label}>
              <item.icon size={24} aria-hidden="true" />
              <span>{item.label}</span>
              {item.count && <span className="jev-nav__count">{item.count}</span>}
            </a>
          ))}
        </nav>
        <div className="jev-nav__lower">
          <a aria-label="Team" href="/app/team"><Users size={24} /> <span>Team</span></a>
          <a aria-label="Settings" href="/app/settings"><Settings size={24} /> <span>Settings</span></a>
          <button className="jev-account" type="button">
            <span className="jev-avatar">K</span>
            <span><strong>Kindred</strong><small>Sample workspace</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      <header className="jev-mobile-header">
        <button ref={navigationTriggerRef} className="jev-icon-button" type="button" aria-label="Open navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(true)}><Menu size={24} /></button>
        <span className="jev-brand"><span className="jev-brand__mark"><WandSparkles size={17} /></span>Butterfly</span>
        <button className="jev-icon-button" type="button" aria-label="Search" onClick={() => announce("Search opened")}><Search size={19} /></button>
      </header>

      <main className="jev-main" id="jev-main">
        <header className="jev-page-header">
          <div>
            <Breadcrumb className="jev-breadcrumbs" items={[{ label: "Ad library", href: "/app/ads" }, { label: "Evening reset" }]} />
            <div className="jev-title-row">
              <h1>Evening reset</h1>
              <Badge variant="identity">Sample</Badge>
            </div>
            <p>Kindred · Instagram Reels · 0:18</p>
          </div>
          <div className="jev-page-actions">
            <DesignCustomizer settings={designSystem.settings} update={designSystem.update} reset={designSystem.reset} catalogueHref="/app/demo/design-system" catalogueLabel="View catalogue" />
            <DropdownMenu label="More ad actions" items={[
              { id: "copy", label: "Copy ad link", onSelect: () => announce("Link copied") },
              { id: "queue", label: "Add to review queue", onSelect: () => announce("Added to review queue") },
              { id: "download", label: "Download source", onSelect: () => announce("Download prepared") },
            ]} />
            <Button variant="secondary" icon={<PanelLeft size={16} />}>Compare</Button>
            <Button ref={iterationTriggerRef} variant="primary" icon={<Sparkles size={16} />} onClick={() => setIterationOpen(true)}>Create iteration</Button>
          </div>
        </header>

        <Tabs idPrefix="jev" className="jev-tabs" label="Ad detail sections" items={[{ value: "review", label: "JEV review" }, { value: "performance", label: "Performance" }, { value: "notes", label: "Notes & versions" }]} value={tab} onValueChange={setActiveTab} panelId={`jev-panel-${tab}`} />

        {tab !== "review" ? (
          <section className="jev-secondary-view" id={`jev-panel-${tab}`} role="tabpanel" aria-labelledby={`jev-tab-${tab}`}>
            <header><h2>{tab === "performance" ? "Performance" : "Notes & versions"}</h2><p>{tab === "performance" ? "Last 30 days · Kindred account" : "The decisions that shaped this creative, in order."}</p></header>
            {tab === "performance" ? (
              <div className="jev-secondary-grid">
                <article><span>Spend</span><strong>£1,284</strong><small>Last 30 days</small></article>
                <article><span>Results</span><strong>318</strong><small>Purchases</small></article>
                <article><span>Cost per result</span><strong>£4.04</strong><small>Meta delivery</small></article>
                <article><span>Frame retention</span><strong>No data</strong><small>Not included for this account</small></article>
              </div>
            ) : (
              <div className="jev-notes-layout">
                <section className="jev-history-list" aria-label="Creative history">
                  <article><span className="jev-history-marker"><Check size={15} /></span><div><strong>Hook type confirmed</strong><p>Routine demonstration kept as the opening pattern.</p></div><time>Today</time></article>
                  <article><span className="jev-history-marker"><Sparkles size={15} /></span><div><strong>Iteration draft created</strong><p>Opening hook · awaiting review in Work queue.</p></div><time>Version 2</time></article>
                  <article><span className="jev-history-marker"><PanelLeft size={15} /></span><div><strong>Source version imported</strong><p>Original Kindred Instagram Reel.</p></div><time>Version 1</time></article>
                </section>
                <aside className="jev-version-summary">
                  <span>Current version</span><strong>02</strong><p>One grounded iteration and one confirmed finding.</p>
                  <div><span>Review state</span><b>In progress</b></div>
                  <div><span>Last decision</span><b>Today</b></div>
                </aside>
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="jev-mobile-panes" role="tablist" aria-label="Review panes">
              {([['creative', 'Creative'], ['analysis', 'Analysis'], ['evidence', 'Evidence']] as const).map(([value, label], index, panes) => (
                <button type="button" role="tab" aria-selected={mobilePane === value} tabIndex={mobilePane === value ? 0 : -1} key={value} onClick={() => setMobilePane(value)} onKeyDown={(event) => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? panes.length - 1 : event.key === 'ArrowRight' ? (index + 1) % panes.length : (index - 1 + panes.length) % panes.length; setMobilePane(panes[nextIndex][0]); (event.currentTarget.parentElement?.children[nextIndex] as HTMLButtonElement | undefined)?.focus() }}>{label}</button>
              ))}
            </div>

            <div className="jev-workspace" id="jev-panel-review" role="tabpanel" aria-labelledby="jev-tab-review">
              <section className={`jev-creative-pane ${mobilePane === "creative" ? "is-mobile-active" : ""}`} aria-label="Creative and timeline">
                <div className="jev-section-heading">
                  <div><h2>9:16 creative</h2></div>
                  <button className="jev-icon-button jev-tooltip-trigger" type="button" aria-label="Creative help" aria-describedby="creative-help-tooltip"><HelpCircle size={18} /><span id="creative-help-tooltip" role="tooltip">The 9:16 source rendition stays uncropped.</span></button>
                </div>
                <MediaStage className="jev-media-stage" src="/brand/kindred-campaign-hands.png" alt="Kindred skincare campaign 9:16 creator rendition" currentTime={currentTime} duration={18} playing={playing} onPlayToggle={() => setPlaying(!playing)} />
                <div className="jev-shot-header"><h3>Timeline</h3><span>5 evidence moments</span></div>
                <div className="jev-shot-strip" aria-label="Sample creative evidence moments">
                  {shots.map((shot) => (
                    <button className={currentShot.at === shot.at ? "is-current" : ""} type="button" key={shot.at} onClick={() => { setCurrentTime(shot.at); setPlaying(false); announce(`${shot.label} selected at ${formatTime(shot.at)}`) }}>
                      <span className="jev-shot-marker" aria-hidden="true"><span /></span>
                      <strong>{shot.label}</strong><small>{formatTime(shot.at)}</small>
                    </button>
                  ))}
                </div>
                <div className="jev-transcript">
                  <div className={currentTime >= 3 && currentTime < 7 ? "is-active" : ""}><span>0:03</span><p>By the evening, my skin feels like it has had enough.</p></div>
                  <div className={currentTime >= 7 && currentTime < 15 ? "is-active" : ""}><span>0:07</span><p>It settles everything without feeling heavy.</p></div>
                  <div className={currentTime >= 15 ? "is-active" : ""}><span>0:15</span><p>See the ritual.</p></div>
                </div>
              </section>

              <section className={`jev-analysis-pane ${mobilePane === "analysis" ? "is-mobile-active" : ""}`} aria-label="JEV properties">
                <div className="jev-panel-title">
                  <div><span className="jev-kicker">JEV analysis</span><h2>41 properties</h2></div>
                  <span className="jev-completeness"><Check size={14} /> 37 complete</span>
                </div>
                <div className="jev-filterbar">
                  <SelectField label="Status" containerClassName="jev-status-select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}>
                      <option value="all">All findings</option>
                      <option value="review">Needs review</option>
                      <option value="pending">Checking</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="corrected">Confirmed</option>
                  </SelectField>
                  <MultiSelect label="Evidence sources" options={["Visual", "On-screen text", "Transcript", "Meta delivery"].map((source) => ({ value: source, label: source }))} value={[...sourceFilters]} onValueChange={(sources) => setSourceFilters(new Set(sources))} />
                </div>
                <div className="jev-filter-summary" aria-live="polite">
                  <span>{visibleProperties.length} of 41 findings</span>
                  {(filterStatus !== "all" || sourceFilters.size < 4) && <button type="button" onClick={() => { setFilterStatus("all"); setSourceFilters(new Set(["Visual", "On-screen text", "Transcript", "Meta delivery"])) }}>Reset filters</button>}
                </div>

                <PropertyList className="jev-accordion" groups={jevSectionNames.map((section) => {
                  const properties = visibleProperties.filter((property) => property.section === section)
                  const allInSection = jevPropertyRegistry.filter((property) => property.section === section)
                  const unresolved = allInSection.filter((property) => ["review", "pending"].includes(effectiveStatus(property))).length
                  return { id: section, label: section, meta: `${unresolved ? `${unresolved} unresolved · ` : ""}${properties.length}/${allInSection.length}`, rows: properties.map((property) => ({ id: property.id, label: property.label, value: corrections[property.id]?.value ?? property.value, status: stateLabel[effectiveStatus(property)], confidence: property.confidence })) }
                })} selectedId={selected.id} openIds={openSections} onToggleGroup={toggleSection} onSelect={(id) => { setSelectedId(id); setMobilePane("evidence") }} />
              </section>

              <aside className={`jev-evidence-pane ${mobilePane === "evidence" ? "is-mobile-active" : ""}`} aria-label="Selected property evidence">
                <div className="jev-evidence-head">
                  <div><h2>{selected.label}</h2></div>
                  <button className="jev-icon-button jev-mobile-close" type="button" aria-label="Close evidence" onClick={() => setMobilePane("analysis")}><X size={18} /></button>
                </div>
                <StatusMark status={effectiveStatus(selected)} />
                <div className="jev-evidence-value">
                  <span>Extracted value</span>
                  <strong>{selectedValue}</strong>
                </div>
                <dl className="jev-evidence-meta">
                  <div><dt>Confidence</dt><dd>{confidenceLabel(selected.confidence)}</dd></div>
                  <div><dt>Source</dt><dd>{selected.evidence?.source ?? "Not available"}</dd></div>
                  <div><dt>Timestamp</dt><dd>{formatTime(selected.evidence?.at) ?? "—"}</dd></div>
                  <div><dt>Model</dt><dd>JEV 0.8</dd></div>
                </dl>
                <div className="jev-quote">
                  <blockquote>“{selected.evidence?.quote ?? selected.missingReason ?? "No evidence was returned."}”</blockquote>
                  {selected.evidence?.at !== undefined && <button type="button" onClick={() => { setCurrentTime(selected.evidence?.at ?? 0); setPlaying(false); setMobilePane("creative"); announce(`Moved to ${formatTime(selected.evidence?.at)}`) }}><Play size={13} /> View at {formatTime(selected.evidence.at)}</button>}
                </div>
                <div className="jev-provenance">
                  <span>Provenance</span>
                  <p>{corrections[selected.id] ? "Human correction · Review history updated" : "JEV analysis · Source creative"}</p>
                </div>
                <div className="jev-evidence-actions">
                  <Button ref={correctionTriggerRef} variant="secondary" onClick={() => { setDraftCorrection({ value: selectedValue, reason: corrections[selected.id]?.reason ?? "" }); setCorrectionOpen(true) }}>Correct</Button>
                  <Button variant="primary" onClick={() => {
                    if (selectedConfirmed) {
                      setConfirmedIds((current) => { const next = new Set(current); next.delete(selected.id); return next })
                      setUnconfirmedIds((current) => new Set(current).add(selected.id))
                      announce(`${selected.label} confirmation removed`)
                    } else {
                      setConfirmedIds((current) => new Set(current).add(selected.id))
                      setUnconfirmedIds((current) => { const next = new Set(current); next.delete(selected.id); return next })
                      announce(`${selected.label} confirmed`)
                    }
                  }} icon={selectedConfirmed ? <X size={16} /> : undefined}>{selectedConfirmed ? "Undo confirm" : "Confirm"}</Button>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {correctionOpen && (
        <div className="jev-sheet-backdrop">
          <section ref={correctionSheetRef} className="jev-sheet" role="dialog" aria-modal="true" aria-labelledby="correction-title" onKeyDown={trapSheetFocus} onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span className="jev-kicker">Human correction</span><h2 id="correction-title">Correct {selected.label.toLowerCase()}</h2></div><button className="jev-icon-button" type="button" aria-label="Close correction" onClick={() => { setCorrectionOpen(false); correctionTriggerRef.current?.focus() }}><X size={18} /></button></header>
            <label>Correct value<input autoFocus value={draftCorrection.value} onChange={(event) => setDraftCorrection((current) => ({ ...current, value: event.target.value }))} /></label>
            <label>Reason<textarea value={draftCorrection.reason} onChange={(event) => setDraftCorrection((current) => ({ ...current, reason: event.target.value }))} placeholder="Explain what the source creative shows" rows={4} /></label>
            <p>This correction is recorded in the ad's review history.</p>
            <footer><Button variant="secondary" onClick={() => { setCorrectionOpen(false); correctionTriggerRef.current?.focus() }}>Cancel</Button><Button variant="primary" disabled={!draftCorrection.value.trim() || !draftCorrection.reason.trim()} onClick={() => { setCorrections((current) => ({ ...current, [selected.id]: draftCorrection })); setConfirmedIds((current) => new Set(current).add(selected.id)); setUnconfirmedIds((current) => { const next = new Set(current); next.delete(selected.id); return next }); setCorrectionOpen(false); correctionTriggerRef.current?.focus(); announce("Correction saved to review history") }}>Save correction</Button></footer>
          </section>
        </div>
      )}

      {iterationOpen && (
        <div className="jev-sheet-backdrop">
          <section className="jev-sheet" role="dialog" aria-modal="true" aria-labelledby="iteration-title" onKeyDown={trapSheetFocus} onMouseDown={(event) => event.stopPropagation()}>
            <header><div><h2 id="iteration-title">Create the next iteration</h2></div><button className="jev-icon-button" type="button" aria-label="Close iteration" onClick={() => { setIterationOpen(false); iterationTriggerRef.current?.focus() }}><X size={18} /></button></header>
            <div className="jev-iteration-source"><span>Grounded in</span><strong>{selected.label}</strong><p>{selectedValue} · {selected.evidence?.quote ?? selected.missingReason}</p></div>
            <label>Change to test<textarea autoFocus defaultValue={`Strengthen the ${selected.label.toLowerCase()} while preserving the calm creator-led routine.`} rows={4} /></label>
            <fieldset className="jev-signal-picker"><legend>Success signal</legend><div role="radiogroup" aria-label="Success signal">{[["hold", "3-second hold"], ["click", "Outbound clicks"], ["result", "Cost per result"]].map(([value, label], index, signals) => <button type="button" role="radio" aria-checked={successSignal === value} tabIndex={successSignal === value ? 0 : -1} className={successSignal === value ? "is-selected" : ""} key={value} onClick={() => setSuccessSignal(value)} onKeyDown={(event) => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1; const nextIndex = (index + delta + signals.length) % signals.length; setSuccessSignal(signals[nextIndex][0]); (event.currentTarget.parentElement?.children[nextIndex] as HTMLButtonElement | undefined)?.focus() }}>{label}</button>)}</div></fieldset>
            <footer><Button variant="secondary" onClick={() => { setIterationOpen(false); iterationTriggerRef.current?.focus() }}>Cancel</Button><Button variant="primary" onClick={() => { setIterationOpen(false); iterationTriggerRef.current?.focus(); announce("Iteration saved to Work queue") }}>Save to Work queue</Button></footer>
          </section>
        </div>
      )}

      <div className={`jev-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite"><Check size={16} /> {toast}</div>
    </div>
  )
}

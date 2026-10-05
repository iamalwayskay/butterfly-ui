import { useEffect, useState } from "react"
import { Dialog } from "radix-ui"
import { BellRing, Blocks, Columns3, FolderKanban, Images, LayoutGrid, ListChecks, Menu, MousePointerClick, PanelLeft, ScanSearch, Search, SlidersHorizontal, Sparkles, Workflow, X } from "lucide-react"
import { AccentLabel, Accordion, Badge, Breadcrumb, Button, CalendarDatePicker, CalendarDateRangePicker, Checkbox, Combobox, DateField, DateRangeField, DesignCustomizer, DropdownMenu, EvidenceInspector, Field, IconButton, MediaStage, MultiSelect, PropertyList, RailNav, SegmentedControl, SelectField, Skeleton, Surface, Switch, Tabs, useDesignSettings } from "../components"
import "../index.css"
import "./design-system-page.css"
import { WorkflowSpecimens } from "./workflow-specimens"
import { ExtendedSpecimens } from "./extended-specimens"

const sections = [
  ["foundations", "Foundations"],
  ["buttons", "Buttons"],
  ["forms", "Form controls"],
  ["feedback", "Status + loading"],
  ["navigation", "Navigation"],
  ["accordions", "Accordions"],
  ["evidence", "Evidence patterns"],
  ["media", "Media"],
  ["workflows", "Page workflows"],
  ["complete-patterns", "Complete patterns"],
  ["layouts", "Layouts + coverage"],
] as const

const sectionIcons = {
  foundations: LayoutGrid,
  buttons: MousePointerClick,
  forms: SlidersHorizontal,
  feedback: BellRing,
  navigation: PanelLeft,
  accordions: ListChecks,
  evidence: ScanSearch,
  media: Images,
  workflows: Workflow,
  "complete-patterns": Blocks,
  layouts: Columns3,
} as const

const accordionItems = [
  ["Opening", "6 / 6", "Hook type, opening pace, first product appearance and pattern interrupt."],
  ["Story and structure", "6 / 6", "Narrative arc, proof, benefit order, scene progression and retention devices."],
  ["Offer and action", "5 / 6", "Offer framing, urgency, CTA clarity, placement and final-frame legibility."],
] as const

const evidenceRecords = {
  hook: { label: "Hook type", value: "Routine demonstration", status: "Ready", confidence: "High · 94%", timestamp: 0, quote: "Creator applies serum at a mirror in the opening shot." },
  line: { label: "Hook line", value: "An evening reset for stressed skin", status: "Ready", confidence: "High · 86%", timestamp: 4, quote: "A calmer evening reset for skin that feels stressed." },
  offer: { label: "Offer clarity", value: "Review the spoken offer", status: "Review", confidence: "Medium · 68%", timestamp: 11, quote: "The benefit is spoken, but the offer is not explicit on screen." },
} as const

export function DesignSystemPage() {
  const { settings, update, reset, presentation } = useDesignSettings()
  const emphasisWeight = settings.weight === "medium" ? 500 : 400
  const typeScale = [
    ["Page", `34 / 36 · ${emphasisWeight}`, "text-page"],
    ["Section", `28 / 32 · ${emphasisWeight}`, "text-section"],
    ["Controls", `14 / 20 · ${emphasisWeight}`, "text-control"],
    ["Body", "15 / 23 · 400", "text-base"],
    ["Supporting", "13 / 18 · 400", "text-sm"],
    ["Metadata", `12 / 17 · ${emphasisWeight}`, "text-xs"],
  ] as const
  const [activeTab, setActiveTab] = useState("Review")
  const [activeSection, setActiveSection] = useState(() => window.location.hash.slice(1) || "foundations")
  const [openSections, setOpenSections] = useState<string[]>(["Opening"])
  const [showConfidence, setShowConfidence] = useState(true)
  const [sources, setSources] = useState(["visual", "transcript"])
  const [emptySources, setEmptySources] = useState<string[]>([])
  const [workflowStatus, setWorkflowStatus] = useState("draft")
  const [placement, setPlacement] = useState("reels")
  const [destination, setDestination] = useState("kindred-meta")
  const [scheduleDate, setScheduleDate] = useState("2026-10-03")
  const [rangeStart, setRangeStart] = useState("2026-09-26")
  const [rangeEnd, setRangeEnd] = useState("2026-10-02")
  const [autoPublish, setAutoPublish] = useState(false)
  const [includeReview, setIncludeReview] = useState(true)
  const [selectedEvidence, setSelectedEvidence] = useState<keyof typeof evidenceRecords>("hook")
  const [evidenceTime, setEvidenceTime] = useState<number | null>(null)
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false)
  const [evidenceMobileView, setEvidenceMobileView] = useState<"properties" | "evidence">("properties")
  const [evidenceGroups, setEvidenceGroups] = useState(() => new Set(["opening"]))
  const [navDemoOpen, setNavDemoOpen] = useState(false)
  const [demoMessage, setDemoMessage] = useState("")
  const evidence = evidenceRecords[selectedEvidence]
  const sourceOptions = [{ value: "visual", label: "Visual" }, { value: "transcript", label: "Transcript" }, { value: "audio", label: "Audio" }]

  const toggleSection = (label: string) => {
    setOpenSections((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  useEffect(() => {
    const nodes = sections.map(([id]) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node))
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible?.target.id) setActiveSection(visible.target.id)
    }, { rootMargin: "-15% 0px -70%", threshold: 0 })
    nodes.forEach((node) => observer.observe(node))
    const syncHash = () => setActiveSection(window.location.hash.slice(1) || "foundations")
    window.addEventListener("hashchange", syncHash)
    const initialSection = window.location.hash.slice(1)
    if (initialSection) requestAnimationFrame(() => document.getElementById(initialSection)?.scrollIntoView())
    return () => { observer.disconnect(); window.removeEventListener("hashchange", syncHash) }
  }, [])

  return (
    <main className="ds-catalogue" {...presentation}>
      <a className="ds-skip-link" href="#ds-main-content">Skip to design system content</a>
      <aside className="ds-catalogue__rail" aria-label="Design system sections">
        <a className="ds-catalogue__brand" href="#top" aria-label="Butterfly design system">
          <Sparkles size={19} strokeWidth={1.8} />
          <span>BUTTERFLY</span>
        </a>
        <nav>
          {sections.map(([id, label]) => {
            const SectionIcon = sectionIcons[id]
            return (
            <a className={activeSection === id ? "is-active" : ""} href={`#${id}`} key={id}>
              <SectionIcon size={18} />
              <span className="ds-nav-label">{label}</span>
            </a>
          )})}
        </nav>
      </aside>

      <div className="ds-catalogue__content" id="ds-main-content" tabIndex={-1}>
        <header className="ds-catalogue__header" id="top">
          <div>
            <h1>Butterfly design system</h1>
            <p>Real product components, complete states, responsive rules, and locally saved configuration.</p>
          </div>
          <div className="ds-catalogue__actions">
            <a className="ds-demo-link" href="/app/demo/jev-analysis">View app demo</a>
            <DesignCustomizer settings={settings} update={update} reset={reset} catalogueHref="/app/demo/jev-analysis" catalogueLabel="View app demo" />
          </div>
        </header>
        <div className="ds-config-summary" role="status">
          <strong>Live configuration</strong>
          <span>{settings.font === "jetbrains" ? "JetBrains Mono" : "Archivo Narrow"}</span>
          <span>{settings.weight}</span>
          <span>{settings.casing}</span>
          <span>Pill actions · square controls</span>
          <span>Saved in this browser</span>
        </div>
        <p className={demoMessage ? "ds-demo-status" : "bf-sr-only"} role="status">{demoMessage}</p>
        <label className="ds-mobile-sections">Browse system<select value={activeSection} onChange={(event) => { window.location.hash = event.target.value; setActiveSection(event.target.value) }}>{sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>

        <section className="ds-section" id="foundations">
          <div className="ds-section__heading">
            <h2>Foundations</h2>
            <p>Use tokens by role. Do not introduce one-off colour, type, radius or spacing values inside product screens.</p>
          </div>

          <div className="ds-foundation-grid">
            <article className="ds-specimen ds-specimen--wide">
              <div className="ds-specimen__title"><h3>Type</h3><span>One configurable family across the system</span></div>
              <div className="ds-type-list">
                {typeScale.map(([label, detail, token]) => (
                  <div className={`ds-type-row ds-type-row--${token}`} key={token}>
                    <span>{label}</span><strong>The quick signal</strong><code>{detail}</code>
                  </div>
                ))}
              </div>
              <p className="ds-usage-note"><strong>Archivo Narrow Medium</strong> is the Butterfly default. The preview can still compare JetBrains Mono, casing and density; saved choices persist after reload.</p>
            </article>

            <article className="ds-specimen">
              <div className="ds-specimen__title"><h3>Colour roles</h3><span>Semantic, not decorative</span></div>
              <div className="ds-swatches">
                <div><i className="ds-swatch ds-swatch--ink" /><strong>Ink</strong><span>Text + structure</span></div>
                <div><i className="ds-swatch ds-swatch--canvas" /><strong>Canvas</strong><span>Primary surface</span></div>
                <div><i className="ds-swatch ds-swatch--subtle" /><strong>Subtle</strong><span>Quiet grouping</span></div>
                <div><i className="ds-swatch ds-swatch--action" /><strong>Accent</strong><span>CTA, selection + active navigation</span></div>
              </div>
            </article>

            <article className="ds-specimen">
              <div className="ds-specimen__title"><h3>Spacing + radius</h3><span>Consistent rhythm</span></div>
              <div className="ds-spacing-scale" aria-label="Spacing scale">
                {[3, 5, 8, 13, 21, 34, 55].map((space) => <div key={space}><i style={{ width: `var(--space-${space})` }} /><code>{space}</code></div>)}
              </div>
              <div className="ds-radius-scale" aria-label="Radius scale">
                <i className="is-micro">5</i><i className="is-control">8</i><i className="is-panel">13</i><i className="is-dialog">21</i>
              </div>
              <p className="ds-usage-note"><strong>Pill:</strong> actions, status, filters, segmented choices and switches. <strong>Square:</strong> fields, menus, uploads, tables, accordions, evidence and media.</p>
            </article>
            <Surface as="article" tone="inverse" geometry="cut" className="ds-feature-surface ds-specimen--wide">
              <AccentLabel>Neural ideation</AccentLabel>
              <div><h3>One deliberate inverse workbench</h3><p>Dark surfaces focus generated creative, media playback, or a single onboarding moment. Ordinary forms, filters, tables and evidence stay on the white canvas.</p></div>
              <Button variant="outline" onClick={() => setDemoMessage("Sample draft opened in this catalogue preview.")}>Open draft</Button>
            </Surface>
            <article className="ds-geometry-palette ds-specimen--wide" aria-label="Governed geometry surfaces">
              <Surface tone="subtle" geometry="cut"><strong>Quiet structure</strong><span>Groups supporting context without becoming another card.</span></Surface>
              <Surface tone="accent" geometry="cut"><strong>High-signal moment</strong><span>Reserved for a selected state, completion or decisive action.</span></Surface>
            </article>
          </div>
        </section>

        <section className="ds-section" id="buttons">
          <div className="ds-section__heading">
            <h2>Buttons</h2>
            <p>One dominant action per view. The shared pink-to-magenta gradient carries white text and never wraps.</p>
          </div>
          <article className="ds-specimen ds-component-grid">
            <div><span className="ds-component-label">Primary</span><Button variant="primary" icon={<Sparkles size={16} />} onClick={() => setDemoMessage("Iteration creation specimen activated.")}>Create iteration</Button></div>
            <div><span className="ds-component-label">Outline</span><Button variant="outline" onClick={() => setDemoMessage("Review specimen opened.")}>Open review</Button></div>
            <div><span className="ds-component-label">Secondary</span><Button variant="secondary" icon={<Columns3 size={16} />} onClick={() => setDemoMessage("Two sample creatives selected for comparison.")}>Compare</Button></div>
            <div><span className="ds-component-label">Quiet</span><Button variant="quiet" onClick={() => setDemoMessage("Sample action cancelled.")}>Cancel</Button></div>
            <div><span className="ds-component-label">Icon</span><IconButton label="Filter" icon={<SlidersHorizontal size={18} />} onClick={() => setDemoMessage("Filter utility activated.")} /></div>
            <div><span className="ds-component-label">Loading</span><Button variant="primary" loading>Create iteration</Button></div>
            <div><span className="ds-component-label">Disabled</span><Button variant="secondary" disabled>Compare</Button></div>
          </article>
        </section>

        <section className="ds-section" id="forms">
          <div className="ds-section__heading">
            <h2>Form controls</h2>
            <p>Labels describe data; placeholders never replace labels. Selection, validation and focus must remain visible without colour alone.</p>
          </div>
          <article className="ds-specimen ds-form-grid">
            <Field label="Search properties" type="search" icon={<Search size={17} />} placeholder="Hook, offer, CTA…" hint="Search all 41 JEV fields" />
            <SelectField label="Status" defaultValue="all" hint="One value at a time"><option value="all">All findings</option><option value="ready">Ready</option><option value="review">Needs review</option></SelectField>
            <Checkbox label="Show confidence" hint="Display model confidence" checked={showConfidence} onChange={(event) => setShowConfidence(event.target.checked)} />
            <Field label="Ad reference" defaultValue="" error="Enter an ad reference" />
            <Field label="Workspace" defaultValue="Kindred" disabled hint="Managed by the connected account" />
          </article>
          <article className="ds-specimen">
            <div className="ds-specimen__title"><h3>Multi-select</h3><span>Independent choices</span></div>
            <div className="ds-form-grid ds-form-grid--multi-select">
              <MultiSelect label="Evidence sources" options={sourceOptions} value={sources} onValueChange={setSources} hint="Select one or more evidence sources." />
              <MultiSelect label="No selection" options={sourceOptions} value={emptySources} onValueChange={setEmptySources} hint="Open to choose one or more sources." />
              <MultiSelect label="Disabled" options={sourceOptions} value={["visual"]} onValueChange={() => undefined} disabled hint="Unavailable until analysis finishes." />
              <MultiSelect label="Empty results" options={[]} value={[]} onValueChange={() => undefined} hint="No sources are available." />
            </div>
          </article>
          <article className="ds-specimen">
            <div className="ds-specimen__title"><h3>Workflow + scheduling</h3><span>Butterfly controls</span></div>
            <div className="ds-filter-grid">
              <SegmentedControl tone="accent" label="Workflow status" value={workflowStatus} onValueChange={setWorkflowStatus} options={[{ value: "draft", label: "Draft" }, { value: "review", label: "Review" }, { value: "ready", label: "Ready" }, { value: "scheduled", label: "Scheduled" }]} />
              <SegmentedControl label="Placement" value={placement} onValueChange={setPlacement} options={[{ value: "reels", label: "Reels" }, { value: "stories", label: "Stories" }, { value: "feed", label: "Feed" }]} />
              <Combobox label="Publish destination" value={destination} onValueChange={setDestination} placeholder="Choose Meta account" searchPlaceholder="Search accounts…" options={[{ value: "kindred-meta", label: "Kindred · Instagram + Facebook" }, { value: "kindred-ig", label: "Kindred · Instagram only" }, { value: "sandbox", label: "Sample account · Preview only" }]} />
              <CalendarDatePicker label="Schedule for" value={scheduleDate} onValueChange={setScheduleDate} />
              <CalendarDateRangePicker className="ds-filter-grid__wide" label="Performance window" start={rangeStart} end={rangeEnd} onRangeChange={(start, end) => { setRangeStart(start); setRangeEnd(end) }} />
              <DateField label="Native date fallback" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} hint="Use when month navigation adds no value." />
              <DateRangeField className="ds-filter-grid__wide" label="Native range fallback" start={rangeStart} end={rangeEnd} onStartChange={setRangeStart} onEndChange={setRangeEnd} />
              <div className="ds-switch-stack ds-filter-grid__wide"><Switch label="Publish automatically" hint="Keep off while this workspace uses sample data." checked={autoPublish} onCheckedChange={setAutoPublish} /><Switch label="Include in performance review" checked={includeReview} onCheckedChange={setIncludeReview} /></div>
            </div>
          </article>
        </section>

        <section className="ds-section" id="feedback">
          <div className="ds-section__heading">
            <h2>Status + loading</h2>
            <p>Use status labels for meaningful workflow state. Loading placeholders retain the shape of the content they replace.</p>
          </div>
          <div className="ds-feedback-grid">
            <article className="ds-specimen">
              <div className="ds-specimen__title"><h3>Status</h3><span>State is written, not colour-only</span></div>
              <div className="ds-status-row"><Badge variant="ready">Ready</Badge><Badge variant="neutral">Sample</Badge><Badge variant="review">Review</Badge><Badge variant="error">Unavailable</Badge></div>
            </article>
            <article className="ds-specimen">
              <div className="ds-specimen__title"><h3>Loading</h3><span>Preserve layout</span></div>
              <div className="ds-loading-stack"><Skeleton variant="text" width="44%" /><Skeleton variant="text" width="76%" /><Skeleton variant="text" width="61%" /></div>
            </article>
          </div>
        </section>

        <section className="ds-section" id="navigation">
          <div className="ds-section__heading">
            <h2>Navigation + icons</h2>
            <p>Use a single Lucide outline family. Icons clarify an action; they do not sit inside decorative pastel tiles.</p>
          </div>
          <article className="ds-specimen ds-navigation-workbench">
            <Dialog.Root open={navDemoOpen} onOpenChange={setNavDemoOpen}><Dialog.Trigger asChild><button className="ds-navigation-workbench__mobile-trigger" type="button" aria-label="Open navigation"><Menu aria-hidden="true" /></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="ds-navigation-demo__overlay" /><Dialog.Content className="ds-navigation-demo__drawer" aria-label="Navigation preview"><Dialog.Title className="bf-sr-only">Navigation preview</Dialog.Title><Dialog.Close asChild><button className="ds-navigation-demo__close" type="button" aria-label="Close navigation"><X aria-hidden="true" /></button></Dialog.Close><aside className="ds-navigation-workbench__rail ds-navigation-workbench__rail--drawer">
              <div className="ds-navigation-workbench__brand"><Sparkles aria-hidden="true" /><span>BUTTERFLY</span></div>
              <div className="ds-navigation-workbench__workspace"><span>K</span><div><strong>KINDRED</strong><small>SAMPLE ACCOUNT</small></div></div>
              <RailNav mode="labeled" onNavigate={() => setNavDemoOpen(false)} items={[
                { label: "Ad library", href: "#navigation-library", icon: Images, active: true },
                { label: "Groups", href: "#navigation-groups", icon: FolderKanban },
                { label: "Work queue", href: "#navigation-work", icon: ListChecks },
              ]} />
            </aside></Dialog.Content></Dialog.Portal></Dialog.Root>
            <aside className="ds-navigation-workbench__rail">
              <div className="ds-navigation-workbench__brand"><Sparkles aria-hidden="true" /><span>BUTTERFLY</span></div>
              <div className="ds-navigation-workbench__workspace"><span>K</span><div><strong>KINDRED</strong><small>SAMPLE ACCOUNT</small></div></div>
              <RailNav mode={settings.sidebar} onNavigate={(href) => setDemoMessage(`Navigation preview moved to ${href.replace("#navigation-", "")}.`)} items={[
                { label: "Ad library", href: "#navigation-library", icon: Images, active: true },
                { label: "Groups", href: "#navigation-groups", icon: FolderKanban },
                { label: "Work queue", href: "#navigation-work", icon: ListChecks },
              ]} />
            </aside>
            <div className="ds-navigation-workbench__page">
              <Breadcrumb items={[{ label: "Ad library", href: "#navigation" }, { label: "Evening reset" }]} />
              <header className="ds-navigation-workbench__header"><div><span>CREATIVE REVIEW</span><h3>EVENING RESET</h3><p>Kindred · Instagram Reels · Sample analysis</p></div><DropdownMenu className="ds-navigation-actions" label="Creative actions" triggerText="More actions" align="end" items={[{ id: "copy", label: "Copy link", onSelect: () => setDemoMessage("Sample creative link copied for this preview.") }, { id: "queue", label: "Add to work queue", onSelect: () => setDemoMessage("Sample creative added to the preview queue.") }, { id: "download", label: "Download source", onSelect: () => setDemoMessage("Source download specimen activated.") }]} /></header>
              <Tabs idPrefix="ds" label="Creative views" items={[{ value: "Review", label: "Review" }, { value: "Performance", label: "Performance" }, { value: "Notes & versions", label: "Notes & versions" }]} value={activeTab} onValueChange={setActiveTab} panelId="ds-tab-panel" />
              <div className="ds-navigation-workbench__panel" id="ds-tab-panel" role="tabpanel" aria-labelledby={`ds-tab-${encodeURIComponent(activeTab)}`}><strong>{activeTab}</strong><span>Tabs change sibling views; breadcrumbs preserve location; menus contain actions.</span></div>
            </div>
          </article>
        </section>

        <section className="ds-section" id="accordions">
          <div className="ds-section__heading">
            <h2>Accordions</h2>
            <p>Use accordions for scannable groups with independent contents. Use a dropdown for choosing one value; never use an accordion as a select menu.</p>
          </div>
          <article className="ds-specimen ds-accordion-list"><Accordion items={[...accordionItems.map(([label, count, body]) => ({ id: label, label, meta: count, content: <p>{body}</p> })), { id: "delivery", label: "Delivery signals", meta: "2 unresolved", unresolved: true, content: <p>Two placement-specific checks still need a reviewer decision.</p> }, { id: "restricted", label: "Publishing checks", meta: "Permission required", disabled: true, content: <p>An editor role is required.</p> }]} openIds={new Set(openSections)} onToggle={toggleSection} /></article>
        </section>

        <section className="ds-section" id="evidence">
          <div className="ds-section__heading">
            <h2>Evidence patterns</h2>
            <p>Put the finding first, provenance second, and the action at the point of proof. Gradient labels identify ready or selected states; review and error states retain explicit wording.</p>
          </div>
          <article className="ds-specimen ds-evidence-workbench">
            <header className="ds-evidence-workbench__header"><div><span>SELECTED CREATIVE</span><h3>EVENING RESET — CUT 02</h3></div><Badge variant="neutral">SAMPLE ANALYSIS</Badge></header>
            <Tabs className="ds-evidence-mobile-tabs" idPrefix="ds-evidence-mobile" label="Evidence review panes" items={[{value:"properties",label:"Properties"},{value:"evidence",label:"Evidence"}]} value={evidenceMobileView} onValueChange={setEvidenceMobileView} panelId={`ds-evidence-${evidenceMobileView}-panel`} />
            <div className="ds-evidence-workbench__body">
              <div id="ds-evidence-properties-panel" role="tabpanel" aria-labelledby="ds-evidence-mobile-tab-properties" className={`ds-property-list ${evidenceMobileView !== "properties" ? "is-hidden-mobile" : ""}`}><div className="ds-specimen__title"><h3>ANALYSIS PROPERTIES</h3><span>FIXED CONFIDENCE</span></div><PropertyList groups={[{ id: "opening", label: "Opening", meta: "3 / 3", rows: [{ id: "hook", label: "Hook type", value: "Routine demonstration", status: "ready", confidence: .94 }, { id: "line", label: "Hook line", value: "An evening reset for stressed skin", status: "ready", confidence: .86 }, { id: "offer", label: "Offer clarity", value: "Review the spoken offer", status: "review" }] }]} selectedId={selectedEvidence} openIds={evidenceGroups} onSelect={(id) => { setSelectedEvidence(id as keyof typeof evidenceRecords); setEvidenceTime(null); setEvidenceConfirmed(false); setEvidenceMobileView("evidence") }} onToggleGroup={(id) => setEvidenceGroups(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })} /></div>
              <div id="ds-evidence-evidence-panel" role="tabpanel" aria-labelledby="ds-evidence-mobile-tab-evidence" className={`ds-evidence-workbench__detail ${evidenceMobileView !== "evidence" ? "is-hidden-mobile" : ""}`}><div className="ds-evidence-frame"><img src="/brand/kindred-campaign-hands.png" alt={`Evidence frame for ${evidence.label}`} />{evidenceTime === evidence.timestamp ? <span>PLAYHEAD {Math.floor(evidence.timestamp / 60)}:{String(evidence.timestamp % 60).padStart(2, "0")}</span> : <span>FRAME {Math.floor(evidence.timestamp / 60)}:{String(evidence.timestamp % 60).padStart(2, "0")}</span>}</div><EvidenceInspector label={evidence.label} value={evidence.value} status={evidence.status} facts={[{ label: "Confidence", value: evidence.confidence }, { label: "Source", value: "Visual" }, { label: "Timestamp", value: `${Math.floor(evidence.timestamp / 60)}:${String(evidence.timestamp % 60).padStart(2, "0")}` }]} quote={evidence.quote} timestamp={evidence.timestamp} provenance="JEV sample analysis · Source creative" confirmed={evidenceConfirmed} onViewTimestamp={setEvidenceTime} onCorrect={() => setEvidenceConfirmed(false)} onConfirm={() => setEvidenceConfirmed(true)} /></div>
            </div>
          </article>
        </section>

        <section className="ds-section" id="media">
          <div className="ds-section__heading">
            <h2>Media</h2>
            <p>Reels and Stories always render on a true 9:16 stage without cropping. Other media keeps its source ratio.</p>
          </div>
          <article className="ds-specimen ds-media-workbench">
            <div className="ds-media-workbench__stage"><MediaStage src="/brand/kindred-campaign-hands.png" alt="Kindred skincare vertical creative" /></div>
            <div className="ds-media-workbench__details"><span className="ds-component-label">SOURCE CREATIVE</span><h3>EVENING RESET — CUT 02</h3><p>Instagram Reels · 1080 × 1920 · 0:18</p><div className="ds-renditions" aria-label="Media rendition rules"><div><strong>9:16</strong><span>Reels + Stories · contain</span></div><div><strong>1:1</strong><span>Feed square · contain</span></div><div><strong>4:5</strong><span>Feed portrait · contain</span></div></div><p className="ds-usage-note">The primary asset is borderless and never cropped. Playback controls appear only for real video.</p><Button variant="outline" onClick={() => setDemoMessage("Creative preview opened.")}>Open creative</Button></div>
          </article>
        </section>

        <WorkflowSpecimens />
        <ExtendedSpecimens />
        <section className="ds-section" id="layouts">
          <div className="ds-section__heading"><h2>Layouts + coverage</h2><p>A component is ready only when its states, keyboard behaviour and narrow layout work in the product as well as here.</p></div>
          <div className="ds-foundation-grid">
            <article className="ds-specimen"><div className="ds-specimen__title"><h3>Workspace layout</h3><span>Responsive structure</span></div><p className="ds-usage-note">Labelled navigation establishes location. The page header contains the breadcrumb, one title, metadata and actions. Tabs change sibling views. Content panes follow available width and stack on small screens; media keeps its source ratio.</p><div className="ds-layout-map" aria-label="Workspace regions"><span>Navigation</span><div><span>Breadcrumb · title · actions</span><span>View tabs</span><div><span>Creative</span><span>Findings + evidence</span></div></div></div></article>
            <article className="ds-specimen"><div className="ds-specimen__title"><h3>Interaction rules</h3><span>Every component</span></div><ul className="ds-rules"><li>Visible keyboard focus and descriptive accessible names.</li><li>Labels remain visible in empty, invalid and disabled states.</li><li>Selection is conveyed through wording or shape as well as colour.</li><li>Compact and comfortable density preserve readable text and usable targets.</li><li>Reduced motion removes nonessential transitions.</li></ul></article>
            <article className="ds-specimen ds-specimen--wide"><div className="ds-specimen__title"><h3>21st.dev adoption</h3><span>Pattern source · Butterfly owner</span></div><div className="ds-coverage ds-provenance"><div><strong>Workspace shell</strong><span><a href="https://21st.dev/@arunjdass/components/dashboard-sidebar" target="_blank" rel="noreferrer">21st.dev Dashboard Sidebar</a> + <a href="https://ui.shadcn.com/docs/components/sidebar" target="_blank" rel="noreferrer">shadcn Sidebar</a> → labelled rail, icon rail, account switcher, active route and 288px mobile drawer; owned by AppShell.</span></div><div><strong>Filter and data controls</strong><span><a href="https://21st.dev/@ruixen.ui/components/flexi-filter-table" target="_blank" rel="noreferrer">21st.dev Flexi Filter Table</a> + <a href="https://ui.shadcn.com/docs/components/data-table" target="_blank" rel="noreferrer">shadcn Data Table</a> → search-first toolbar, applied chips, sort, view switch, pagination and bulk actions; owned by FilterBar and dataset components.</span></div><div><strong>Upload</strong><span><a href="https://21st.dev/@joyco/components/file-dropzone" target="_blank" rel="noreferrer">21st.dev File Dropzone</a> → click/drop, validation, preview, remove, progress and retry; owned by Dropzone and upload components.</span></div><div><strong>Responsive tasks</strong><span><a href="https://21st.dev/@efferd/components/smart-popover" target="_blank" rel="noreferrer">21st.dev Smart Popover</a> + <a href="https://ui.shadcn.com/docs/components/sheet" target="_blank" rel="noreferrer">shadcn/Radix Sheet</a> → bounded desktop popovers and focused mobile sheets; owned by FilterPopover and Sheet.</span></div><div><strong>Review timeline</strong><span><a href="https://21st.dev/@olewandowski1/components/timeline-3" target="_blank" rel="noreferrer">21st.dev Activity Timeline</a> → seekable shots, transcript segments and version activity without decorative auto-scroll; owned by ShotStrip, Transcript and ActivityTimeline.</span></div></div><p className="ds-usage-note">The pattern library contributes interaction behavior, not a second visual theme. Every adopted pattern is rebuilt from the editable local registry and governed by Butterfly tokens.</p></article>
            <article className="ds-specimen ds-specimen--wide"><div className="ds-specimen__title"><h3>Coverage</h3><span>Live specimens above</span></div><div className="ds-coverage"><div><strong>Foundations</strong><span>Type · colour · spacing · radius · icons · motion · saved configuration</span></div><div><strong>Actions</strong><span>Primary · secondary · destructive · quiet · icon · loading · disabled · confirmation</span></div><div><strong>Input + selection</strong><span>Text · textarea · OTP · search · select · multi-select · combobox · segmented choice · date · date range · checkbox · switch · error · empty</span></div><div><strong>Navigation</strong><span>Workspace header · page tabs · task views · rail · breadcrumb · dropdown menu · sheet · tooltip</span></div><div><strong>Data at scale</strong><span>Filters · chips · sort · result count · grid/table toggle · pagination · bulk actions · table · creative card</span></div><div><strong>Review patterns</strong><span>Accordion · property list · evidence detail · 9:16 media · transcript · shot strip · activity timeline</span></div><div><strong>System states</strong><span>Empty · loading · success · warning · error · permission · progress · connection · team and invite states</span></div></div><p className="ds-usage-note">These are the actual shared Butterfly components using local sample data, not static HTML replicas. This catalogue does not imply live analysis, publishing or external account connectivity.</p></article>
          </div>
        </section>
        <footer className="ds-catalogue__footer"><span>BUTTERFLY DESIGN SYSTEM</span><a href="/app/demo/jev-analysis">Open JEV analysis demo</a></footer>
      </div>
    </main>
  )
}

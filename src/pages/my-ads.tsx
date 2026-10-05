import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { GitCompareArrows, Plus, Search, X } from "lucide-react"
import { visibleAds, statusLabel, type Ad } from "@/data/ads"
import { getJevFindings, type JevProperty } from "@/data/jev"
import { getAnalysisProperties } from "@/lib/analysis-properties"
import { analysisPermissions, deriveAnalysisView, getAnalysisLifecycle, type AnalysisView } from "@/lib/analysis-lifecycle"
import { readGroups, writeGroups, type AdGroup } from "@/lib/groups"
import { appPath } from "@/lib/app-location"
import { comparisonAds, creativeAspectRatio, deliveryFor, libraryDetailHref, readLibraryState, selectLibraryAds, updateLibrarySearch, type DeliveryRange, type LibraryFindings } from "@/lib/library"
import { Page } from "@/components/page"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogActions, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger, Badge, BulkActionBar, Button, CalendarDateRangePicker, Combobox, ComparisonMatrix, CreativeCard, DataTable, Field, FilterChip, MediaStage, MetricCell, PageTabs, Pagination, ResponsiveFilterTask, ResultCount, SelectField, SortSelect, StatePanel, ViewToggle, WorkspacePageHeader, type DataColumn } from "@/design-system/components"
import "./my-ads.css"

// Library filters and detail review share the same ad-scoped, human-reviewed values.
const recordedFindings = getJevFindings

function metricValue(ad: Ad, range: DeliveryRange, metric: string) {
  const delivery = deliveryFor(ad, range)
  if (!delivery) return undefined
  const results = Number(delivery.results.value.replace(/[^\d.]/g, ""))
  if (metric === "Spend") return `$${delivery.spend.toLocaleString()}`
  if (metric === "CPA") return results ? `$${Math.round(delivery.spend / results)}` : undefined
  if (metric === "ROAS") return undefined
  return `${delivery.results.value} ${delivery.results.label.toLowerCase()}`
}

const metricOptions = ["Results", "Spend", "CPA", "ROAS"] as const

const analysisLabels: Record<AnalysisView,string> = {"not-analysed":"Not run",queued:"Queued",preparing:"Preparing",analysing:"Analysing",partial:"Partial results",complete:"Complete",failed:"Failed",stale:"Outdated",permission:"Permission needed",readonly:"Read only"}

function libraryMedia(ad: Ad) {
  const upload = ad.id.startsWith("upload-")
  const src = upload ? ad.uploadUrl : ad.poster || undefined
  return {src, upload, missing:!src, document:!!src && ad.uploadType === "pdf", type:ad.uploadType === "video" ? "video" as const : "image" as const,
    source:upload ? ad.scaleFixture ? "Sample upload" : "Your upload" : ad.scaleFixture ? "Local scale fixture" : "Meta sample"}
}

function ComparisonMedia({ad}: {ad:Ad}) {
  const media = libraryMedia(ad)
  const [failed,setFailed] = useState(false)
  return <div onErrorCapture={()=>setFailed(true)}>{media.missing || failed || media.document
    ? <div className="library-comparison-placeholder">{media.document ? "Document preview unavailable" : "Media unavailable"}</div>
    : <MediaStage src={media.src!} alt={ad.name || ad.product} mediaType={media.type} aspectRatio={creativeAspectRatio(ad)} />}
    {media.document && <Button asChild variant="quiet"><a href={media.src} target="_blank" rel="noreferrer">Open PDF</a></Button>}
  </div>
}

function LibraryCard({ ad, href, selected, onSelect, range, metric, finding, missingMedia, analysis }: {
  ad: Ad; href: string; selected: boolean; onSelect?: (value: boolean) => void; range: DeliveryRange; metric: string; finding?: JevProperty; missingMedia: boolean; analysis: AnalysisView
}) {
  const [failed, setFailed] = useState(false)
  const media = libraryMedia(ad)
  const missing = missingMedia || failed || media.missing
  return <div className="library-card-wrap" onErrorCapture={() => setFailed(true)}>
    <CreativeCard title={ad.name || ad.product} href={href} src={missing ? undefined : media.src} mediaType={media.document && !missing ? "document" : media.type} width={ad.w} height={ad.h} alt={ad.name || ad.product} aspectRatio={creativeAspectRatio(ad)}
      source={media.upload ? `${media.source} · ${missing ? "Media unavailable" : "Available this session"}` : ad.placement || "Placement unavailable"}
      selected={selected} onSelect={onSelect} renderLink={({href,children})=><Link to={href}>{children}</Link>}>
      <span className="library-status">{statusLabel[ad.status]}</span>
      <MetricCell label={metric} value={metricValue(ad, range, metric)} source="Sample Meta" window={`${range} days`} missingReason={metric === "ROAS" ? "Revenue unavailable" : "No delivery data"} />
      <p className="library-finding">{finding ? `${finding.label}: ${finding.value}` : `JEV analysis: ${analysisLabels[analysis]}`}</p>
      {media.document && !missing && <Button asChild variant="secondary"><a href={media.src} target="_blank" rel="noreferrer">Open PDF</a></Button>}
      {missing && media.upload && !ad.scaleFixture && <Button asChild variant="secondary"><Link to={appPath(`/add?tab=upload&replace=${encodeURIComponent(ad.id)}`)}>Reattach Media</Link></Button>}
    </CreativeCard>
  </div>
}

const filterKeys = ["q", "campaign", "adSet", "status", "placement", "property", "value", "from", "to", "group", "source", "analysis-status"]
const sortOptions = [{ value: "spend", label: "Spend" }, { value: "results", label: "Results" }, { value: "recent", label: "Creative date" }, { value: "name", label: "Name" }]

export function MyAds() {
  const [params, setParams] = useSearchParams()
  const fixtureCount = params.get("fixture-count")
  const ads = useMemo(visibleAds,[fixtureCount])
  const [properties] = useState(()=>getAnalysisProperties().filter(item=>item.enabled))
  const [groups, setGroups] = useState(readGroups)
  const [selected, setSelected] = useState<string[]>(() => (params.get("compare") || "").split(",").filter(Boolean))
  const [notice, setNotice] = useState("")
  const [groupEditor, setGroupEditor] = useState<"new" | "rename" | null>(null)
  const [groupName, setGroupName] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches)
  const groupTrigger = useRef<HTMLButtonElement | null>(null)
  const compareTrigger = useRef<HTMLButtonElement | null>(null)
  const newGroupRef = useRef<HTMLButtonElement>(null)
  const deleteGroupRef = useRef<HTMLButtonElement>(null)
  const [metric, setMetric] = useState(() => {
    const stored = localStorage.getItem("butterfly-library-metric") || localStorage.getItem("butterfly-default-metric")
    return metricOptions.includes(stored as (typeof metricOptions)[number]) ? stored! : "Results"
  })
  const state = readLibraryState(params, localStorage.getItem("butterfly-default-range") || "30")
  const previewState = params.get("state")
  const readOnly = previewState === "permission" || previewState === "readonly"
  const lifecycles = useMemo(()=>Object.fromEntries(ads.map(ad=>[ad.id,getAnalysisLifecycle(ad.id,{hasResult:recordedFindings(ad).length>0,fixture:params.get("analysis")})])),[ads,params.get("analysis")])
  const findings: LibraryFindings = useMemo(() => Object.fromEntries(ads.map(ad => [ad.id, lifecycles[ad.id].result === "none" ? [] : recordedFindings(ad).filter(item=>properties.some(property=>property.id===item.id) && (lifecycles[ad.id].result !== "partial" || lifecycles[ad.id].completedGroupIds.includes(item.section)))])), [ads,lifecycles,properties])
  const rows = selectLibraryAds(ads, state, groups, findings).filter(ad=>(!params.get("source") || (params.get("source")==="upload") === ad.id.startsWith("upload-")) && (!params.get("analysis-status") || deriveAnalysisView(lifecycles[ad.id])===params.get("analysis-status")))
  const rowIds = rows.map(ad => ad.id)
  const selectedVisible = selected.filter(id => rowIds.includes(id))
  const compared = comparisonAds(rows, selectedVisible)
  const selectedGroup = groups.find(group => group.id === state.group) ?? (!state.group ? groups[0] : undefined)
  const pageSize = 12
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(Number.isFinite(state.page) ? state.page : 1, pageCount)
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const comparisonOpen = params.has("compare") && compared.length > 0
  const contextParams = new URLSearchParams(params)
  contextParams.set("range", state.range)
  if (state.tab === "groups" && selectedGroup) contextParams.set("group", selectedGroup.id)
  const update = (patch: Record<string, string | number | null>) => setParams(current => updateLibrarySearch(current, patch))
  const clearFilters = () => update(Object.fromEntries(filterKeys.map(key => [key, null])))
  const changeSelection = (next: string[]) => { setSelected(next); if (params.has("compare")) update({compare:null}) }
  const detailHref = (ad: Ad) => libraryDetailHref(ad.id, contextParams, rowIds)
  const changeMetric = (value: string) => {
    setMetric(value)
    localStorage.setItem("butterfly-library-metric", value)
  }
  const selectionScope = [...filterKeys,"range","view","fixture-count"].map(key=>`${key}=${params.get(key)||""}`).join("&")
  const lastScope = useRef(selectionScope)
  useEffect(() => { if(lastScope.current!==selectionScope){lastScope.current=selectionScope;if(selected.length){setSelected([]);setNotice("Selection cleared because the library filters changed.")}} }, [selectionScope])
  useEffect(() => { if (readOnly) setSelected([]) }, [readOnly])
  useEffect(() => { const media=window.matchMedia("(max-width: 700px)");const sync=()=>setMobileFilters(media.matches);sync();media.addEventListener("change",sync);return()=>media.removeEventListener("change",sync) }, [])

  function saveGroups(next: AdGroup[]) {
    try { writeGroups(next); setGroups(next); return true }
    catch { setNotice("Could not save groups in this browser. Free some storage and try again."); return false }
  }
  function submitGroup(event: React.FormEvent) {
    event.preventDefault()
    const name = groupName.trim()
    if (!name || readOnly) return
    const id = groupEditor === "rename" ? selectedGroup?.id : crypto.randomUUID()
    if (!id) return
    const next = groupEditor === "rename" ? groups.map(group => group.id === id ? {...group,name} : group) : [...groups,{id,name,adIds:[]}]
    if (!saveGroups(next)) return
    update({view:"groups",group:id})
    setGroupEditor(null)
    setNotice(`Group ${name} saved.`)
  }
  function deleteGroup() {
    if (!selectedGroup || readOnly) return
    const next = groups.filter(group => group.id !== selectedGroup.id)
    if (!saveGroups(next)) return
    update({group:next[0]?.id || null,compare:null})
    setConfirmDelete(false)
    setSelected([])
    setNotice("Group deleted. Its ads remain in the library.")
    requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(".library-group-list button")?.focus() || newGroupRef.current?.focus())
  }
  function addToGroup(id: string) {
    if (!id || readOnly) return
    if (saveGroups(groups.map(group => group.id === id ? {...group,adIds:[...new Set([...group.adIds,...selectedVisible])]} : group))) {
      setNotice(`${selectedVisible.length} ads added to ${groups.find(group=>group.id===id)?.name}.`)
      changeSelection([])
    }
  }
  function removeFromGroup() {
    if (!selectedGroup || readOnly) return
    if (saveGroups(groups.map(group=>group.id===selectedGroup.id ? {...group,adIds:group.adIds.filter(id=>!selectedVisible.includes(id))} : group))) {
      setNotice("Selected ads removed from this group.")
      changeSelection([])
    }
  }
  const valuesFor = (key: "campaign" | "adSet" | "placement") => [...new Set(ads.filter(ad=>key!=="adSet" || !state.campaign || ad.campaign===state.campaign).map(ad=>ad[key]).filter((value): value is string => Boolean(value)))].sort()
  const propertyValues = [...new Set(Object.values(findings).flat().filter(item=>item.id===state.property && item.status!=="pending" && item.status!=="unavailable").map(item=>item.value))]
  const applied = [
    {key:"q",label:"Search",value:state.query}, {key:"campaign",label:"Campaign",value:state.campaign}, {key:"adSet",label:"Ad set",value:state.adSet},
    {key:"status",label:"Status",value:state.status}, {key:"placement",label:"Placement",value:state.placement},
    {key:"group",label:"Saved group",value:state.group ? selectedGroup?.name || state.group : ""},
    {key:"property",label:"JEV",value:properties.find(item=>item.id===state.property)?.name || state.property},
    {key:"source",label:"Source",value:params.get("source") === "upload" ? "Uploads" : params.get("source") === "meta" ? "Meta sample" : ""},
    {key:"analysis-status",label:"Analysis",value:analysisLabels[params.get("analysis-status") as AnalysisView] || ""},
    {key:"value",label:"Finding",value:state.propertyValue}, {key:"from",label:"Added from",value:state.dateFrom}, {key:"to",label:"Added to",value:state.dateTo},
  ].filter(item=>item.value)
  const columns: DataColumn<Ad>[] = [
    {id:"name",label:"Ad",sortable:true,render:ad=><div className="library-table-identity"><div className="library-table-thumbnail">{ad.poster && !ad.id.startsWith("upload-") || ad.uploadType === "image" && ad.uploadUrl ? <img src={ad.uploadUrl || ad.poster} width={ad.w} height={ad.h} alt="" loading="lazy" /> : <span>{libraryMedia(ad).document ? "PDF" : ad.uploadType === "video" ? "Video" : "No media"}</span>}</div><div><Link to={detailHref(ad)}>{ad.name || ad.product}</Link><p>{libraryMedia(ad).source}</p></div></div>},
    {id:"campaign",label:"Campaign / ad set",render:ad=>ad.campaign ? <div className="library-table-context"><strong>{ad.campaign}</strong><span>{ad.adSet || "Not set"}</span></div> : "Not assigned"},
    {id:"placement",label:"Placement",render:ad=>ad.placement || "Not set"},
    {id:"status",label:"Status",render:ad=>statusLabel[ad.status]},
    {id:"analysis",label:"JEV analysis",render:ad=>analysisLabels[deriveAnalysisView(lifecycles[ad.id])]},
    {id:"hook",label:"JEV hook",render:ad=>findings[ad.id]?.find(item=>item.id==="opening-1")?.value || "Not assessed"},
    {id:"spend",label:"Spend",sortable:true,numeric:true,render:ad=><MetricCell label="Spend" value={metricValue(ad,state.range,"Spend")} source="Sample Meta" window={`${state.range} days`} missingReason="No delivery data" />},
    {id:"results",label:"Results",sortable:true,numeric:true,render:ad=><MetricCell label="Results" value={metricValue(ad,state.range,"Results")} source="Sample Meta" window={`${state.range} days`} missingReason="No delivery data" />},
  ]
  const select = (label: string, key: string, value: string, options: {value:string;label:string}[]) => <SelectField label={label} value={value} onChange={event=>update({[key]:event.target.value,...(key==="campaign" ? {adSet:null} : key==="property" ? {value:null} : {})})}><option value="">All</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
  const tableRows = previewState === "empty" ? [] : pageRows
  const noAds = !ads.length || previewState === "empty"
  const filterFields = <>
    <SelectField label="Delivery window" value={state.range} onChange={event=>update({range:event.target.value})}>{["7","30","90"].map(value=><option key={value} value={value}>{value} days ending 22 Sep 2026</option>)}</SelectField>
    <CalendarDateRangePicker label="Creative added" start={state.dateFrom} end={state.dateTo} onRangeChange={(from,to)=>update({from,to})} />
    {select("Campaign","campaign",state.campaign,valuesFor("campaign").map(value=>({value,label:value})))}
    {select("Ad set","adSet",state.adSet,valuesFor("adSet").map(value=>({value,label:value})))}
    {select("Status","status",state.status,[...new Set(ads.map(ad=>ad.status))].map(value=>({value,label:statusLabel[value]})))}
    {select("Placement","placement",state.placement,valuesFor("placement").map(value=>({value,label:value})))}
    {select("Source","source",params.get("source") || "",[{value:"meta",label:"Meta sample"},{value:"upload",label:"Uploads"}])}
    {select("Analysis status","analysis-status",params.get("analysis-status") || "",Object.entries(analysisLabels).map(([value,label])=>({value,label})))}
    <Combobox label="Saved group" value={state.group} onValueChange={group=>update({group})} options={[{value:"",label:"All groups"},...groups.map(group=>({value:group.id,label:group.name}))]} />
    <Combobox label="JEV property" value={state.property} onValueChange={property=>update({property,value:null})} options={[{value:"",label:"All properties"},...properties.map(item=>({value:item.id,label:item.name}))]} />
    {state.property && <Combobox label="JEV finding" value={state.propertyValue} onValueChange={value=>update({value})} options={[{value:"",label:"All findings"},...propertyValues.map(value=>({value,label:value}))]} />}
    {state.property && !propertyValues.length && <p>No recorded values for this property. Unavailable analysis is excluded.</p>}
  </>
  const groupActions = <><SelectField label="Add selected ads to group" value="" onChange={event=>addToGroup(event.target.value)}><option value="">Choose group</option>{groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</SelectField>{state.tab==="groups" && selectedGroup && <Button variant="quiet" onClick={removeFromGroup}>Remove From Group</Button>}</>

  return <Page className="library-page"><div className="library-workspace">
    <WorkspacePageHeader title="My Ads" breadcrumb={[{label:"Workspace"},{label:"My Ads"}]} description="Your creative, its context, and the next review."
      metadata={ads.some(ad=>!ad.id.startsWith("upload-")) ? <Badge variant="outline">Sample account · Kindred</Badge> : undefined}
      actions={!readOnly ? <Button asChild variant="secondary" icon={<Plus />}><Link to={appPath("/add")}>Add Ads</Link></Button> : undefined} />
    <PageTabs label="Library view" activeValue={state.tab} queryParam="view" items={[{value:"all",label:"All Ads",to:{search:`?${updateLibrarySearch(params,{view:"all"})}`}},{value:"groups",label:"Saved Groups",to:{search:`?${updateLibrarySearch(params,{view:"groups"})}`}}]} />
    {previewState === "partial" && <StatePanel tone="warning" title="Some Delivery Data Is Unavailable" description="Available creative and recorded findings remain visible. Figures are sample data." actions={<Button variant="quiet" onClick={()=>update({state:null})}>Show Available Ads</Button>} />}
    {(previewState === "error" || readOnly) && <StatePanel tone={readOnly ? "permission" : "error"} title={readOnly ? "You Can View but Not Change This Library" : "The Latest Sample Sync Did Not Finish"} description={readOnly ? "Ask an owner for editor access to change groups." : "Existing ads remain available. Retry this local sample state."} actions={<Button variant="secondary" onClick={()=>update({state:null})}>{readOnly ? "Return to Library" : "Retry"}</Button>} />}
    {notice && <div className="library-notice" role="status">{notice}<Button variant="quiet" onClick={()=>setNotice("")} aria-label="Dismiss Notice"><X /></Button></div>}
    {previewState === "loading" && <StatePanel tone="loading" title="Loading Creative" description="Known creative remains available while this local refresh fixture checks for updates." />}
    <>
      {state.tab === "groups" && <section className="library-groups" aria-labelledby="saved-groups-title">
        <div className="library-groups-heading"><div><h2 id="saved-groups-title" className="library-heading--structural">Saved Groups</h2><p>Select a collection, then review or compare its ads.</p></div>
        {!readOnly && <div className="library-group-actions"><Button ref={newGroupRef} variant="secondary" onClick={event=>{groupTrigger.current=event.currentTarget;setNotice("");setGroupName("");setGroupEditor("new")}}>New Group</Button>{selectedGroup && <><Button variant="quiet" onClick={event=>{groupTrigger.current=event.currentTarget;setNotice("");setGroupName(selectedGroup.name);setGroupEditor("rename")}}>Rename Group</Button><AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}><AlertDialogTrigger asChild><Button ref={deleteGroupRef} variant="quiet">Delete Group</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogTitle>Delete {selectedGroup.name} Group?</AlertDialogTitle><AlertDialogDescription>The group is removed from this browser. Its ads stay in your library.</AlertDialogDescription><AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep Group</Button></AlertDialogCancel><Button variant="destructive" onClick={deleteGroup}>Delete Group</Button></AlertDialogActions></AlertDialogContent></AlertDialog></>}</div>}</div>
        <div className="library-group-list">{groups.map(group=><Button key={group.id} variant="secondary" aria-pressed={selectedGroup?.id===group.id} onClick={()=>{update({group:group.id,compare:null});setSelected([]);setConfirmDelete(false)}}>{group.name} ({group.adIds.length})</Button>)}</div>
      </section>}
      <Dialog open={groupEditor!==null} onOpenChange={open=>{if(!open)setGroupEditor(null)}}><DialogContent className="library-group-dialog" onCloseAutoFocus={event=>{event.preventDefault();groupTrigger.current?.focus()}}><DialogTitle>{groupEditor==="new" ? "New Group" : "Rename Group"}</DialogTitle><DialogDescription>Groups organise your own ads. They do not change Meta ad sets.</DialogDescription><form onSubmit={submitGroup}><Field label="Group name" value={groupName} onChange={event=>setGroupName(event.target.value)} required maxLength={100} />{notice && <p role="alert">{notice}</p>}<div className="library-sheet-actions"><Button variant="primary" type="submit" disabled={!groupName.trim()}>{groupEditor==="new" ? "Create Group" : "Save Group Name"}</Button><DialogClose asChild><Button variant="quiet">Cancel</Button></DialogClose></div></form></DialogContent></Dialog>
      {!noAds && <>
        <div className="library-result-bar"><div><h2 className={state.tab==="groups" && selectedGroup ? "library-heading--content" : "library-heading--structural"}>{state.tab==="groups" ? selectedGroup?.name || "Saved Groups" : "Creative Library"}</h2><ResultCount count={rows.length} label="ad" /><p className="library-window">{state.range} days ending 22 Sep 2026</p></div></div>
        <section className="library-filter-region" aria-label="Library Controls">
          <div className="library-toolbar">
            <div className="library-toolbar__primary">
              <Field label="Search Ads" value={state.query} icon={<Search />} onChange={event=>update({q:event.target.value})} />
              <ResponsiveFilterTask triggerLabel={`Filters${applied.length ? ` (${applied.length})` : ""}`} title="Filter Ads" description="Filter creative dates and recorded JEV findings. Changes apply immediately." clearLabel="Clear All Filters" onClear={clearFilters}>{filterFields}</ResponsiveFilterTask>
            </div>
            <div className="library-result-actions"><SelectField label="Card Metric" value={metric} onChange={event=>changeMetric(event.target.value)}>{metricOptions.map(option=><option key={option}>{option}</option>)}</SelectField><SortSelect label="Sort Ads" value={state.sort} options={sortOptions} onChange={value=>update({sort:value,direction:value==="name" ? "ascending" : "descending"})} /><SelectField label="Order" value={state.direction} onChange={event=>update({direction:event.target.value})}><option value="descending">Descending</option><option value="ascending">Ascending</option></SelectField><ViewToggle value={state.layout} onChange={layout=>update({layout})} /></div>
          </div>
          {applied.length ? <div className="library-applied-filters">{applied.map(item=><FilterChip key={item.key} label={item.label} value={item.value} onRemove={()=>update({[item.key]:null,...(item.key==="campaign" ? {adSet:null} : item.key==="property" ? {value:null} : {})})} />)}<Button variant="quiet" onClick={clearFilters}>Clear All Filters</Button></div> : null}
        </section>
      </>}
      {!readOnly && selectedVisible.length>0 && <BulkActionBar count={selectedVisible.length} noun="ad" onClear={()=>changeSelection([])}>
        {groups.length>0 && (mobileFilters ? <Sheet><SheetTrigger asChild><Button variant="secondary">Organise</Button></SheetTrigger><SheetContent side="bottom" className="library-sheet"><SheetTitle>Organise Selected Ads</SheetTitle><SheetDescription>{selectedVisible.length} ads selected across this library.</SheetDescription>{groupActions}</SheetContent></Sheet> : groupActions)}
        {compared.length ? <Button ref={compareTrigger} variant="secondary" icon={<GitCompareArrows />} onClick={()=>update({compare:compared.map(ad=>ad.id).join(",")})}>Compare</Button> : <span className="library-selection-hint">{selectedVisible.length < 2 ? "Select one more ad to compare." : "Select no more than 4 ads to compare."}</span>}
        {selectedVisible.length<=4 && selectedVisible.every(id=>analysisPermissions(lifecycles[id]).handoff) && <Button asChild variant="quiet"><Link to={`${libraryDetailHref(selectedVisible[0],contextParams,selectedVisible)}&panel=jev&ideate=1`}>JEV Ideation</Link></Button>}
      </BulkActionBar>}
      <Dialog open={comparisonOpen} onOpenChange={open=>{if(!open)update({compare:null})}}><DialogContent className="library-comparison-dialog" onCloseAutoFocus={event=>{event.preventDefault();compareTrigger.current?.focus()}}><DialogTitle>Compare Selected Ads</DialogTitle><DialogDescription>Aligned creative, recorded findings and sourced delivery facts. Missing analysis stays explicit.</DialogDescription><div className="library-comparison-context" aria-label="Active Comparison Context"><Badge variant="outline">Source: {compared.every(ad=>ad.scaleFixture) ? "Local Scale Fixtures" : compared.every(ad=>ad.id.startsWith("upload-")) ? "Your Uploads" : compared.some(ad=>ad.id.startsWith("upload-")) ? "Mixed Library" : "Meta Sample Account · Kindred"}</Badge><Badge variant="outline">Window: {state.range} days ending 22 Sep 2026</Badge>{applied.map(item=><Badge variant="secondary" key={item.key}>{item.label}: {item.key==="status" ? statusLabel[item.value as keyof typeof statusLabel] || item.value : item.value}</Badge>)}</div><ComparisonMatrix label="Selected Ad Comparison" cue={<>{compared.length} creatives · Scroll horizontally to compare <span aria-hidden="true">→</span></>} columns={compared.map(ad=>({id:ad.id,header:<div className="library-comparison-creative"><ComparisonMedia ad={ad} /><Link to={detailHref(ad)}>{ad.name || ad.product}</Link><span>{libraryMedia(ad).source} · {ad.placement || "Placement Not Set"}</span></div>}))} rows={[...(["Hook type","Primary angle","Proof type"].map(label=>({id:label,label,values:compared.map(ad=>findings[ad.id]?.find(item=>item.label===label)?.value || "Not assessed")}))),{id:"spend",label:`Spend · ${state.range} Days`,values:compared.map(ad=>metricValue(ad,state.range,"Spend") || "No delivery data")},{id:"results",label:`Results · ${state.range} Days`,values:compared.map(ad=>metricValue(ad,state.range,"Results") || "No delivery data")}]} /><div className="library-sheet-actions"><DialogClose asChild><Button>Return to Library</Button></DialogClose></div></DialogContent></Dialog>
      {tableRows.length ? state.layout==="grid" ? <div className="library-grid">{tableRows.map(ad=><LibraryCard key={ad.id} ad={ad} href={detailHref(ad)} selected={selectedVisible.includes(ad.id)} onSelect={readOnly ? undefined : checked=>changeSelection(checked ? [...selectedVisible,ad.id] : selectedVisible.filter(id=>id!==ad.id))} range={state.range} metric={metric} finding={findings[ad.id]?.find(item=>item.id===state.property)} analysis={deriveAnalysisView(lifecycles[ad.id])} missingMedia={previewState==="missing-media"} />)}</div>
        : <div className="library-table-region"><p className="library-table-cue">Scroll horizontally to review every column <span aria-hidden="true">→</span></p><DataTable label="Creative Library" rows={tableRows} columns={columns} getRowId={ad=>ad.id} getRowLabel={ad=>ad.name || ad.product} selectedIds={selectedVisible} onSelectionChange={readOnly ? undefined : changeSelection} sort={{column:state.sort,direction:state.direction}} onSort={(sort,direction)=>update({sort,direction})} /></div>
        : <StatePanel tone="empty" title={noAds ? "Add Your First Creative" : state.tab==="groups" && !applied.length ? "No Ads in This Group" : "No Ads Match These Filters"} description={noAds ? "Upload a creative or explore the Kindred sample account." : state.tab==="groups" && !applied.length ? "Select ads in All Ads and add them to this group." : "Clear filters or change the search to restore results."} actions={noAds ? readOnly ? undefined : <Button asChild variant="primary"><Link to={appPath("/add?tab=upload")}>Add Ads</Link></Button> : <Button variant="secondary" onClick={applied.length ? clearFilters : ()=>update({view:"all",group:null})}>{applied.length ? "Clear Filters" : "Browse All Ads"}</Button>} />}
      {rows.length>pageSize && previewState!=="empty" && <div className="library-pagination"><p aria-live="polite">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,rows.length)} of {rows.length} ads</p><Pagination page={page} pageCount={pageCount} onPageChange={page=>update({page})} label="Ad library pages" /></div>}
    </>
  </div></Page>
}

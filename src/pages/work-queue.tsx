import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AlertDialog, AlertDialogActions, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, Badge, Button, CalendarDatePicker, DropdownMenu, Field, FilterBar, InlineAlert, PageTabs, ResponsiveFilterTask, SelectField, StatePanel, WorkspacePageHeader, type DropdownMenuItem } from "@/design-system/components"
import { Page } from "@/components/page"
import { Thumb } from "@/components/read"
import { visibleAds } from "@/data/ads"
import { getJevAnalysis } from "@/data/jev"
import { appPath } from "@/lib/app-location"
import { completeIterationDraft, deriveWorkQueue, getWorkflowState, removeIterationDraft, retryWorkflowFinding, saveCreativeVersion, saveIterationDraft, updateWorkflowFinding, type WorkItem } from "@/lib/iterations"
import "@/pages/work-queue.css"

const labels = {review:"Needs Review",drafts:"Drafts",completed:"Completed"}
const statuses = {review:"Needs Review",failed:"Analysis Failed",outdated:"Outdated",confirmed:"Confirmed",corrected:"Corrected"}
const typeLabels = {finding:"Finding",draft:"Draft",version:"Version"}
const queueDateFormatter = new Intl.DateTimeFormat(typeof navigator === "undefined" ? undefined : navigator.languages)
function statusKey(item: WorkItem) {return item.status || (item.kind === "draft" ? "draft" : item.outcome?.kind === "unmeasured" ? "unmeasured" : "outcome")}
function statusLabel(item: WorkItem) {return item.status ? statuses[item.status] : item.kind === "draft" ? "Draft Saved" : item.outcome?.kind === "unmeasured" ? "Awaiting Outcome" : "Outcome Recorded"}
export function WorkQueue() {
  const navigate = useNavigate()
  const [params,setParams] = useSearchParams()
  const requested = params.get("view")
  const view = requested === "drafts" || requested === "completed" ? requested : "review"
  const previewState = params.get("state")
  const readOnly = previewState === "readonly" || previewState === "permission"
  const [workflow,setWorkflow] = useState(getWorkflowState)
  const [error,setError] = useState(false)
  const [message,setMessage] = useState("")
  const [pendingRemoval,setPendingRemoval] = useState<WorkItem | null>(null)
  const queueFocus = useRef<HTMLDivElement>(null)
  const removeTriggerRef = useRef<HTMLButtonElement>(null)
  const removedRef = useRef(false)
  const ads = previewState === "missing" ? [] : visibleAds()
  const adsById = new Map(ads.map(ad=>[ad.id,ad]))
  const queue = deriveWorkQueue(workflow,ads.map(ad=>ad.id))
  const owner = params.get("owner") || ""
  const from = params.get("from") || ""
  const to = params.get("to") || ""
  const search = params.get("q") || ""
  const sort = params.get("sort") || "newest"
  const viewItems = queue.filter(item=>item.view === view)
  const availableTypes = Array.from(new Set(viewItems.map(item=>item.kind)))
  const availableStatuses = Array.from(new Map(viewItems.map(item=>[statusKey(item),statusLabel(item)])).entries())
  const requestedType = params.get("type") || ""
  const requestedStatus = params.get("status") || ""
  const type = availableTypes.includes(requestedType as WorkItem["kind"]) ? requestedType : ""
  const status = availableStatuses.some(([value])=>value === requestedStatus) ? requestedStatus : ""
  const invalidDates = Boolean(from && to && from > to)
  const items = queue.filter(item=>item.view === view && (!owner || item.owner === owner) && (!type || item.kind === type) && (!status || statusKey(item) === status) && (!from || item.updatedAt.slice(0,10) >= from) && (!to || item.updatedAt.slice(0,10) <= to) && (!search || `${item.title} ${item.detail} ${adsById.get(item.adId)?.name || item.adId}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>sort === "oldest" ? a.updatedAt.localeCompare(b.updatedAt) : sort === "title" ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt))
  const paramsKey = params.toString()
  useEffect(()=>{
    if((!requestedType || type) && (!requestedStatus || status))return
    const next=new URLSearchParams(paramsKey)
    if(requestedType && !type)next.delete("type")
    if(requestedStatus && !status)next.delete("status")
    setParams(next,{replace:true})
  },[paramsKey,requestedType,requestedStatus,type,status,setParams])
  function changeFilter(key: string,value: string) {const next=new URLSearchParams(window.location.search);if(value)next.set(key,value);else next.delete(key);setParams(next,{replace:true})}
  function tabDestination(destination: keyof typeof labels) {
    const next=new URLSearchParams(params)
    next.set("view",destination)
    const destinationItems=queue.filter(item=>item.view === destination)
    const destinationTypes=new Set(destinationItems.map(item=>item.kind))
    const destinationStatuses=new Set(destinationItems.map(statusKey))
    if(!destinationTypes.has(next.get("type") as WorkItem["kind"]))next.delete("type")
    if(!destinationStatuses.has((next.get("status") || "") as ReturnType<typeof statusKey>))next.delete("status")
    return {pathname:appPath("/work"),search:`?${next.toString()}`}
  }
  function mutate(action: ()=>boolean,success: string,restoreFocus=false) {
    if(readOnly)return
    if(!action()){setError(true);setMessage("");return}
    setWorkflow(getWorkflowState());setError(false);setMessage(success)
    if(restoreFocus)queueFocus.current?.focus()
  }
  function assign(item: WorkItem,nextOwner: string) {
    mutate(()=>{
      if(item.kind === "finding")return updateWorkflowFinding(item.id,{owner:nextOwner})
      if(item.kind === "draft"){const draft=workflow.drafts.find(d=>d.id === item.id);return draft ? saveIterationDraft({...draft,owner:nextOwner}) : false}
      const version=workflow.versions.find(v=>v.id === item.id);return version ? saveCreativeVersion({...version,owner:nextOwner}) : false
    },"Owner saved in this browser.")
  }
  const filterFields = <>
      <SelectField label="Filter by Owner" value={owner} onChange={event=>changeFilter("owner",event.target.value)}><option value="">All Owners</option>{Array.from(new Set(["Demo Owner","Demo Editor","Unassigned",...queue.map(item=>item.owner)])).map(name=><option key={name}>{name}</option>)}</SelectField>
      <SelectField label="Filter by Type" value={type} onChange={event=>changeFilter("type",event.target.value)}><option value="">All Types</option>{availableTypes.map(value=><option key={value} value={value}>{typeLabels[value]}</option>)}</SelectField>
      <SelectField label="Filter by Status" value={status} onChange={event=>changeFilter("status",event.target.value)}><option value="">All Statuses</option>{availableStatuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>
      <CalendarDatePicker label="Updated From" value={from} max={to || undefined} onValueChange={value=>changeFilter("from",value)} />
      <CalendarDatePicker label="Updated To" value={to} min={from || undefined} onValueChange={value=>changeFilter("to",value)} />
      <SelectField label="Sort Work" value={sort} onChange={event=>changeFilter("sort",event.target.value)}><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="title">Title A–Z</option></SelectField>
      {owner || type || status || from || to || search || sort !== "newest" ? <Button variant="quiet" onClick={()=>{const next=new URLSearchParams(params);["owner","type","status","from","to","q","sort"].forEach(key=>next.delete(key));setParams(next)}}>Clear Filters</Button> : null}
    </>
  return <Page width="default" className="work-queue-page">
    <WorkspacePageHeader title="Work Queue" breadcrumb={[{label:"Workspace",href:appPath("/ads")},{label:"Work Queue"}]} description="Review findings and continue drafts. Changes stay local; no ads are published." actions={<Button asChild variant="secondary"><Link to={appPath("/ads")}>Browse Ads</Link></Button>} />
    <div ref={queueFocus} tabIndex={-1} role="region" aria-label="Work Queue views"><PageTabs label="Work Queue views" queryParam="view" activeValue={view} items={(["review","drafts","completed"] as const).map(value=>({value,label:labels[value],count:queue.filter(item=>item.view === value).length,to:tabDestination(value)}))} /></div>
    <FilterBar label="Filter Work"><Field label="Search Work" type="search" value={search} onChange={event=>changeFilter("q",event.target.value)} />
      <ResponsiveFilterTask triggerLabel="Filters" title="Filter Work" description="Changes apply immediately." mobileBreakpoint={768}>{filterFields}</ResponsiveFilterTask>
    </FilterBar>
    {invalidDates ? <InlineAlert tone="error">The end date must be on or after the start date.</InlineAlert> : null}
    {error ? <InlineAlert tone="error">Work was not saved. Your queue is unchanged.</InlineAlert> : null}
    {message ? <p role="status" className="work-queue-note">{message}</p> : null}
    {readOnly ? <InlineAlert tone="permission" title="This Queue Is Read-Only">You can inspect source records, but cannot assign, retry, review or complete work.</InlineAlert> : null}
    {previewState === "partial" ? <InlineAlert tone="warning" title="Some Work Is Unavailable">Available local records are shown below. No missing findings or outcomes are inferred.</InlineAlert> : null}
    {items.some(item=>item.missingSource) ? <InlineAlert tone="warning" title="Some Sources Are Unavailable">The work record and its source ID are preserved. Reconnect the source or reattach local media to inspect the creative.</InlineAlert> : null}
    {previewState === "loading" ? <StatePanel tone="loading" title={`Loading ${labels[view]}`} description="Reading local workflow records." /> : previewState === "error" ? <StatePanel tone="error" title="This Queue Did Not Refresh" description="Saved local records are unchanged." actions={<Button variant="secondary" onClick={()=>{setWorkflow(getWorkflowState());changeFilter("state","")}}>Retry Queue</Button>} /> : previewState === "empty" || !items.length || invalidDates ? <StatePanel tone="empty" title={`No ${labels[view]} Items`} description="No available records match this view and its filters." actions={<Button asChild variant="secondary"><Link to={appPath("/ads")}>Browse Ads</Link></Button>} /> : <section className="work-queue-content" aria-label={labels[view]}>
      <div className="work-queue-list-heading"><strong>{items.length} {items.length===1?"Item":"Items"}</strong><span>Creative and source stay attached to every task.</span></div>
      <div className="work-queue-list">{items.map(item=>{
        const ad=adsById.get(item.adId)
        const query=new URLSearchParams({panel:item.kind === "version" ? "notes" : "jev"})
        if(readOnly)query.set("state","readonly")
        if(item.propertyId)query.set("property",item.propertyId)
        if(item.kind === "finding")query.set("finding",item.id)
        if(item.kind === "draft"){query.set("draft",item.id);query.set("ideate","1")}
        if(item.kind === "version"){query.set("version",item.id);query.set("change",item.id)}
        const href=appPath(`/ads/${item.adId}?${query}`)
        const adHref=appPath(`/ads/${item.adId}?panel=jev`)
        const creationQuery=new URLSearchParams({ad:item.adId,draft:item.id,...(item.propertyId?{property:item.propertyId}:{}),...(readOnly?{state:"readonly"}:{})})
        const primaryLabel=item.kind === "draft" ? "Resume Draft" : item.kind === "version" ? "Open Version" : item.view === "completed" ? "Open Finding" : "Review Finding"
        const secondaryActions: DropdownMenuItem[]=[]
        if(item.kind === "draft" && !item.missingSource)secondaryActions.push({id:"create",label:"Create Ad",onSelect:()=>navigate(appPath(`/create?${creationQuery}`))})
        if(!readOnly && item.view === "review" && !item.missingSource)secondaryActions.push(item.status === "failed" ? {id:"retry",label:"Retry Check",onSelect:()=>mutate(()=>retryWorkflowFinding(item.id),"Finding returned to review.")} : {id:"reviewed",label:"Mark Reviewed",onSelect:()=>mutate(()=>updateWorkflowFinding(item.id,{status:"confirmed",review:{action:"confirmed",reason:"Confirmed from Work Queue",reviewer:"Demo Owner",at:new Date().toISOString()}}),"Finding marked reviewed.",true)})
        if(!readOnly && item.kind === "draft")secondaryActions.push({id:"complete",label:"Mark Complete",onSelect:()=>mutate(()=>completeIterationDraft(item.id),"Draft moved to Completed.",true)})
        if(!readOnly && item.kind === "draft")secondaryActions.push({id:"remove",label:"Remove Draft",destructive:true,onSelect:()=>{const menu=(document.activeElement as HTMLElement | null)?.closest(".bf-menu");removeTriggerRef.current=menu?.querySelector<HTMLButtonElement>(".bf-menu__trigger") || null;removedRef.current=false;setPendingRemoval(item)}})
        const property=ad && item.kind === "finding" ? getJevAnalysis(ad,item.id).properties.find(candidate=>candidate.id === item.propertyId) : undefined
        const sourceName=ad ? ad.name || ad.product : "Source unavailable"
        return <article className="work-queue-row" key={`${item.kind}-${item.id}`}>
          <div className="work-queue-identity">
            {ad ? <Link className="work-queue-thumb" to={href} aria-label={`Open ${sourceName}`}><Thumb ad={ad} /></Link> : <div className="work-queue-thumb work-queue-thumb--missing" role="img" aria-label="Source creative unavailable">No media</div>}
            <div className="work-queue-copy"><h2>{item.title}</h2><div className="work-queue-meta"><Badge variant={item.status === "failed" ? "error" : "neutral"}>{statusLabel(item)}</Badge><Badge variant="outline">{typeLabels[item.kind]}</Badge><Badge variant="outline">{item.sample ? "Sample" : "Local"}</Badge><time dateTime={item.updatedAt}>{queueDateFormatter.format(new Date(item.updatedAt))}</time></div>{item.kind === "finding" ? <details className="work-queue-details"><summary>Finding Details</summary><dl className="work-queue-finding"><div><dt>Value</dt><dd>{property?.review?.value || property?.value || "Not available"}</dd></div><div><dt>Confidence</dt><dd>{property?.confidence === undefined ? "Not available" : `${Math.round(property.confidence*100)}%`}</dd></div><div><dt>Reason</dt><dd>{item.detail}</dd></div></dl></details> : <p>{item.detail}</p>}{item.outcome && item.outcome.kind !== "unmeasured" ? <p>{item.outcome.kind === "manual" ? "User-entered observation" : "Recorded outcome"} · {item.outcome.source} · {item.outcome.window}</p> : null}<p className="work-queue-source">Source: {sourceName}</p>{item.missingSource ? <p className="work-queue-source-id">Preserved source ID: <code>{item.adId}</code></p> : null}{item.kind === "finding" && ad ? <nav className="work-queue-source-links" aria-label={`Sources for ${item.title}`}><Link to={href}>Evidence</Link><Link to={adHref}>Ad</Link></nav> : null}</div>
          </div>
          <div className="work-queue-controls">
            <SelectField containerClassName="work-queue-owner" label="Owner" aria-label={`Owner for ${item.title}`} value={item.owner} disabled={readOnly} onChange={event=>assign(item,event.target.value)}>{Array.from(new Set(["Demo Owner","Demo Editor","Unassigned",item.owner])).map(name=><option key={name}>{name}</option>)}</SelectField>
            <div className="work-queue-actions">{item.missingSource ? <Button variant="secondary" asChild><Link to={appPath("/settings?tab=sources")}>Repair Source</Link></Button> : <Button variant="primary" asChild><Link to={href} aria-label={`${primaryLabel} ${item.title}`}>{primaryLabel}</Link></Button>}{secondaryActions.length ? <DropdownMenu className="work-queue-more" label={`More actions for ${item.title}`} items={secondaryActions} /> : null}</div>
          </div>
        </article>
      })}</div>
    </section>}
    <AlertDialog open={Boolean(pendingRemoval)} onOpenChange={open=>{if(!open)setPendingRemoval(null)}}>
      <AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();if(removedRef.current)queueFocus.current?.focus();else removeTriggerRef.current?.focus()}}>
        <AlertDialogTitle>Remove Draft?</AlertDialogTitle>
        <AlertDialogDescription>{pendingRemoval ? `This removes “${pendingRemoval.title}” from this browser. The source ad remains unchanged.` : "This removes the draft from this browser."}</AlertDialogDescription>
        <AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep Draft</Button></AlertDialogCancel>
        <Button variant="destructive" onClick={()=>{if(!pendingRemoval)return;if(!removeIterationDraft(pendingRemoval.id)){setError(true);setMessage("");return}removedRef.current=true;setWorkflow(getWorkflowState());setError(false);setMessage("Draft removed from this browser.");setPendingRemoval(null)}}>Remove Draft</Button></AlertDialogActions>
      </AlertDialogContent>
    </AlertDialog>
  </Page>
}

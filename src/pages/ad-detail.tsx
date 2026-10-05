import { useEffect, useRef, useState, type RefObject } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, BrainCircuit } from "lucide-react"
import { visibleAds, statusLabel, type Ad } from "@/data/ads"
import { clearJevReview, getJevAnalysis, saveJevReview, type JevAnalysis, type JevProperty } from "@/data/jev"
import { analysisPermissions, deriveAnalysisView, getAnalysisLifecycle, saveAnalysisLifecycle, transitionAnalysis, type AnalysisAction, type AnalysisLifecycleRecord } from "@/lib/analysis-lifecycle"
import { getAnalysisProperties } from "@/lib/analysis-properties"
import { detailAnalysis, filterDetailProperties } from "./detail-analysis"
import { appPath } from "@/lib/app-location"
import { creativeAspectRatio, deliveryFor, detailNavigation, type DeliveryRange } from "@/lib/library"
import { getIterationDrafts, getNotes, getWorkflowState, saveCreativeVersion, saveIterationDraft, saveNotes, type CreativeVersion } from "@/lib/iterations"
import { ActivityTimeline, Badge, Button, EvidenceInspector, Field, FilePreview, MediaStage, MetricCell, PageTabs, Progress, PropertyList, SelectField, ShotStrip, StatePanel, TaskViews, TextareaField, Transcript, WorkspacePageHeader, type TaskView } from "@/design-system/components"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Page } from "@/components/page"
import "./ad-detail.css"

const timeLabel=(time:number)=>`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,"0")}`
const panelValue=(value:string|null)=>value==="performance" ? "performance" : ["notes","versions","draft","change"].includes(value || "") ? "notes" : "jev"
// Register before BrowserRouter so a cancelled pop cannot unmount an unsaved form.
const detailHistoryGuards=new Set<(event:PopStateEvent)=>void>()
if(typeof window!=="undefined")window.addEventListener('popstate',event=>{for(const guard of detailHistoryGuards)guard(event)})
const detailDirtyForms=new Set<symbol>()
const checkedDetailDepartures=new WeakSet<Event>()
function confirmDetailDeparture(savingForm?:symbol) {
  return ![...detailDirtyForms].some(form=>form!==savingForm)||window.confirm('Discard unsaved changes?')
}

export function AdDetail() {
  const {id}=useParams()
  const [params]=useSearchParams()
  const ads=visibleAds()
  const ad=ads.find(item=>item.id===id)
  const navigation=detailNavigation(ads,id || "",params)
  if(!ad)return <Page><div className="ad-detail-page"><StatePanel title="This Ad Is Not in Your Library" description="The record may have been removed from this browser." actions={<Button asChild variant="secondary"><Link to={navigation.backHref}>Back to My Ads</Link></Button>} /></div></Page>
  return <AdWorkspace key={ad.id} ad={ad} ads={ads} />
}

function AdWorkspace({ad,ads}:{ad:Ad;ads:Ad[]}) {
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const navigation=detailNavigation(ads,ad.id,params)
  const panel=panelValue(params.get("panel"))
  const range:DeliveryRange=params.get("range")==="7" ? "7" : params.get("range")==="90" ? "90" : "30"
  const preview=params.get("state")
  const uploaded=ad.id.startsWith("upload-") || ad.analysisStatus==="not-run"
  const [revision,setRevision]=useState(0)
  const findingId=params.get("findingId") || params.get("finding") || undefined
  const workflowFinding=getWorkflowState().findings.find(finding=>finding.id===findingId && finding.adId===ad.id)
  const sourceAnalysis=getJevAnalysis(ad,workflowFinding?.id)
  const legacyPreview:Record<string,string>={loading:"analysing",processing:"analysing",error:"failed",failed:"failed",partial:"partial",permission:"permission",readonly:"readonly"}
  const lifecycle=getAnalysisLifecycle(ad.id,{hasResult:sourceAnalysis.source!=="No analysis",fixture:params.get("analysis") || legacyPreview[preview || ""]})
  const permissions=analysisPermissions(lifecycle)
  const readOnly=lifecycle.access!=="editable"
  const definitions=getAnalysisProperties().filter(item=>item.enabled)
  const analysis=detailAnalysis(sourceAnalysis,lifecycle,definitions)
  const analysisView=deriveAnalysisView(lifecycle)
  const view=params.get("view")==="transcript"?"transcript":"findings"
  const taskRegionRef=useRef<HTMLDivElement|null>(null)
  const [compact,setCompact]=useState(()=>window.matchMedia("(max-width:900px)").matches)
  useEffect(()=>{
    const region=taskRegionRef.current
    if(!region)return
    const measure=()=>setCompact(region.clientWidth<=900)
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(region)
    return()=>observer.disconnect()
  },[])
  const initialSelectedId=workflowFinding?.propertyId || params.get("property") || analysis.properties[0]?.id || ""
  const [selectedId,setSelectedId]=useState(initialSelectedId)
  const [taskView,setTaskView]=useState<TaskView>(workflowFinding?"analysis":"creative")
  const [evidenceOpen,setEvidenceOpen]=useState(Boolean(workflowFinding || params.get("property")) && params.get("ideate")!=="1" && view!=="transcript" && panel==='jev')
  const evidenceTrigger=useRef<HTMLElement|null>(null)
  const findingFocus=useRef<HTMLDivElement|null>(null)
  const time=Math.max(0,Number(params.get("time")) || 0)
  const query=params.get("q") || ""
  const status=params.get("status") || "all"
  const [openGroups,setOpenGroups]=useState(()=>{
    const selectedSection=analysis.properties.find(property=>property.id===initialSelectedId)?.section
    const actionableSection=analysis.properties.find(property=>!["pending","unavailable"].includes(property.status))?.section
    return new Set([selectedSection || actionableSection || analysis.properties[0]?.section].filter(Boolean) as string[])
  })
  const [correcting,setCorrecting]=useState(false)
  const [value,setValue]=useState("")
  const [reason,setReason]=useState("")
  const [notice,setNotice]=useState("")
  const [saveError,setSaveError]=useState("")
  const correctTrigger=useRef<HTMLElement|null>(null)
  const ideationTrigger=useRef<HTMLElement|null>(null)
  const transcriptTrigger=useRef<HTMLElement|null>(null)
  const loading=["queued","preparing","analysing"].includes(lifecycle.run)
  const noEvidence=preview==="unavailable" || preview==="missing-evidence"
  const update=(patch:Record<string,string|null>)=>setParams(current=>{const next=new URLSearchParams(current);for(const [key,value]of Object.entries(patch))value===null?next.delete(key):next.set(key,value);return next})
  const commitPreview=()=>{
    if(!params.has("analysis")&&!legacyPreview[preview || ""])return true
    if(!saveAnalysisLifecycle(lifecycle)){setSaveError("Could not save this analysis state in your browser.");return false}
    setRevision(revision+1);return true
  }
  const transition=(action:AnalysisAction)=>{
    const next=transitionAnalysis(lifecycle,action)
    if(!next || !saveAnalysisLifecycle(next)){setSaveError("Could not save this analysis transition in your browser.");return}
    update({analysis:null,state:null});setRevision(revision+1);setSaveError("")
  }
  useEffect(()=>{const id=workflowFinding?.propertyId || params.get("property");if(id){setSelectedId(id);const section=analysis.properties.find(property=>property.id===id)?.section;if(section)setOpenGroups(current=>current.has(section)?current:new Set([...current,section]))}},[params,workflowFinding?.propertyId,analysis.properties])
  const displayed=analysis.properties
  useEffect(()=>{if(displayed.length)setOpenGroups(current=>current.size?current:new Set([displayed[0].section]))},[displayed.length])
  const shot=analysis.shots.find(shot=>shot.id===params.get("shot"))
  const filtered=filterDetailProperties(displayed,params).filter(property=>!shot || shot.findingIds.includes(property.id))
  const selected=(evidenceOpen?displayed:filtered).find(property=>property.id===selectedId)
  const filterKey=JSON.stringify(['q','status','category','assessment','confidence','source','origin','shot'].map(key=>params.get(key)))
  const previousFilters=useRef(filterKey)
  useEffect(()=>{
    const changed=previousFilters.current!==filterKey;previousFilters.current=filterKey
    if(changed&&params.has("property")&&!filtered.some(property=>property.id===params.get("property"))){setEvidenceOpen(false);setSelectedId("");update({property:null,finding:null,findingId:null})}
  },[filterKey,params,filtered])
  useEffect(()=>{if(workflowFinding&&panel==='jev'){setTaskView("analysis");setEvidenceOpen(true)}},[workflowFinding?.id,selected?.id,panel])
  const sections=[...new Set(definitions.map(item=>item.category))]
  const groups=sections.map(section=>({id:section,label:section,meta:`${filtered.filter(property=>property.section===section).length} findings`,rows:filtered.filter(property=>property.section===section).map(property=>({...property,status:property.review?.action==="confirmed"?"Confirmed":property.status}))})).filter(group=>group.rows.length)
  const filtersActive=["q","status","category","assessment","confidence","source","origin","shot"].some(key=>params.get(key)&&params.get(key)!=="all")
  const visibleOpenGroups=filtersActive ? new Set([...openGroups,...groups.map(group=>group.id)]) : openGroups
  const assessed=displayed.filter(property=>property.status!=="pending" && property.status!=="unavailable").length
  const needsReview=displayed.filter(property=>property.status==="review" && !property.review).length
  const unavailableCount=displayed.filter(property=>property.status==="unavailable").length
  const seek=(next:number)=>update({time:String(next)})
  const showTranscript=()=>{transcriptTrigger.current=document.activeElement as HTMLElement;update({view:"transcript"});setEvidenceOpen(false)}
  const openProperty=(id:string)=>{evidenceTrigger.current=document.activeElement as HTMLElement;setSelectedId(id);setTaskView("analysis");setEvidenceOpen(true);update({view:"findings",property:id,finding:null,findingId:null})}
  const persist=(correct:boolean)=>{
    if(!selected || !permissions.review || !commitPreview())return
    const ok=saveJevReview(ad,selected.id,{action:correct?"corrected":"confirmed",value:correct?value:undefined,reason:correct?reason:"Checked against this ad's sample evidence.",reviewer:"You"},workflowFinding?.propertyId===selected.id?workflowFinding.id:undefined)
    if(!ok){setSaveError("Could not save this review in your browser. Try again.");return}
    update({analysis:null,state:null});setSaveError("");setRevision(revision+1);setCorrecting(false);setNotice(correct?"Correction saved on this device.":"Confirmation saved on this device.")
  }
  const undo=()=>{if(!permissions.review || !commitPreview())return;if(selected && clearJevReview(ad.id,selected.id,workflowFinding?.propertyId===selected.id?workflowFinding.id:undefined)){update({analysis:null,state:null});setRevision(revision+1);setNotice("Human review removed; original analysis restored.")}else setSaveError("Could not update this review in your browser.")}
  const openSibling=(offset:number)=>{const href=navigation.siblingHref(offset);if(href&&confirmDetailDeparture())navigate(href)}
  const title=ad.name || ad.product
  const sourceIdentity=uploaded ? "Local upload" : panel==="jev" ? `${statusLabel[ad.status]} · Sample JEV analysis` : panel==="performance" ? `${statusLabel[ad.status]} · Sample Meta delivery` : `${statusLabel[ad.status]} · Sample account · Kindred`
  const creationQuery=new URLSearchParams(params);creationQuery.set("ad",ad.id);if(selected)creationQuery.set("property",selected.id)
  if(lifecycle.freshness==="stale")creationQuery.set("sourceFreshness","stale")
  const actionable=Boolean(selected&&!['pending','unavailable'].includes(selected.status))
  const creative=<CreativeReview ad={ad} analysis={analysis} time={time} onSeek={seek} onTranscript={showTranscript} onScope={id=>update({shot:id,view:"findings"})} missing={preview==="missing" || preview==="missing-media"} readOnly={readOnly} />
  const transcript=<TranscriptTimeline analysis={analysis} time={time} query={params.get("transcriptQ") || ""} onQuery={value=>update({transcriptQ:value || null})} onSeek={seek} onProperty={openProperty} />
  const evidence=selected ? <div className="detail-evidence-stack" ref={findingFocus} tabIndex={-1} role={workflowFinding?"region":undefined} aria-label={workflowFinding?`Workflow finding ${workflowFinding.id}`:undefined}>
    {workflowFinding && <p>{workflowFinding.label} · Owner: {workflowFinding.owner} · {workflowFinding.status}{!noEvidence && <><br />{workflowFinding.evidence}</>}</p>}
    <EvidenceInspector label={selected.label} value={selected.value} status={selected.review?.action==="confirmed"?"Confirmed":selected.status}
      facts={[{label:"Value type",value:selected.valueType || "text"},{label:"Confidence",value:selected.confidence===undefined?"Not available":`${selected.confidence>=.85?"High":selected.confidence>=.7?"Medium":"Low"} · ${Math.round(selected.confidence*100)}%`},{label:"Source",value:noEvidence&&selected.evidence?"Reference temporarily unavailable":selected.evidence?.source || selected.missingReason || "No evidence available"},{label:"Provenance",value:selected.provenance || "Not assessed"},{label:"Definition",value:`${selected.id.startsWith("custom:")?"Custom":"Standard"} · ${selected.id}${selected.definitionSnapshot?` · ${selected.definitionSnapshot.name} v${selected.definitionSnapshot.version}`:" · No result snapshot"}`},{label:"Result freshness",value:lifecycle.freshness==="stale"?"Stale retained result":"Current sample result"}]}
      quote={noEvidence?undefined:selected.evidence?.quote} timestamp={noEvidence?undefined:selected.evidence?.at} onViewTimestamp={next=>{seek(next);setEvidenceOpen(false)}}
      provenance={selected.review ? `${selected.review.action==="confirmed"?"Confirmed":"Corrected"} by ${selected.review.reviewer} · ${new Date(selected.review.at).toLocaleString()}. ${selected.review.reason}` : "Recorded JEV review. Creative findings do not establish performance attribution."}
      onConfirm={permissions.review && !selected.review && actionable?()=>persist(false):undefined}
      onCorrect={permissions.review && actionable?()=>{correctTrigger.current=document.activeElement as HTMLElement;setValue(selected.value);setReason("");setSaveError("");setCorrecting(true)}:undefined} />
    {selected.review && <p>Original value: {selected.originalValue}</p>}
    {selected.review && permissions.review && <Button variant="quiet" onClick={undo}>Undo Human Review</Button>}
    {(noEvidence || !selected.evidence) && <StatePanel title="Evidence Unavailable" description={noEvidence&&selected.evidence?"This property's recorded source reference is temporarily unavailable. Its sample analysis is retained; no replacement evidence has been inferred.":selected.missingReason || "This sample property has no source reference. No evidence has been inferred."} />}
    <Button variant="secondary" disabled={!permissions.handoff || !actionable} onClick={event=>{ideationTrigger.current=event.currentTarget;if(commitPreview())update({analysis:null,state:null,ideate:"1",property:selected.id})}}>Draft from This Finding</Button>
    {permissions.handoff && actionable ? <Button variant="secondary" asChild><Link onClick={event=>{if(!commitPreview())event.preventDefault()}} to={appPath(`/create?${creationQuery}`)}>Create Ad from This Finding</Link></Button>:<Button variant="secondary" disabled>Create Ad from This Finding</Button>}
  </div> : loading&&!uploaded ? <StatePanel tone="loading" title="Finding Still Processing" description="Evidence and review actions will appear when this finding is available." /> : <StatePanel title="No Evidence Available" description="Analysis has not run for this file." />
  // Uploads never enter the sample-property renderer, even when query parameters request sample states.
  const review=!analysis.properties.length ? <StatePanel title={loading?"Findings Are Not Available Yet":uploaded?"JEV Analysis Has Not Run":"No Recorded Findings"} description={uploaded?"This file has no extracted findings. Its saved context is user input, not JEV analysis. The local walkthrough does not infer content from uploads.":"Use the explicit walkthrough controls to inspect the sample stages. No background analysis runs."} /> : <section className="detail-analysis">
    <header><div><h2>Creative Read</h2><p>{assessed} of {definitions.length} enabled properties assessed across {sections.length} groups.</p></div><div className="detail-analysis__summary" aria-label="Finding summary"><span><strong>{assessed}</strong> Assessed</span><span><strong>{needsReview}</strong> To Review</span><span><strong>{unavailableCount}</strong> Unavailable</span></div></header>
    <div className="detail-analysis__filters"><Field label="Search properties" value={query} onChange={event=>update({q:event.target.value || null})} />
    <SelectField label="Finding status" value={status} onChange={event=>update({status:event.target.value})}><option value="all">All Findings</option><option value="ready">Ready</option><option value="review">Needs Review</option><option value="pending">Pending</option><option value="unavailable">Unavailable</option><option value="corrected">Corrected</option><option value="confirmed">Confirmed</option></SelectField>
    {([
      ['category','Property group',sections.map(value=>[value,value])],
      ['assessment','Assessment',[['assessed','Assessed'],['unavailable','Unavailable'],['pending','Pending']]],
      ['confidence','Confidence',[['high','High (85%+)'],['medium','Medium (70–84%)'],['low','Low (<70%)'],['unknown','Not available']]],
      ['source','Evidence source',[['Visual','Visual'],['On-screen text','On-screen text'],['Transcript','Transcript'],['Meta delivery','Meta delivery'],['unknown','No evidence']]],
      ['origin','Property origin',[['standard','Standard'],['custom','Custom']]],
    ] as [string,string,string[][]][]).map(([key,label,options])=><SelectField key={key} label={label} value={params.get(key) || 'all'} onChange={event=>update({[key]:event.target.value})}><option value="all">All</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</SelectField>)}
    </div>
    <div className="detail-filter-summary"><p aria-label="Filtered finding count">{filtered.length} of {definitions.length} enabled properties shown{shot?` · ${shot.label}`:""}</p>{shot&&<Button variant="quiet" onClick={()=>update({shot:null})}>Show All Findings</Button>}{filtersActive&&<Button variant="quiet" onClick={()=>update({q:null,status:null,category:null,assessment:null,confidence:null,source:null,origin:null,shot:null})}>Clear Finding Filters</Button>}</div>
    {groups.length?<PropertyList groups={groups} selectedId={selected?.id} openIds={visibleOpenGroups} onSelect={openProperty} onToggleGroup={id=>setOpenGroups(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next})} />:<StatePanel title="No Findings Match These Filters" description="Clear a filter to see the retained results." />}
  </section>
  return <Page><div className="ad-detail-page">
    <div className="ad-detail-topline"><Link to={navigation.backHref} className="ad-detail-back"><ArrowLeft /> My Ads</Link><div className="ad-detail-stepper" aria-label="Move through current ads"><Button variant="quiet" aria-label="Previous Ad" disabled={!navigation.siblingHref(-1)} onClick={()=>openSibling(-1)}><ArrowLeft /></Button><span>{navigation.index+1} of {navigation.ids.length}</span><Button variant="quiet" aria-label="Next Ad" disabled={!navigation.siblingHref(1)} onClick={()=>openSibling(1)}><ArrowRight /></Button></div></div>
    <WorkspacePageHeader className="detail-page-header" title={title} description={[ad.campaign,ad.adSet,ad.placement].filter(Boolean).join(" / ") || "Your local creative"} metadata={<Badge variant="secondary">{sourceIdentity}</Badge>} actions={<div className="flex flex-wrap gap-3">{!readOnly?<Button variant="secondary" asChild><Link onClick={event=>{if(!commitPreview())event.preventDefault()}} to={appPath(`/create?${creationQuery}`)}>Create Ad</Link></Button>:<Button variant="secondary" disabled>Create Ad</Button>}<Button variant="primary" icon={<BrainCircuit />} disabled={!permissions.handoff} onClick={event=>{ideationTrigger.current=event.currentTarget;if(commitPreview())update({analysis:null,state:null,ideate:"1"})}}>Run JEV Neural Ideation</Button></div>} />
    <PageTabs label="Ad detail sections" queryParam="panel" activeValue={panel} items={[{value:"jev",label:"JEV Review"},{value:"performance",label:"Performance"},{value:"notes",label:"Notes & Versions"}]} />
    {notice && <p className="detail-notice" role="status">{notice}</p>}{saveError && !correcting && <p role="alert">{saveError}</p>}
    {panel==="jev" && <><AnalysisOverview record={lifecycle} onAction={transition} /><PageTabs label="JEV workspace views" queryParam="view" activeValue={view} items={[{value:"findings",label:"Findings"},{value:"transcript",label:"Transcript & Timeline"}]} /><div className="detail-task-region" ref={taskRegionRef} data-compact={compact || undefined}><TaskViews creative={creative} analysis={view==="transcript"&&!compact?transcript:<>{compact&&<CompactCreativeContext ad={ad} onShow={()=>setTaskView("creative")} />}{review}</>} evidence={<>{compact&&<CompactCreativeContext ad={ad} onShow={()=>setTaskView("creative")} />}{evidence}</>} value={taskView} onChange={setTaskView} /></div>
    <Sheet open={compact&&view==="transcript"} onOpenChange={open=>{if(!open)update({view:"findings"})}}><SheetContent className="detail-transcript-sheet" onCloseAutoFocus={event=>{event.preventDefault();(transcriptTrigger.current?.isConnected?transcriptTrigger.current:document.querySelector<HTMLElement>('a[href*="view=transcript"]'))?.focus()}}><SheetTitle>Transcript & Timeline</SheetTitle><SheetDescription>{title} · {timeLabel(time)} · Sample concept cut</SheetDescription>{transcript}</SheetContent></Sheet></>}
    {panel==="performance" && <DetailPanelLayout ad={ad}><PerformancePanel ad={ad} range={range} onRange={value=>update({range:value})} /></DetailPanelLayout>}
    {panel==="notes" && <DetailPanelLayout ad={ad}><NotesVersionsPanel ad={ad} readOnly={readOnly} onDraft={(trigger,id)=>{ideationTrigger.current=trigger;update({ideate:"1",draft:id || null})}} /></DetailPanelLayout>}
    {uploaded && panel==="jev" && <><MetricCell label="Meta delivery" missingReason="No Meta delivery data: this local file is not linked to a delivered ad." />{ad.uploadContext && <dl className="detail-context">{Object.entries(ad.uploadContext).filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</>}
    <Sheet open={correcting} onOpenChange={setCorrecting}><SheetContent className="detail-correction" onCloseAutoFocus={event=>{event.preventDefault();correctTrigger.current?.focus()}}><SheetTitle>Correct {selected?.label}</SheetTitle><SheetDescription>The original value, confidence, and evidence stay attached to your correction.</SheetDescription><form onSubmit={event=>{event.preventDefault();persist(true)}}><Field label="Corrected value" value={value} required onChange={event=>setValue(event.target.value)} /><TextareaField label="Reason" value={reason} required onChange={event=>setReason(event.target.value)} error={saveError || undefined} /><Button type="submit" disabled={!value.trim() || !reason.trim() || readOnly}>Save Correction</Button><SheetClose asChild><Button variant="quiet">Cancel</Button></SheetClose></form></SheetContent></Sheet>
    <Sheet open={panel==='jev' && evidenceOpen && Boolean(selected)} onOpenChange={setEvidenceOpen}><SheetContent className="detail-evidence-drawer" side="right" onCloseAutoFocus={event=>{event.preventDefault();const target=evidenceTrigger.current?.isConnected?evidenceTrigger.current:document.querySelector<HTMLElement>('.bf-property-list__row[aria-pressed=true]') || document.querySelector<HTMLElement>('a[href*="view=findings"]');target?.focus()}}><SheetTitle>Evidence: {selected?.label}</SheetTitle><SheetDescription>Inspect the recorded frame, time, transcript span and provenance while the creative stays in context.</SheetDescription>{evidence}</SheetContent></Sheet>
    {!readOnly && (permissions.handoff || panel==="notes") && <IdeationComposer ad={ad} ads={ads} property={selected} open={params.get("ideate")==="1"} onClose={()=>update({ideate:null})} draftId={params.get("draft")} onSaved={()=>setRevision(revision+1)} returnFocusRef={ideationTrigger} stale={lifecycle.freshness==="stale"} />}
  </div></Page>
}

function AnalysisOverview({record,onAction}:{record:AnalysisLifecycleRecord;onAction:(action:AnalysisAction)=>void}) {
  const view=deriveAnalysisView(record), permissions=analysisPermissions(record)
  const titles={"not-analysed":"Analysis Has Not Run",queued:"Analysis Queued",preparing:"Preparing Media",analysing:"Analysing Creative",partial:"Partial Results",complete:"Analysis Complete",failed:"Analysis Did Not Finish",stale:"Analysis Is Outdated",permission:"Source Permission Required",readonly:"This Review Is Read-Only"}
  const descriptions={"not-analysed":"Start a review when this creative is ready.",queued:"This creative is next in the review queue.",preparing:"Checking the creative and enabled analysis properties.",analysing:"Reviewing the creative against your enabled properties.",partial:"Some property groups are ready to review.",complete:"All enabled property groups have been reviewed.",failed:"The review stopped before it finished. Existing results are still available.",stale:"Review the retained findings, then re-run analysis when ready.",permission:"Reconnect or choose an available source before continuing.",readonly:"You can inspect this review, but changes are unavailable for your current role."}
  const next:Partial<Record<typeof record.run,[AnalysisAction,string]>>={queued:['prepare','Prepare Creative'],preparing:['analyse','Review Properties'],analysing:['partial','Show Available Results']}
  const step=next[record.run]
  const pending=[...new Set(record.propertySnapshots.map(item=>item.category))].filter(group=>!record.completedGroupIds.includes(group))
  return <section className="detail-lifecycle" data-analysis-view={view} aria-label="Analysis overview">
    <div><h2>{titles[view]}</h2><p>{descriptions[view]}</p>
    <p className="detail-lifecycle__demo-note">Demo review · actions are simulated locally</p>
    {record.result!=='none'&&<p>{record.completedGroupIds.length} groups reviewed · {record.freshness==='stale'?'Update recommended':record.result==='partial'?'Review in progress':'Ready to inspect'} · Updated {new Date(record.completedAt || record.updatedAt).toLocaleString()}</p>}
    {record.staleAt&&<p>Changed {new Date(record.staleAt).toLocaleString()}</p>}
    {record.result==='partial'&&<p>Pending groups: {pending.join(', ') || 'No recorded groups remaining'}</p>}
    {['preparing','analysing'].includes(record.run)&&<Progress label="Review progress" value={record.progress} />}
    {record.run==='queued'&&<p>Queued {new Date(record.startedAt || record.updatedAt).toLocaleString()}.</p>}
    </div><div className="detail-lifecycle__actions">
      {view==='permission'&&<Button asChild variant="secondary"><Link to={appPath('/settings?tab=sources&state=permission')}>Repair Source</Link></Button>}
      {permissions.retry?<Button onClick={()=>onAction('retry')}>Retry Analysis</Button>:permissions.start&&record.result!=='partial'?<Button onClick={()=>onAction('start')}>{record.result==='none'?'Start Analysis':'Re-run Analysis'}</Button>:null}
      {record.access==='editable'&&step&&<Button onClick={()=>onAction(step[0])}>{step[1]}</Button>}
      {record.access==='editable'&&record.run==='idle'&&record.result==='partial'&&<Button onClick={()=>onAction('complete')}>Finish Review</Button>}
      {permissions.cancel&&<Button variant="secondary" onClick={()=>onAction('cancel')}>Cancel Analysis</Button>}
    </div>
  </section>
}

function TranscriptTimeline({analysis,time,query,onQuery,onSeek,onProperty}:{analysis:JevAnalysis;time:number;query:string;onQuery:(value:string)=>void;onSeek:(time:number)=>void;onProperty:(id:string)=>void}) {
  const shot=[...analysis.shots].reverse().find(shot=>shot.time<=time)
  const segments=analysis.transcript.filter(segment=>segment.text.toLowerCase().includes(query.toLowerCase()))
  const active=[...analysis.transcript].reverse().find(segment=>segment.time<=time)?.id
  return <section className="detail-transcript" aria-label="Transcript & Timeline"><h2>Transcript & Timeline</h2><p>Sample concept-cut annotations. The bundled creative is a still; timestamps select recorded sample moments.</p>
    <Field label="Search transcript" value={query} onChange={event=>onQuery(event.target.value)} />
    <p aria-label="Current shot" aria-live="polite">Current shot: {shot?.label || 'No recorded shot'} · {timeLabel(time)}</p>
    {analysis.shots.length>0&&<ShotStrip label="Transcript timeline" shots={analysis.shots} selectedId={shot?.id} onSelect={shot=>onSeek(shot.time)} />}
    <ol className="detail-transcript__segments">{segments.map(segment=><li key={segment.id} aria-current={active===segment.id?'true':undefined}><Button variant="quiet" onClick={()=>onSeek(segment.time)}><time>{timeLabel(segment.time)}</time> {segment.text}</Button><div>{segment.findingIds.map(id=>{const property=analysis.properties.find(item=>item.id===id);return property?<Button key={id} variant="quiet" onClick={()=>onProperty(id)} aria-label={`View ${property.label} finding`}>{property.label} →</Button>:null})}</div></li>)}</ol>
    {!segments.length&&<StatePanel title={query?'No Transcript Matches':'No Transcript Available'} description={query?'Try another word from this concept cut.':'This source has no recorded transcript. No speech has been inferred.'} />}
  </section>
}

function DetailPanelLayout({ad,children}:{ad:Ad;children:React.ReactNode}) {
  const source=ad.uploadUrl || ad.poster
  return <div className="detail-panel-layout">
    <aside className="detail-creative-anchor" aria-label="Creative Context">
      <h2>Creative</h2>
      <div className="detail-creative-anchor__media" data-panel={ad.posterPanel}>
        {source ? <MediaStage src={source} alt={ad.name || ad.product} mediaType={ad.uploadType==="video"?"video":"image"} aspectRatio={creativeAspectRatio(ad)} /> : <StatePanel title="Creative Media Is Unavailable" description="The source record remains available, but its local media must be attached again." />}
      </div>
      <p>{ad.placement || "Original Upload"} · {ad.w} × {ad.h}</p>
    </aside>
    <div className="detail-panel-layout__content">{children}</div>
  </div>
}

function CompactCreativeContext({ad,onShow}:{ad:Ad;onShow:()=>void}) {
  const source=ad.uploadUrl || ad.poster
  return <aside className="detail-mobile-context" aria-label="Creative Context">
    <div className="detail-mobile-context__media">{source ? <MediaStage src={source} alt="" mediaType={ad.uploadType==="video"?"video":"image"} aspectRatio={creativeAspectRatio(ad)} /> : <span aria-hidden="true" />}</div>
    <div><strong>{ad.name || ad.product}</strong><span>{ad.placement || "Original Upload"} · {ad.w} × {ad.h}</span></div>
    <Button variant="quiet" onClick={onShow}>View Creative</Button>
  </aside>
}

function CreativeReview({ad,analysis,time,onSeek,onTranscript,onScope,missing,readOnly}:{ad:Ad;analysis:JevAnalysis;time:number;onSeek:(time:number)=>void;onTranscript:()=>void;onScope:(id:string)=>void;missing:boolean;readOnly:boolean}) {
  const [failed,setFailed]=useState(false)
  const uploaded=ad.id.startsWith("upload-")
  const shot=[...analysis.shots].reverse().find(shot=>shot.time<=time) || analysis.shots[0]
  const activeTranscript=analysis.transcript.filter(segment=>shot && segment.time>=shot.time && segment.time<shot.until)
  const findings=analysis.properties.filter(property=>shot?.findingIds.includes(property.id))
  const source=uploaded?ad.uploadUrl:ad.poster
  const media=useRef<HTMLDivElement|null>(null)
  useEffect(()=>{const video=media.current?.querySelector('video');if(video&&Math.abs(video.currentTime-time)>.3)video.currentTime=time},[time])
  return <section className="detail-creative" aria-label="Creative review">
    <h2>Creative Review</h2>
    <div className="detail-media" ref={media} data-panel={ad.posterPanel} onErrorCapture={()=>setFailed(true)} onTimeUpdateCapture={event=>{const video=event.target;if(video instanceof HTMLVideoElement&&Math.abs(video.currentTime-time)>.3)onSeek(video.currentTime)}}>
      {missing || failed || !source ? <StatePanel title="Creative Media Is Unavailable" description="The record remains saved. Attach the file again to view its media." actions={!readOnly && <Button asChild variant="secondary"><Link to={appPath(`/add?tab=upload&replace=${encodeURIComponent(ad.id)}`)}>Reattach Creative</Link></Button>} /> : uploaded&&ad.uploadType==='pdf' ? <FilePreview name={ad.name || ad.product} src={source} mediaType="document" /> : <MediaStage src={source} alt={ad.name || ad.product} mediaType={uploaded&&ad.uploadType==='video'?'video':'image'} aspectRatio={creativeAspectRatio(ad)} currentTime={time} duration={analysis.duration} footer={!uploaded&&<span>Still creative · concept-cut timing</span>} />}
      {uploaded && ad.uploadType==="pdf" && source && <a href={source} target="_blank" rel="noreferrer">Open PDF</a>}
    </div>
    <p>{ad.placement || "Original upload"} · {ad.w} × {ad.h}</p>
    {analysis.shots.length ? <><p className="detail-sample-note">Shot, transcript and narrative annotations describe this concept cut; the source shown above is a still, not a playable video.</p>
      <ScrollableShotStrip shots={analysis.shots} selectedId={shot?.id} onSelect={shot=>onSeek(shot.time)} /><p aria-live="polite">{shot?.label} · {timeLabel(shot?.time || 0)}–{timeLabel(shot?.until || 0)}</p>
      <section aria-label="Shot findings"><h3>Shot Findings</h3>{findings.map(property=><p key={property.id}><strong>{property.label}:</strong> {property.value}</p>)}</section>
      <Transcript label="Active-shot transcript" segments={activeTranscript} currentTime={time} onSeek={onSeek} /><Button variant="quiet" onClick={onTranscript}>Show Full Transcript</Button>
      {shot&&<Button variant="quiet" onClick={()=>onScope(shot.id)}>Show Current-Shot Findings</Button>}
      <h3>Narrative Timeline</h3><ShotStrip label="Narrative timeline" shots={analysis.narrative} selectedId={shot?.id} onSelect={moment=>onSeek(moment.time)} />
      <p>Product reveal: {analysis.properties.find(property=>property.label==="First product appearance")?.value || "Not assessed"}</p>
    </> : <p>No shot or transcript analysis is available for this file.</p>}
  </section>
}

function ScrollableShotStrip({shots,selectedId,onSelect}:{shots:readonly {id:string;time:number;label:string;thumbnail?:string}[];selectedId?:string;onSelect:(shot:{id:string;time:number;label:string;thumbnail?:string})=>void}) {
  const frame=useRef<HTMLDivElement|null>(null)
  const [position,setPosition]=useState({previous:false,next:false})
  const measure=()=>{
    const strip=frame.current?.querySelector<HTMLElement>(".bf-shot-strip")
    if(!strip)return
    setPosition({previous:strip.scrollLeft>1,next:strip.scrollLeft+strip.clientWidth<strip.scrollWidth-1})
  }
  useEffect(()=>{
    const strip=frame.current?.querySelector<HTMLElement>(".bf-shot-strip")
    if(!strip)return
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(strip)
    strip.addEventListener("scroll",measure,{passive:true})
    return()=>{observer.disconnect();strip.removeEventListener("scroll",measure)}
  },[shots.length])
  const move=(direction:-1|1)=>{
    const strip=frame.current?.querySelector<HTMLElement>(".bf-shot-strip")
    if(!strip)return
    strip.scrollBy({left:direction*Math.max(120,strip.clientWidth-24),behavior:"auto"})
  }
  return <div className="detail-shot-strip" ref={frame}>
    <div className="detail-shot-strip__controls" aria-label="Shot strip controls">
      <span>Shots</span>
      <div><Button variant="quiet" aria-label="Previous Shots" disabled={!position.previous} onClick={()=>move(-1)}><ArrowLeft /></Button><Button variant="quiet" aria-label="Next Shots" disabled={!position.next} onClick={()=>move(1)}><ArrowRight /></Button></div>
    </div>
    <ShotStrip shots={shots} selectedId={selectedId} onSelect={onSelect} />
  </div>
}

function PerformancePanel({ad,range,onRange}:{ad:Ad;range:DeliveryRange;onRange:(value:string)=>void}) {
  const delivery=deliveryFor(ad,range)
  const window=`${range} days ending 22 Sep 2026`
  const results=delivery ? Number(delivery.results.value.replace(/[^\d.]/g,"")) : undefined
  const costPerResult=delivery && results ? `$${(delivery.spend/results).toFixed(2)}` : undefined
  const unavailable=()=>delivery ? "Not Supplied" : "Not Available"
  return <section className="detail-performance"><header><div><h2>Performance</h2><p>Delivery facts for the selected Meta window.</p></div><SelectField label="Delivery window" value={range} onChange={event=>onRange(event.target.value)}>{["7","30","90"].map(value=><option key={value} value={value}>{value} days ending 22 Sep 2026</option>)}</SelectField></header>
    <div className="detail-metrics"><MetricCell label="Spend" value={delivery?`$${delivery.spend.toLocaleString()}`:undefined} source="Meta delivery" window={window} missingReason={unavailable()} /><MetricCell label="Results" value={delivery?.results.value} source="Meta delivery" window={window} missingReason={unavailable()} /><MetricCell label="Cost per Result" value={costPerResult} source="Meta delivery" window={window} missingReason={delivery ? "No Results in This Window" : unavailable()} /><MetricCell label="Impressions" missingReason={unavailable()} /><MetricCell label="Reach" missingReason={unavailable()} /><MetricCell label="CTR" missingReason={unavailable()} /></div><p>{delivery?"Meta did not supply impressions, reach, or CTR in this sample. Creative findings do not establish performance attribution.":"Uploading a file does not supply delivery or attribution data."}</p>
  </section>
}

function NotesVersionsPanel({ad,readOnly,onDraft}:{ad:Ad;readOnly:boolean;onDraft:(trigger:HTMLElement,id?:string)=>void}) {
  const [params]=useSearchParams()
  const [notes,setNotes]=useState(()=>getNotes(ad.id,ad.notes))
  const [savedNotes,setSavedNotes]=useState(()=>JSON.stringify(getNotes(ad.id,ad.notes)))
  useUnsavedDetail(JSON.stringify(notes)!==savedNotes)
  const [message,setMessage]=useState("")
  const [version,setVersion]=useState<CreativeVersion|null>(null)
  const [result,setResult]=useState("")
  const [resultSource,setResultSource]=useState("")
  const [resultWindow,setResultWindow]=useState("")
  const [outcomeError,setOutcomeError]=useState("")
  const [revision,setRevision]=useState(0)
  const outcomeTrigger=useRef<HTMLElement|null>(null)
  const drafts=getIterationDrafts().filter(draft=>draft.adId===ad.id && draft.status!=="completed")
  const versions=getWorkflowState().versions.filter(version=>version.adId===ad.id)
  const focusedVersion=params.get("versionId") || params.get("version") || params.get("change")
  const versionFocus=useRef<HTMLElement|null>(null)
  useEffect(()=>{if(versions.some(version=>version.id===focusedVersion))versionFocus.current?.focus()},[focusedVersion])
  const sourceLabel=(propertyId?:string)=>getJevAnalysis(ad).properties.find(property=>property.id===propertyId)?.label || "No source finding recorded"
  const createVersionHref=(item:CreativeVersion)=>appPath(`/create?${new URLSearchParams({ad:ad.id,version:item.id,sourceContext:"version",...(item.propertyId?{property:item.propertyId}:{}),...(item.draftId?{draft:item.draftId}:{})})}`)
  const recordOutcome=(event:React.FormEvent)=>{
    event.preventDefault();if(!version || readOnly)return
    const ok=saveCreativeVersion({...version,outcome:{kind:"manual",summary:result,source:resultSource,window:resultWindow}})
    if(!ok){setOutcomeError("Could not save this outcome in your browser.");return}
    setRevision(revision+1);setVersion(null);setMessage("Manual outcome saved. No performance causation is implied.")
  }
  return <section className="detail-notes"><div className="detail-notes__card"><header><div><h2>Your Notes</h2><p>Keep the hypothesis, angle, and working copy together.</p></div></header><form onSubmit={event=>{event.preventDefault();if(readOnly)return;const ok=saveNotes(ad.id,notes);if(ok)setSavedNotes(JSON.stringify(notes));setMessage(ok?"Notes saved on this device.":"Could not save notes in this browser.")}}><TextareaField label="Hypothesis" value={notes.hypothesis} disabled={readOnly} onChange={event=>setNotes({...notes,hypothesis:event.target.value})} /><Field label="Intended angle" value={notes.angle} disabled={readOnly} onChange={event=>setNotes({...notes,angle:event.target.value})} /><TextareaField label="Copy or transcript notes" value={notes.transcript} disabled={readOnly} onChange={event=>setNotes({...notes,transcript:event.target.value})} /><Button disabled={readOnly} type="submit">Save Notes</Button>{message && <p role="status">{message}</p>}</form></div>
    <div className="detail-notes__versions-heading"><div><h2>Versions and Changes</h2><p>Drafts and recorded outcomes for this creative.</p></div><Button variant="secondary" disabled={readOnly} onClick={event=>onDraft(event.currentTarget)}>Draft a Change</Button></div>
    <ActivityTimeline items={drafts.map(draft=>({id:draft.id,label:draft.kind==="variant"?"Variant draft":"Change draft",detail:<>{draft.change}<br />Owner: {draft.owner || "You"} · Source finding: {sourceLabel(draft.propertyId)}<Button variant="quiet" onClick={event=>onDraft(event.currentTarget,draft.id)} disabled={readOnly}>Reopen Saved Work</Button></>,dateTime:draft.createdAt,timeLabel:new Date(draft.createdAt).toLocaleString()}))} label="Saved drafts" />
    <div className="detail-versions">{versions.length?versions.map(item=><article key={item.id} ref={focusedVersion===item.id?versionFocus:undefined} tabIndex={-1} aria-label={`Version ${item.id}`} aria-current={focusedVersion===item.id?"true":undefined}>
      <div className="detail-version-copy"><h3>{item.sample?"Sample version":"Local version"}</h3><p>{item.change}</p><p>Owner: {item.owner} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p><p>Source finding: {sourceLabel(item.propertyId)}</p>
      <p>{item.outcome.kind==="manual"?"Manual result":item.outcome.kind==="sample"?"Sample result":"Unmeasured"}: {item.outcome.summary}</p>{item.outcome.kind!=="unmeasured" && <p>{item.outcome.source} · {item.outcome.window}</p>}</div>
      <div className="detail-version-actions">{readOnly?<Button disabled>Create New Version</Button>:<Button asChild variant="primary"><Link aria-label={`Create New Version from ${item.id}`} to={createVersionHref(item)}>Create New Version</Link></Button>}<Button variant="secondary" disabled={readOnly} onClick={event=>{outcomeTrigger.current=event.currentTarget;setVersion(item);setResult(item.outcome.kind==="unmeasured"?"":item.outcome.summary);setResultSource(item.outcome.kind==="unmeasured"?"":item.outcome.source);setResultWindow(item.outcome.kind==="unmeasured"?"":item.outcome.window);setOutcomeError("")}}>Record Outcome</Button></div>
    </article>):<StatePanel title="No Completed Versions Yet" description="Complete a saved change in Work Queue to record the applied version and its outcome." />}</div>
    <Dialog open={Boolean(version)} onOpenChange={open=>{if(!open)setVersion(null)}}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();outcomeTrigger.current?.focus()}}><DialogTitle>Record Version Outcome</DialogTitle><DialogDescription>Record a manual observation with its source and window. This does not establish that the change caused a result.</DialogDescription><form className="detail-outcome-form" onSubmit={recordOutcome}><TextareaField label="Result after change" required value={result} onChange={event=>setResult(event.target.value)} /><Field label="Result source" required value={resultSource} onChange={event=>setResultSource(event.target.value)} /><Field label="Result window" required value={resultWindow} onChange={event=>setResultWindow(event.target.value)} error={outcomeError || undefined} /><Button type="submit" disabled={!result.trim() || !resultSource.trim() || !resultWindow.trim() || readOnly}>Save Outcome</Button></form></DialogContent></Dialog>
  </section>
}

function useUnsavedDetail(dirty:boolean) {
  const token=useRef(Symbol('detail-form')).current
  useEffect(()=>{
    if(!dirty)return
    detailDirtyForms.add(token)
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
    const navigate=(event:MouseEvent)=>{if(checkedDetailDepartures.has(event))return;const control=(event.target as HTMLElement).closest('a[href]');if(control&&control.getAttribute('href')!==`${location.pathname}${location.search}`){checkedDetailDepartures.add(event);if(!confirmDetailDeparture()){event.preventDefault();event.stopImmediatePropagation()}}}
    const index=window.history.state?.idx
    let restoring=false
    const back=(event:PopStateEvent)=>{
      if(restoring){restoring=false;return}
      if(checkedDetailDepartures.has(event))return
      if(typeof index==='number'&&typeof event.state?.idx==='number'&&index!==event.state.idx){
        checkedDetailDepartures.add(event)
        if(!confirmDetailDeparture()){event.stopImmediatePropagation();restoring=true;window.history.go(index-event.state.idx)}
      }
    }
    window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);detailHistoryGuards.add(back)
    return()=>{detailDirtyForms.delete(token);window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);detailHistoryGuards.delete(back)}
  },[dirty,token])
  return token
}

function IdeationComposer({ad,ads,property:selection,open,onClose,draftId,onSaved,returnFocusRef,stale}:{ad:Ad;ads:Ad[];property?:JevProperty;open:boolean;onClose:()=>void;draftId:string|null;onSaved:()=>void;returnFocusRef:RefObject<HTMLElement|null>;stale:boolean}) {
  const [params]=useSearchParams()
  const navigate=useNavigate()
  const existing=draftId?getIterationDrafts().find(draft=>draft.id===draftId && draft.adId===ad.id):undefined
  const property=existing?.propertyId ? getJevAnalysis(ad).properties.find(property=>property.id===existing.propertyId) : selection
  const [outputType,setOutputType]=useState("variation")
  const [workingDraftId,setWorkingDraftId]=useState(existing?.id || crypto.randomUUID())
  const [change,setChange]=useState(existing?.change || "")
  const [message,setMessage]=useState("")
  const [edited,setEdited]=useState(false)
  const dirtyForm=useUnsavedDetail(open&&edited)
  useEffect(()=>{if(open){setWorkingDraftId(existing?.id || crypto.randomUUID());setOutputType(existing?.kind==="fix" ? "fix" : "variation");setChange(existing?.change || (property ? `Build a new opening from ${property.label.toLowerCase()}: ${property.value}.` : ""));setMessage("");setEdited(false)}},[open,draftId,existing?.id])
  const sourceIds=(params.get("sourceAds") || ad.id).split(",")
  const sources=sourceIds.map(id=>ads.find(source=>source.id===id)).filter((source):source is Ad=>Boolean(source))
  const findingId=params.get("finding") || params.get("findingId") || undefined
  const persist=()=>{const ok=saveIterationDraft({id:workingDraftId,adId:ad.id,kind:outputType==="fix" ? "fix" : "variant",change:stale?`[Stale source result] ${change}`:change,createdAt:existing?.createdAt || new Date().toISOString(),propertyId:property?.id,propertyDefinition:existing?.propertyDefinition || property?.definitionSnapshot,owner:"You",status:"draft",sample:false});setMessage(ok?"Draft saved to Work Queue on this device.":"Could not save this draft in your browser.");if(ok){setEdited(false);onSaved()}return ok}
  const creationParams=new URLSearchParams(params);creationParams.set('ad',ad.id);creationParams.set('draft',workingDraftId);creationParams.set('sourceAds',params.get('sourceAds') || ad.id);if(property)creationParams.set('property',property.id);if(findingId)creationParams.set('finding',findingId);if(stale)creationParams.set('sourceFreshness','stale')
  const continueToCreate=()=>{if(confirmDetailDeparture(dirtyForm)&&persist())navigate(appPath(`/create?${creationParams}`))}
  const close=()=>{if(!edited||window.confirm('Discard unsaved draft changes?')){setEdited(false);onClose()}}
  return <Dialog open={open} onOpenChange={next=>{if(!next)close()}}><DialogContent className="detail-ideation" onCloseAutoFocus={event=>{event.preventDefault();returnFocusRef.current?.focus()}}><DialogTitle>JEV Neural Ideation</DialogTitle><DialogDescription>Shape a grounded local draft from the selected creative and finding. Nothing is generated or published by a live service.</DialogDescription><section className="detail-ideation-source" aria-labelledby="ideation-sources"><h3 id="ideation-sources">Source Context</h3>{stale&&<p>Stale source result: this draft retains an outdated analysis and must be checked against the creative.</p>}<div className="detail-ideation-badges">{sources.map(source=><Badge variant="outline" key={source.id}>Ad {source.id}</Badge>)}{property&&<Badge variant="secondary">Property {property.id}</Badge>}{findingId&&<Badge variant="secondary">Finding {findingId}</Badge>}</div><ul>{sources.map(source=><li key={source.id}><strong>{source.name || source.product}</strong><span>{source.placement || "Original Upload"}</span></li>)}</ul>{property ? <p><strong>{property.label}:</strong> {property.value}. {property.evidence?.quote || property.missingReason}</p>:<p>No analysis is available. Describe your own hypothesis without treating it as an extracted finding.</p>}</section><SelectField label="Output Type" value={outputType} onChange={event=>{setOutputType(event.target.value);setEdited(true)}}><option value="variation">Ad Variation</option><option value="script">Script Outline</option><option value="fix">Finding Fix</option></SelectField><TextareaField label="Generated Output" rows={6} value={change} onChange={event=>{setChange(event.target.value);setEdited(true)}} /><div className="detail-ideation-actions"><Button onClick={persist} disabled={!change.trim()}>Save to Work Queue</Button><Button variant="secondary" onClick={continueToCreate} disabled={!change.trim()}>Continue to Create Ads</Button><Button variant="quiet" onClick={close}>Close</Button></div>{message && <p role="status">{message}</p>}</DialogContent></Dialog>
}

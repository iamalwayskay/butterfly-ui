import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Copy, ImagePlus, Pencil, Save, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogActions, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, Badge, Banner, Button, Checkbox, DataTable, Dropzone, Field, IconButton, PageTabs, Progress, SelectField, StatePanel, Toast, WorkspacePageHeader } from "@/design-system/components"
import { Page } from "@/components/page"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ads as sampleAds, sampleAdIds, visibleAds } from "@/data/ads"
import { getWorkflowState } from "@/lib/iterations"
import { appPath } from "@/lib/app-location"
import { createCreationMediaUrl, creationIssues, destinationUrl, generateCopyVariants, makeCreationAsset, newCreationDraft, readCreationStore, recordPausedReceipt, rememberCreationMedia, resolveCreationSource, restoreCreationMedia, saveCreationDraft, type CreationAsset, type CreationDraft, type CreationReceipt } from "@/lib/creation"
import { CreationCopyFields, CreationDestinationFields, CreationSetupFields } from "./create-ads-fields"
import "./create-ads.css"

const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value))
const newId=()=>crypto.randomUUID()
const stages=[{value:"copy",label:"Assets & Copy"},{value:"creative",label:"Creative Preview"},{value:"setup",label:"Meta Setup"},{value:"review",label:"Review & Send"}]
const statusText=(asset:CreationAsset)=>asset.status==="paused"?"Paused":asset.status==="sending"?"Sending":asset.status==="error"?"Send failed":creationIssues(asset).some(issue=>issue.field==="permission")?"Permission needed":creationIssues(asset).length?"Needs attention":"Ready"
const issueStage:Record<string,string>={media:"creative",primary:"copy",headline:"copy",cta:"copy",url:"copy",permission:"setup",identity:"setup",campaign:"setup",adSet:"setup",objective:"setup",category:"setup",budget:"setup",schedule:"setup"}
const issueControl:Record<string,string>={media:"creation-media",primary:"creation-primary",headline:"creation-headline",cta:"creation-cta",url:"creation-url",permission:"creation-account",identity:"creation-page",campaign:"creation-campaign",adSet:"creation-adSet",objective:"creation-objective",category:"creation-category",budget:"creation-budget",schedule:"creation-end"}
// As in Ad Detail, register before BrowserRouter can unmount a cancelled history departure.
const creationHistoryGuards=new Set<(event:PopStateEvent)=>void>()
if(typeof window!=="undefined")window.addEventListener("popstate",event=>{for(const guard of creationHistoryGuards)guard(event)})

export function CreateAds() {
  const [params,setParams]=useSearchParams()
  const [store,setStore]=useState(readCreationStore)
  const [source]=useState(()=>resolveCreationSource(params,visibleAds(),getWorkflowState()))
  const [draft,setDraft]=useState<CreationDraft>(()=>{
    const saved=readCreationStore().drafts.find(item=>item.id===params.get("batch"));if(saved)return restoreCreationMedia(copy(saved))
    const fresh=newCreationDraft(),sourceIds=[...params.getAll("upload"),...(params.get("sourceAds")?.split(",").filter(Boolean)||[])]
    if(sourceIds.length){const available=visibleAds();fresh.assets=sourceIds.flatMap(id=>{if(source.asset?.source?.adId===id)return [source.asset];const resolved=resolveCreationSource(new URLSearchParams({ad:id}),available,getWorkflowState());return resolved.asset?[resolved.asset]:[]})}
    else if(source.asset)fresh.assets=[source.asset]
    else if(!params.has("ad")&&!params.has("draft")&&!params.has("finding")&&!params.has("state")){const recent=readCreationStore().drafts[0];if(recent)return restoreCreationMedia(copy(recent))}
    return fresh
  })
  const [selected,setSelected]=useState(()=>draft.assets.map(asset=>asset.id))
  const [activeId,setActiveId]=useState(()=>draft.assets[0]?.id || "")
  const [placement,setPlacement]=useState("Feed")
  const [message,setMessage]=useState("")
  const [saveError,setSaveError]=useState("")
  const [validating,setValidating]=useState(false)
  const [acknowledged,setAcknowledged]=useState(false)
  const [busy,setBusy]=useState(false)
  const [reading,setReading]=useState(false)
  const [sentCount,setSentCount]=useState(0)
  const [sendTotal,setSendTotal]=useState(0)
  const [confirmRemove,setConfirmRemove]=useState(false)
  const [removed,setRemoved]=useState(false)
  const [issueAsset,setIssueAsset]=useState<CreationAsset|null>(null)
  const [receiptDetail,setReceiptDetail]=useState<CreationReceipt|null>(null)
  const detailTriggerRef=useRef<HTMLElement|null>(null)
  const [pendingFocus,setPendingFocus]=useState("")
  const [queueExpanded,setQueueExpanded]=useState(false)
  const saveRef=useRef<HTMLButtonElement>(null),removeRef=useRef<HTMLButtonElement>(null),queueRef=useRef<HTMLHeadingElement>(null),validationRef=useRef<HTMLDivElement>(null),resultRef=useRef<HTMLHeadingElement>(null)
  const runRef=useRef(0),focusReceiptRef=useRef(false)
  useEffect(()=>()=>{runRef.current++},[])
  const step=stages.some(stage=>stage.value===params.get("step"))?params.get("step")!:"copy"
  const stageIndex=stages.findIndex(stage=>stage.value===step)
  const previousStep=useRef(step)
  const scenario=params.get("state") || "ready"
  const readOnly=scenario==="readonly" || Boolean(store.issue)
  const permission=scenario==="permission"
  const disabled=readOnly||busy||reading
  const active=draft.assets.find(asset=>asset.id===activeId) || draft.assets[0]
  const selectedAssets=draft.assets.filter(asset=>selected.includes(asset.id))
  const receipts=store.receipts.filter(receipt=>receipt.draftId===draft.id)
  const problems=selectedAssets.flatMap(asset=>creationIssues(asset).map(issue=>({asset,...issue})))
  const activeErrors=validating&&active?Object.fromEntries(creationIssues(active).map(issue=>[issue.field,issue.message])):{}
  useEffect(()=>{
    rememberCreationMedia(draft)
    if(readOnly||busy||(!draft.assets.length&&!store.drafts.some(item=>item.id===draft.id)))return
    if(!saveCreationDraft(draft)){setSaveError("Draft was not saved. Existing browser records are unchanged.");return}
    setSaveError("");setStore(readCreationStore())
    setParams(current=>{if(current.get("batch")===draft.id)return current;const next=new URLSearchParams(current);next.set("batch",draft.id);return next},{replace:true})
  },[draft,readOnly,busy])
  useEffect(()=>{
    if(!saveError)return
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=""}
    const confirm=()=>window.confirm("This draft could not be saved. Leave and discard unsaved changes?")
    const current=new URL(window.location.href),index=window.history.state?.idx
    const leaving=(url:URL)=>url.pathname!==current.pathname||url.searchParams.get("batch")!==current.searchParams.get("batch")
    const navigate=(event:MouseEvent)=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
      const link=(event.target as Element).closest<HTMLAnchorElement>("a[href]")
      if(!link||link.target==="_blank"||link.hasAttribute("download")||!leaving(new URL(link.href)))return
      if(!confirm()){event.preventDefault();event.stopImmediatePropagation();link.focus({preventScroll:true})}
    }
    let restoring=false,focus:HTMLElement|null=null
    const back=(event:PopStateEvent)=>{
      if(restoring){restoring=false;focus?.focus({preventScroll:true});return}
      if(!leaving(new URL(window.location.href)))return
      if(typeof index==="number"&&typeof event.state?.idx==="number"&&index!==event.state.idx&&!confirm()){
        event.stopImmediatePropagation();focus=document.activeElement as HTMLElement;restoring=true;window.history.go(index-event.state.idx)
      }
    }
    window.addEventListener("beforeunload",warn);document.addEventListener("click",navigate,true);creationHistoryGuards.add(back)
    return()=>{window.removeEventListener("beforeunload",warn);document.removeEventListener("click",navigate,true);creationHistoryGuards.delete(back)}
  },[saveError,params])
  useEffect(()=>{
    if(previousStep.current===step)return
    previousStep.current=step;setQueueExpanded(false)
    if(pendingFocus)return
    const frame=requestAnimationFrame(()=>{const heading=document.getElementById("creation-stage-title");heading?.focus({preventScroll:true});heading?.scrollIntoView({block:"start"})})
    return()=>cancelAnimationFrame(frame)
  },[step,pendingFocus])
  useEffect(()=>{if(!receipts.length||!focusReceiptRef.current)return;focusReceiptRef.current=false;const frame=requestAnimationFrame(()=>resultRef.current?.focus());return()=>cancelAnimationFrame(frame)},[receipts.length])
  useEffect(()=>{if(!pendingFocus)return;const frame=requestAnimationFrame(()=>{const target=document.getElementById(pendingFocus);if(target){target.focus();setPendingFocus("")}});return()=>cancelAnimationFrame(frame)},[pendingFocus,step,activeId])
  const updateParams=(values:Record<string,string>)=>setParams(current=>{const next=new URLSearchParams(current);Object.entries(values).forEach(([key,value])=>next.set(key,value));return next})
  const change=(next:CreationDraft)=>{if(disabled)return;setDraft({...next,updatedAt:new Date().toISOString()});setAcknowledged(false);setSaveError("")}
  function editAsset(id:string,patch:Partial<CreationAsset>) {change({...draft,assets:draft.assets.map(asset=>asset.id===id?{...asset,...patch,status:"draft",revision:asset.revision+1}:asset)})}
  function selectAsset(asset:CreationAsset){setActiveId(asset.id);setValidating(false)}
  function save(){if(disabled)return;if(!saveCreationDraft(draft)){setSaveError("Draft was not saved. Existing browser records are unchanged.");return}setSaveError("");setStore(readCreationStore());updateParams({batch:draft.id});setMessage("Creation draft saved in this browser.")}
  function openDraft(id:string){if(disabled)return;const found=store.drafts.find(item=>item.id===id);if(!found)return;if(!saveCreationDraft(draft)){setSaveError("Draft was not saved. Existing browser records are unchanged.");return}setDraft(restoreCreationMedia(copy(found)));setActiveId(found.assets[0]?.id||"");setSelected(found.assets.map(asset=>asset.id));setValidating(false);setAcknowledged(false);updateParams({batch:id})}
  function loadSamples(){
    if(disabled)return
    const defaults=copy(draft.defaults);defaults.meta.category="none";defaults.destination.url="https://kindred.example/serum";defaults.destination.campaign="autumn-demo"
    const connectedSamples=sampleAdIds.flatMap(id=>{const ad=sampleAds.find(item=>item.id===id);return ad?[ad]:[]})
    const assets=connectedSamples.map(ad=>{
      const asset=resolveCreationSource(new URLSearchParams({ad:ad.id}),[ad],getWorkflowState()).asset!
      return {...asset,destination:copy(defaults.destination),meta:copy(defaults.meta),variants:[{primary:ad.read.hookLine || "A daily skincare routine, made simple.",headline:ad.product,description:"Explore the Kindred routine.",cta:"Learn more",script:"Sample storyboard: product, routine, pack shot."}]}
    })
    change({...draft,defaults,assets:[...draft.assets,...assets]});setSelected(assets.map(asset=>asset.id));setActiveId(assets[0].id)
  }
  async function addFiles(files:File[],replaceId?:string){
    if(disabled)return;setReading(true)
    const existing=new Set(draft.assets.filter(asset=>asset.id!==replaceId).map(asset=>asset.fingerprint))
    const items=await Promise.all(files.map(async file=>{
      const type:CreationAsset["type"]=file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":"unsupported"
      const fingerprint=`${file.name}:${file.size}:${file.type}`
      let issue=existing.has(fingerprint)?"Duplicate file metadata. Remove this row or attach another file.":type==="unsupported"?"Unsupported file. Choose an image or video.":file.size>100*1024*1024?"File exceeds the 100 MB limit.":undefined
      existing.add(fingerprint)
      let src:string|undefined,width=0,height=0
      if(type!=="unsupported"&&!issue){src=createCreationMediaUrl(file);const media=type==="video"?document.createElement("video"):new Image();const dimensions=await new Promise<{width:number;height:number}|null>(resolve=>{const timer=window.setTimeout(()=>resolve(null),5000);const finish=()=>{clearTimeout(timer);resolve(media instanceof HTMLVideoElement?{width:media.videoWidth,height:media.videoHeight}:{width:media.naturalWidth,height:media.naturalHeight})};media.onerror=()=>{clearTimeout(timer);resolve(null)};if(media instanceof HTMLVideoElement){media.preload="metadata";media.onloadedmetadata=finish}else media.onload=finish;media.src=src!});if(dimensions){width=dimensions.width;height=dimensions.height}else issue="Media could not be read. Choose a playable image or video."}
      return makeCreationAsset({name:file.name,type,fingerprint,width,height,src,issue},draft.defaults)
    }))
    setReading(false)
    if(replaceId){const item=items[0];if(!item)return;setDraft(current=>({...current,assets:current.assets.map(asset=>asset.id===replaceId?{...asset,name:item.name,type:item.type,src:item.src,width:item.width,height:item.height,fingerprint:item.fingerprint,mediaVersion:item.mediaVersion,issue:item.issue,panel:undefined,status:"draft",revision:asset.revision+1}:asset)}))}
    else{setDraft(current=>({...current,assets:[...current.assets,...items]}));setSelected(items.map(asset=>asset.id));setActiveId(items[0]?.id||activeId)}
    setAcknowledged(false)
  }
  function duplicate(){const clones=selectedAssets.map(asset=>({...copy(asset),id:newId(),name:`${asset.name} copy`,status:"draft" as const,revision:0}));change({...draft,assets:[...draft.assets,...clones]});setSelected(clones.map(asset=>asset.id));setActiveId(clones[0]?.id||activeId)}
  function applyDefaults(setup:boolean){change({...draft,assets:draft.assets.map(asset=>selected.includes(asset.id)?{...asset,...(setup?{meta:copy(draft.defaults.meta)}:{variants:asset.variants.map((variant,index)=>index===asset.activeVariant?copy(draft.defaults.copy):variant),destination:copy(draft.defaults.destination)}),status:"draft",revision:asset.revision+1}:asset)})}
  async function send(retry=false){
    if(disabled||permission)return
    const targets=selectedAssets.filter(asset=>retry?asset.status==="error":asset.status!=="paused")
    if(!targets.length||problems.length||!acknowledged){setValidating(true);requestAnimationFrame(()=>validationRef.current?.focus());return}
    setValidating(false);setBusy(true);setSentCount(0);setSendTotal(targets.length);const run=++runRef.current;let current=copy(draft)
    for(const [index,asset] of targets.entries()){
      setDraft({...current,assets:current.assets.map(row=>row.id===asset.id?{...row,status:"sending"}:row)})
      await new Promise(resolve=>setTimeout(resolve,300));if(run!==runRef.current)return
      const failure=!retry&&(scenario==="error"||(scenario==="partial"&&index===targets.length-1))
      const receipt=failure?null:recordPausedReceipt(current,asset)
      current={...current,assets:current.assets.map(row=>row.id===asset.id?{...row,status:receipt?"paused":"error"}:row)}
      setDraft(current);setSentCount(index+1)
    }
    if(!saveCreationDraft(current))setSaveError("Local receipt storage failed. No live ads were sent.")
    const nextStore=readCreationStore();focusReceiptRef.current=nextStore.receipts.filter(receipt=>receipt.draftId===draft.id).length>receipts.length;setStore(nextStore);setBusy(false);updateParams({batch:draft.id})
  }
  function returnToFirstIssue(){const first=problems[0];if(!first){setPendingFocus("creation-queue-title");updateParams({step:"copy"});return}setActiveId(first.asset.id);setPendingFocus(issueControl[first.field]||"creation-queue-title");updateParams({step:issueStage[first.field]||"copy"})}
  const preview=active?<section className="creation-preview" role="region" aria-label="Placement preview"><div className="creation-actions">{["Feed","Reels","Stories"].map(name=><Button key={name} variant="secondary" aria-pressed={placement===name} onClick={()=>setPlacement(name)}>{name}</Button>)}</div><div className="creation-ad-preview"><header><strong>{active.meta.page}</strong><span>Sponsored · preview</span></header><p>{active.variants[active.activeVariant]?.primary || "Your primary text will appear here."}</p><div className="creation-media" data-panel={active.panel} style={{aspectRatio:placement==="Feed"?`${active.width||1} / ${active.height||1}`:"9 / 16"}}>{active.src?active.type==="video"?<video src={active.src} width={active.width||undefined} height={active.height||undefined} controls aria-label={active.name} />:<img src={active.src} width={active.width||undefined} height={active.height||undefined} alt={active.name} />:<div className="creation-wireframe"><ImagePlus aria-hidden="true" /><strong>Creative Preview</strong><span>Attach media to complete this {placement} preview.</span></div>}</div><footer><strong>{active.variants[active.activeVariant]?.headline||"Your headline"}</strong><p>{active.variants[active.activeVariant]?.description}</p><span>{active.variants[active.activeVariant]?.cta||"Choose CTA"}</span></footer></div><p className="creation-note">{active.src&&active.type!=="unsupported"?`${placement} preview · media contained, never stretched.`:"Placement unavailable until media is attached."} Placement eligibility is confirmed when the Meta integration is connected.</p></section>:null
  return <Page className="creation-page"><WorkspacePageHeader title="Create Ads" breadcrumb={[{label:"Workspace",href:appPath("/ads")},{label:"Create Ads"}]} description="Build a creative batch, review its setup, and prepare a paused Meta handoff." />
    {store.issue&&<StatePanel tone="permission" title="Saved Creation Data Is Protected" description={store.issue} />}{source.error&&<StatePanel tone="error" title="Source Context Unavailable" description={source.error} />}{permission&&<StatePanel tone="permission" title="Creation Permission Needed" description="This account cannot send ads. Ask an administrator for ad-creation access." />}{readOnly&&!store.issue&&<Banner title="Creation Is Read-Only" tone="permission">You can inspect saved rows and previews but cannot edit, save or send.</Banner>}{saveError&&<p role="alert">{saveError}</p>}
    {!active?<section className="creation-start" role="region" aria-labelledby="creation-start-title" aria-label="Start a new ad batch">
      <div className="creation-start__intro"><ImagePlus aria-hidden="true" /><div><h2 id="creation-start-title">Start a New Ad Batch</h2><p>Bring in your own image or video, or open the Kindred sample batch to explore the full workflow.</p></div></div>
      <div className="creation-start__actions"><div className="creation-start__sample"><div><strong>Explore with Sample Assets</strong><small>Three Kindred ads ready to explore</small></div><Button disabled={disabled} onClick={loadSamples}>Load Sample Batch</Button></div><Dropzone name="creation-assets" label="Upload" multiple accept="image/*,video/*" disabled={disabled} onFiles={files=>void addFiles(files)} hint="Images or videos · up to 100 MB each · multiple files supported" /></div>
      <ol className="creation-start__steps" aria-label="Batch workflow"><li><span>01</span><strong>Write</strong><small>Copy, scripts and variants</small></li><li><span>02</span><strong>Preview</strong><small>Feed, Reels and Stories</small></li><li><span>03</span><strong>Map</strong><small>Campaign, identity and budget</small></li><li><span>04</span><strong>Handoff</strong><small>Validated PAUSED receipts</small></li></ol>
      {reading&&<StatePanel tone="loading" title="Reading Files" description="Checking dimensions and playable media." />}
      <p className="creation-start__boundary"><strong>Sample workspace.</strong> Nothing is sent to Meta; prepared ads and receipts stay in this browser.</p>
    </section>:<>
    <div className="creation-draft-bar"><Field id="creation-batch-name" name="creation-batch-name" autoComplete="off" label="Batch Name" value={draft.name} disabled={disabled} onChange={event=>change({...draft,name:event.target.value})} /><SelectField id="creation-saved-batch" name="creation-saved-batch" autoComplete="off" label="Saved Batches" value={store.drafts.some(item=>item.id===draft.id)?draft.id:""} disabled={disabled} onChange={event=>openDraft(event.target.value)}><option value="">Current unsaved batch</option>{store.drafts.map(item=><option key={item.id} value={item.id}>{item.name} · {item.assets.length} assets</option>)}</SelectField></div>
    <p className="creation-fixture-note"><strong>Sample workspace.</strong> Nothing is sent to Meta; prepared ads and receipts stay in this browser.</p>
    <PageTabs className="creation-stages" label="Creation Stages" queryParam="step" activeValue={step} items={stages} />
    <section className="creation-queue" data-compact={step!=="copy"&&!queueExpanded} aria-labelledby="creation-queue-title"><div className="creation-section-head"><h2 id="creation-queue-title" tabIndex={-1} ref={queueRef}>Asset Queue</h2><span>{draft.assets.length} assets · {selected.length} selected</span>{step!=="copy"&&<Button variant="quiet" aria-expanded={queueExpanded} onClick={()=>setQueueExpanded(!queueExpanded)}>{queueExpanded?"Compact Queue":"Manage Assets"}</Button>}</div>
      <div className="creation-actions creation-queue-actions"><Checkbox label="Select All Assets" checked={selected.length===draft.assets.length} disabled={disabled} onChange={event=>setSelected(event.target.checked?draft.assets.map(asset=>asset.id):[])} /><Button icon={<Copy />} variant="quiet" disabled={disabled||!selected.length} onClick={duplicate}>Duplicate Selected</Button><Button ref={removeRef} icon={<Trash2 />} variant="quiet" disabled={disabled||!selected.length} onClick={()=>{setRemoved(false);setConfirmRemove(true)}}>Remove Selected</Button><Button variant="secondary" disabled={disabled} onClick={loadSamples}>Add Sample Assets</Button></div>
      <Dropzone name="creation-assets" label="Upload Images or Videos" multiple accept="image/*,video/*" disabled={disabled} selectedCount={draft.assets.length} onFiles={files=>void addFiles(files)} hint="Images or videos · up to 100 MB each · multiple files supported" />
      {reading&&<StatePanel tone="loading" title="Reading Files" description="Checking dimensions and playable media." />}
      <div className="creation-asset-list">{draft.assets.map(asset=><article key={asset.id} className="creation-asset" aria-label={asset.name} data-active={asset.id===active?.id}><Checkbox label={`Select ${asset.name}`} checked={selected.includes(asset.id)} disabled={disabled} onChange={event=>setSelected(event.target.checked?[...selected,asset.id]:selected.filter(id=>id!==asset.id))} /><div className="creation-thumbnail" data-panel={asset.panel}>{asset.src?asset.type==="video"?<video src={asset.src} width={asset.width||undefined} height={asset.height||undefined} muted preload="metadata" aria-label={`${asset.name} thumbnail`} />:<img src={asset.src} width={asset.width||undefined} height={asset.height||undefined} alt="" />:<ImagePlus aria-hidden="true" />}</div><div className="creation-asset-copy"><h3>{asset.name}</h3><p>{asset.type} · {asset.width||"?"} × {asset.height||"?"} · {asset.sample?"Sample creative":"Local file"}</p><Badge variant={asset.status==="error"?"error":"neutral"}>{permission?"Permission needed":statusText(asset)}</Badge>{creationIssues(asset)[0]&&<p>{creationIssues(asset)[0].message}</p>}</div><IconButton icon={<Pencil />} variant="quiet" onClick={()=>selectAsset(asset)} label={`Edit ${asset.name}`} /></article>)}</div>
    </section>
    {active&&<><div className="creation-source"><strong>{active.source?"Source Context":"Scratch Creative"}</strong><p>{active.source?.label || "Your uploaded file and supplied copy."}</p>{active.source&&<Link to={appPath(`/ads/${active.source.adId}?${new URLSearchParams({panel:"jev",...(active.source.propertyId?{property:active.source.propertyId}:{}),...(active.source.findingId?{finding:active.source.findingId}:{}),...(active.source.draftId?{draft:active.source.draftId}:{})})}`)}>Open Source Ad</Link>}</div>
      {step!=="review"?<div className="creation-editor-layout"><fieldset disabled={disabled} className="creation-editor"><legend className="sr-only">Edit selected creative</legend><h2 id="creation-stage-title" tabIndex={-1}>{active.name}</h2>
        {step==="copy"?<><SelectField id="creation-variant" name="creation-variant" autoComplete="off" label="Variant" value={String(active.activeVariant)} onChange={event=>editAsset(active.id,{activeVariant:Number(event.target.value)})}>{active.variants.map((_,index)=><option key={index} value={index}>Variant {index+1}</option>)}</SelectField><CreationCopyFields errors={activeErrors} value={active.variants[active.activeVariant]} onChange={value=>editAsset(active.id,{variants:active.variants.map((item,index)=>index===active.activeVariant?value:item)})} /><div className="creation-actions"><Button variant="secondary" disabled={!active.variants[active.activeVariant].primary.trim()} onClick={()=>editAsset(active.id,{variants:[...active.variants,...generateCopyVariants(active.variants[active.activeVariant])]})}>Create Variants</Button><Button variant="quiet" disabled={active.variants.length<2} onClick={()=>editAsset(active.id,{variants:active.variants.filter((_,index)=>index!==active.activeVariant),activeVariant:0})}>Remove Variant</Button></div><p className="creation-note">Variants rearrange only your supplied copy and notes.</p><CreationDestinationFields errors={activeErrors} value={active.destination} onChange={destination=>editAsset(active.id,{destination})} /><details className="creation-bulk"><summary>Apply Copy and Destination to Selected</summary><CreationCopyFields bulk value={draft.defaults.copy} onChange={value=>change({...draft,defaults:{...draft.defaults,copy:value}})} /><CreationDestinationFields bulk value={draft.defaults.destination} onChange={destination=>change({...draft,defaults:{...draft.defaults,destination}})} /><Button variant="secondary" disabled={!selected.length} onClick={()=>applyDefaults(false)}>Apply Copy and Destination to Selected</Button></details></>
          :step==="creative"?<><p>Switch placements beside this editor. The media stays fully visible; any empty space is intentional.</p><Dropzone id="creation-media" name="creation-media" error={activeErrors.media} label={`Reattach ${active.name}`} accept="image/*,video/*" disabled={disabled} onFiles={files=>void addFiles(files,active.id)} hint="Replace this row's media while keeping its copy and source context." /><SelectField id="creation-library-creative" name="creation-library-creative" autoComplete="off" label="Use Existing Creative" value="" onChange={event=>{const source=resolveCreationSource(new URLSearchParams({ad:event.target.value}),visibleAds(),getWorkflowState()).asset;if(source)editAsset(active.id,{src:source.src,mediaVersion:source.mediaVersion,type:source.type,width:source.width,height:source.height,panel:source.panel,issue:source.issue,fingerprint:source.fingerprint})}}><option value="">Choose from your library</option>{visibleAds().map(ad=><option key={ad.id} value={ad.id}>{ad.name||ad.product}</option>)}</SelectField></>
          :<><CreationSetupFields errors={activeErrors} value={active.meta} onChange={meta=>editAsset(active.id,{meta})} /><details className="creation-bulk"><summary>Apply Meta Setup to Selected</summary><CreationSetupFields bulk value={draft.defaults.meta} onChange={meta=>change({...draft,defaults:{...draft.defaults,meta}})} /><Button variant="secondary" disabled={!selected.length} onClick={()=>applyDefaults(true)}>Assign Setup to Selected</Button></details></>}
      </fieldset>{preview}</div>:<section className="creation-review"><h2 id="creation-stage-title" tabIndex={-1}>Paused Batch Review</h2><p>Review every selected row before preparing paused ads.</p><div className="creation-review-table"><DataTable label="Paused batch review" rows={selectedAssets} getRowId={asset=>asset.id} getRowLabel={asset=>asset.name} columns={[{id:"asset",label:"Creative / Copy",render:asset=><><strong>{asset.name}</strong><p>Variant {asset.activeVariant+1}: {asset.variants[asset.activeVariant].headline}</p><p>{asset.variants[asset.activeVariant].primary}</p><span>{asset.variants[asset.activeVariant].cta}</span></>},{id:"destination",label:"Destination",render:asset=><span className="creation-url">{destinationUrl(asset.destination)||"Destination missing"}</span>},{id:"mapping",label:"Meta Setup",render:asset=><><strong>{asset.meta.campaign}</strong><p>{asset.meta.campaignMode} campaign / {asset.meta.adSetMode} ad set: {asset.meta.adSet}</p><p>{asset.meta.account} · {asset.meta.page} · {asset.meta.instagram}</p><p>{asset.meta.objective} · Category: {asset.meta.category||"Not declared"}</p><p>Audience {asset.meta.advantageAudience?"Advantage+":"Manual"} / Placements {asset.meta.advantagePlacements?"Advantage+":"Manual"} / Enhancements {asset.meta.enhancements?"on":"off"}</p><p>GBP {asset.meta.budget} {asset.meta.budgetType.toLowerCase()} · {asset.meta.start||"Unscheduled"} → {asset.meta.end||"No end"}</p></>},{id:"status",label:"Validation",render:asset=><div className="creation-review-status"><Badge variant={creationIssues(asset).length?"error":"neutral"}>{permission?"Permission needed":statusText(asset)}</Badge><Button variant="quiet" aria-label={`View Issues for ${asset.name}`} onClick={event=>{detailTriggerRef.current=event.currentTarget;setIssueAsset(asset)}}>View Issues</Button></div>}]} empty="Select assets from the queue to review them." /></div><ul className="creation-review-cards" aria-label="Paused batch review">{selectedAssets.map(asset=><li key={asset.id}><div className="creation-review-card__status"><strong>Validation</strong><Badge variant={creationIssues(asset).length?"error":"neutral"}>{permission?"Permission needed":statusText(asset)}</Badge><Button variant="quiet" aria-label={`View Issues for ${asset.name}`} onClick={event=>{detailTriggerRef.current=event.currentTarget;setIssueAsset(asset)}}>View Issues</Button></div><div><strong>{asset.name}</strong><p>{asset.variants[asset.activeVariant].headline}</p><p>{asset.variants[asset.activeVariant].primary}</p></div><div><strong>Destination</strong><p className="creation-url">{destinationUrl(asset.destination)||"Destination missing"}</p></div><div><strong>Meta Setup</strong><p>{asset.meta.campaign} · {asset.meta.adSet}</p><p>{asset.meta.page} · {asset.meta.instagram}</p><p>{asset.meta.objective} · GBP {asset.meta.budget} {asset.meta.budgetType.toLowerCase()}</p></div></li>)}</ul>
        <Checkbox id="creation-reviewed" name="creation-reviewed" label="I reviewed this paused batch" checked={acknowledged} disabled={disabled||permission} onChange={event=>setAcknowledged(event.target.checked)} />
        {validating&&<div ref={validationRef} tabIndex={-1} role="region" aria-label="Batch validation" className="creation-validation"><h3>Check This Batch Before Sending</h3><ul>{!selected.length&&<li>Select at least one asset.</li>}{!acknowledged&&<li>Confirm the paused-only review.</li>}{problems.map((issue,index)=><li key={index}>{issue.asset.name}: {issue.message}</li>)}</ul><Button variant="secondary" onClick={returnToFirstIssue}>Return to Editor</Button></div>}
        <div className="creation-actions"><Button variant="primary" disabled={disabled||permission} onClick={()=>void send()}>Send to Meta as Paused Ad</Button>{selectedAssets.some(asset=>asset.status==="error")&&<Button variant="secondary" disabled={disabled||permission} onClick={()=>void send(true)}>Retry Failed Items</Button>}</div>
        {busy&&<Progress label="Batch sending progress" value={Math.round(sentCount/Math.max(1,sendTotal)*100)} />}
      </section>}
    </>}
    {receipts.length>0&&<section className="creation-receipts"><h2 id="creation-receipt-title" ref={resultRef} tabIndex={-1}>{receipts.length} Paused {receipts.length===1?"Receipt":"Receipts"}</h2><ul>{receipts.map(receipt=><li key={receipt.id}><Badge variant="neutral">PAUSED</Badge><strong>{receipt.snapshot.name}</strong><span>{receipt.id}</span><p>{receipt.snapshot.meta.campaign} / {receipt.snapshot.meta.adSet} · {new Date(receipt.at).toLocaleString()}</p><p>Source: {receipt.snapshot.source?.label||"User-supplied creative"}.</p><Button variant="secondary" onClick={event=>{detailTriggerRef.current=event.currentTarget;setReceiptDetail(receipt)}}>View Receipt for {receipt.snapshot.name}</Button></li>)}</ul></section>}
    <section className="creation-stage-footer" role="region" aria-label="Creation stage actions"><div className="creation-stage-footer__status"><strong>{selected.length} selected</strong><span>Stage {stageIndex+1} of {stages.length} · {stages[stageIndex].label}</span></div><div className="creation-stage-footer__actions"><Button ref={saveRef} icon={<Save />} variant="secondary" disabled={disabled} onClick={save}>Save Draft</Button><Button icon={<ArrowLeft />} variant="quiet" disabled={stageIndex===0} onClick={()=>updateParams({step:stages[stageIndex-1].value})}>Previous</Button><Button trailingIcon={<ArrowRight />} disabled={stageIndex===stages.length-1} onClick={()=>updateParams({step:stages[stageIndex+1].value})}>Next</Button></div></section>
    </>}
    <Toast open={Boolean(message)} onOpenChange={open=>{if(!open)setMessage("")}} title={message} returnFocusRef={saveRef} />
    <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();if(removed)queueRef.current?.focus();else removeRef.current?.focus()}}><AlertDialogTitle>Remove Selected Assets?</AlertDialogTitle><AlertDialogDescription>This removes {selected.length} rows from this batch. Saved receipts and original library ads remain unchanged.</AlertDialogDescription><AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep Assets</Button></AlertDialogCancel><Button variant="destructive" onClick={()=>{change({...draft,assets:draft.assets.filter(asset=>!selected.includes(asset.id))});setSelected([]);setActiveId("");setRemoved(true);setConfirmRemove(false)}}>Remove Assets</Button></AlertDialogActions></AlertDialogContent></AlertDialog>
    <Sheet open={Boolean(issueAsset)} onOpenChange={open=>{if(!open)setIssueAsset(null)}}><SheetContent className="creation-detail-sheet" side="right" onCloseAutoFocus={event=>{event.preventDefault();detailTriggerRef.current?.focus()}}><SheetTitle>Issues for {issueAsset?.name}</SheetTitle><SheetDescription>Review each blocking issue and return to the exact editor field.</SheetDescription>{issueAsset && (creationIssues(issueAsset).length?<ul className="creation-issue-list">{creationIssues(issueAsset).map((issue,index)=><li key={`${issue.field}-${index}`}><strong>{issueStage[issue.field]==="creative"?"Creative Preview":issueStage[issue.field]==="setup"?"Meta Setup":"Assets & Copy"}</strong><span>{issue.message}</span><Button variant="secondary" onClick={()=>{setIssueAsset(null);setActiveId(issueAsset.id);setPendingFocus(issueControl[issue.field]||"creation-queue-title");updateParams({step:issueStage[issue.field]||"copy"})}}>Fix This Issue</Button></li>)}</ul>:<StatePanel title="Ready to Send" description="No blocking issues are recorded for this row." />)}</SheetContent></Sheet>
    <Sheet open={Boolean(receiptDetail)} onOpenChange={open=>{if(!open)setReceiptDetail(null)}}><SheetContent className="creation-detail-sheet" side="right" onCloseAutoFocus={event=>{event.preventDefault();detailTriggerRef.current?.focus()}}><SheetTitle>Paused Receipt: {receiptDetail?.snapshot.name}</SheetTitle><SheetDescription>Immutable local fixture record. The ad remains paused and nothing was published.</SheetDescription>{receiptDetail&&<dl className="creation-receipt-detail"><div><dt>Status</dt><dd>{receiptDetail.status}</dd></div><div><dt>Receipt ID</dt><dd>{receiptDetail.id}</dd></div><div><dt>Created</dt><dd>{new Date(receiptDetail.at).toLocaleString()}</dd></div><div><dt>Campaign / Ad Set</dt><dd>{receiptDetail.snapshot.meta.campaign} / {receiptDetail.snapshot.meta.adSet}</dd></div><div><dt>Destination</dt><dd>{destinationUrl(receiptDetail.snapshot.destination)||"Not recorded"}</dd></div><div><dt>{receiptDetail.snapshot.source?"Source Ad ID":"Source"}</dt><dd>{receiptDetail.snapshot.source?.adId||"User-supplied creative"}</dd></div>{receiptDetail.snapshot.source?.findingId&&<div><dt>Finding ID</dt><dd>{receiptDetail.snapshot.source.findingId}</dd></div>}{receiptDetail.snapshot.source?.propertyId&&<div><dt>Property ID</dt><dd>{receiptDetail.snapshot.source.propertyId}</dd></div>}</dl>}</SheetContent></Sheet>
  </Page>
}

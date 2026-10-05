import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowRight, Check, FileUp, ShieldCheck } from "lucide-react"
import { Button, Combobox, ConnectionStatus, Dropzone, Field, FilePreview, InlineAlert, MetricCell, PageTabs, Progress, StatePanel, TextareaField, UploadProgress, WorkspacePageHeader } from "@/design-system/components"
import { Page } from "@/components/page"
import { addLocalAd, adById, reattachLocalAd, sampleAdIds, type Ad, type UploadContext } from "@/data/ads"
import { appPath } from "@/lib/app-location"
import "@/pages/add-ads.css"

type AddState = "default" | "loading" | "connecting" | "importing" | "partial" | "empty" | "permission" | "error" | "readonly" | "analysing" | "reviewed" | "saved" | "upload-error"
type SelectedFile = { file: File; url: string; dimensions?: { w: number; h: number } }
const emptyContext: UploadContext = { product: "", audience: "", destination: "", notes: "" }
// Preserve an unfinished queue across app navigation, but never persist binary URLs.
const uploadDrafts = new Map<string,{selected:SelectedFile[];context:UploadContext}>()
if(typeof window!=="undefined")window.addEventListener("beforeunload",event=>{
  if([...uploadDrafts.values()].some(draft=>draft.selected.length)){event.preventDefault();event.returnValue=""}
})

export function AddAds() {
  const [params] = useSearchParams()
  // A different record owns a different queue, refs, pending timers and save result.
  return <AddAdsDraft key={params.get("replace") || "new"} />
}

function AddAdsDraft() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") === "meta" ? "meta" : "upload"
  const fixtureState = (params.get("state") || "default") as AddState
  const replaceId = params.get("replace")
  const replacement = replaceId ? adById(replaceId) : undefined
  const canReplace = !!replacement && replacement.id.startsWith("upload-") && !replacement.scaleFixture
  const [connected, setConnected] = useState(() => localStorage.getItem("butterfly-meta-connected") === "true")
  const configured = connected || localStorage.getItem("butterfly-meta-ever-configured") === "true"
  const [account, setAccount] = useState("")
  const [selected, setSelected] = useState<SelectedFile[]>(()=>uploadDrafts.get(replaceId || "new")?.selected || [])
  const [uploaded, setUploaded] = useState<Ad[]>([])
  const [context, setContext] = useState<UploadContext>(()=>replacement?.uploadContext || uploadDrafts.get(replaceId || "new")?.context || emptyContext)
  const [preparing, setPreparing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const draftUrls = useRef<string[]>(selected.map(item=>item.url))
  const generation = useRef(0)
  const restricted = fixtureState === "readonly" || fixtureState === "permission"
  const setFixtureState = (state: AddState) => {
    const next = new URLSearchParams(params)
    if (state === "default") next.delete("state")
    else next.set("state", state)
    setParams(next)
  }

  useEffect(()=>{uploadDrafts.set(replaceId || "new",{selected,context})},[selected,context,replaceId])
  useEffect(() => () => { generation.current++ }, [])
  useEffect(() => {
    if (tab !== "meta" || (fixtureState !== "connecting" && fixtureState !== "importing")) return
    const timer = window.setTimeout(() => {
      if (fixtureState === "connecting") setFixtureState("importing")
      else {
        try { localStorage.setItem("butterfly-meta-connected", "true"); localStorage.setItem("butterfly-meta-ever-configured", "true"); localStorage.setItem("butterfly-meta-account", "kindred"); setConnected(true); setFixtureState("default") }
        catch { setFixtureState("error") }
      }
    }, fixtureState === "connecting" ? 500 : 800)
    return () => window.clearTimeout(timer)
  }, [fixtureState, tab])

  useEffect(() => {
    if (!saving || !selected.length) return
    const timer = window.setTimeout(() => {
      try {
        const ads = selected.map(item=>canReplace ? reattachLocalAd(replaceId!,item.file,item.url,item.dimensions) : addLocalAd(item.file, item.url, item.dimensions, context))
        draftUrls.current = [] // The saved ads now own the session URLs.
        uploadDrafts.delete(replaceId || "new")
        setUploaded(ads); setSelected([]); setContext(emptyContext); setSaving(false); setFixtureState("saved")
      } catch { setSaving(false); setError("The file record could not be saved. Check browser storage and try again.") }
    }, 550)
    return () => window.clearTimeout(timer)
  }, [saving, selected, context])

  function clearSelection() {
    generation.current++
    draftUrls.current.forEach(url=>URL.revokeObjectURL(url))
    draftUrls.current = []
    setSelected([]); setPreparing(false); setError("")
  }

  async function selectFiles(files: File[]) {
    if (restricted || saving) return
    clearSelection()
    const current = generation.current
    setPreparing(true)
    const results:SelectedFile[]=[]
    for(const file of files){
      if(generation.current!==current)return
      if (!(/^(image|video)\//.test(file.type) || file.type === "application/pdf")) { setError("Choose an image, video or PDF."); continue }
      if (!file.size) { setError("Choose a file that is not empty."); continue }
      if (file.size > 100 * 1024 * 1024) { setError("Choose a file smaller than 100 MB."); continue }
      const url = URL.createObjectURL(file);draftUrls.current.push(url)
      let dimensions: SelectedFile["dimensions"]
      if (file.type.startsWith("image/")) dimensions = await new Promise(resolve => { const image=new Image();image.onload=()=>resolve({w:image.naturalWidth,h:image.naturalHeight});image.onerror=()=>resolve(undefined);image.src=url })
      if (file.type.startsWith("video/")) dimensions = await new Promise(resolve => { const video=document.createElement("video");video.onloadedmetadata=()=>resolve({w:video.videoWidth,h:video.videoHeight});video.onerror=()=>resolve(undefined);video.src=url })
      if (file.type !== "application/pdf" && !dimensions) { URL.revokeObjectURL(url);draftUrls.current=draftUrls.current.filter(item=>item!==url);setError("This media could not be previewed. Choose another file.");continue }
      results.push({file,url,dimensions})
    }
    if (generation.current !== current) return
    setPreparing(false);setSelected(results);setUploaded([])
  }

  function removeSelection(url:string){URL.revokeObjectURL(url);draftUrls.current=draftUrls.current.filter(item=>item!==url);setSelected(items=>items.filter(item=>item.url!==url))}

  function confirmUpload() {
    if (!selected.length || saving || preparing || restricted || (replaceId && !canReplace)) return
    if (context.destination) {
      try { const url = new URL(context.destination); if (!/^https?:$/.test(url.protocol)) throw new Error() }
      catch { setError("Enter a full http or https destination URL, or leave it blank."); document.getElementById("upload-destination")?.focus(); return }
    }
    setError(""); setSaving(true)
  }

  function createFromFiles() {
    if (!selected.length && !uploaded.length) return
    try {
      const ads = uploaded.length ? uploaded : selected.map(item=>addLocalAd(item.file, item.url, item.dimensions, context))
      if (!uploaded.length) {
        draftUrls.current = [] // The Create Ads batch now owns these live session previews.
        uploadDrafts.delete(replaceId || "new")
        setUploaded(ads)
        setSelected([]);setContext(emptyContext)
      }
      const next = new URLSearchParams({source:"local-upload"})
      ads.forEach(ad=>next.append("upload",ad.id))
      navigate(appPath(`/create?${next}`))
    } catch { setError("The file batch could not be prepared. Check browser storage and try again.") }
  }

  function importSample() {
    try { localStorage.setItem("butterfly-meta-connected", "true"); localStorage.setItem("butterfly-meta-ever-configured", "true"); localStorage.setItem("butterfly-meta-account", "kindred"); setConnected(true); navigate(appPath("/ads")) }
    catch { setFixtureState("error") }
  }
  const retry = <Button variant="secondary" onClick={() => setFixtureState("default")}>Try Again</Button>
  const contextField = (key: keyof UploadContext, value: string) => setContext(current => ({...current,[key]:value}))

  return <Page className="add-ads-page">
    <WorkspacePageHeader title="Add Ads" breadcrumb={[{label:"Kindred",href:appPath("/ads")},{label:"Add Ads"}]} description="Bring existing creative into Butterfly through a local upload or the Kindred sample account." actions={connected ? <Button asChild variant="secondary"><Link to={appPath("/ads")}>View My Ads</Link></Button> : undefined} />
    <PageTabs label="Ad source" queryParam="tab" activeValue={tab} items={[{value:"upload",label:"Upload"},{value:"meta",label:"Connect Meta"}]} />
    <div className="add-ads-content">
      <div className="add-ads-primary">
      {tab === "meta" ? <section className="add-ads-flow" aria-labelledby="meta-title">
        <div className="add-ads-flow__intro"><p className="add-ads-eyebrow">Sample Source</p><h2 id="meta-title">Bring In Your Meta Ads</h2><p>Choose the Kindred fixture and import its creative and delivery context. Nothing connects to Meta.</p></div>
        {fixtureState === "loading" ? <StatePanel tone="loading" title="Loading Account Access" description="Checking the locally modelled connection state." />
        : configured && !connected ? <StatePanel tone="warning" title="Meta Source Needs Repair" description="This source was configured before and is now disconnected. Reconnect, change the account or repair permissions in Settings." actions={<Button asChild variant="primary"><Link to={appPath("/settings?tab=sources")}>Repair in Settings</Link></Button>} />
        : fixtureState === "permission" ? <StatePanel tone="permission" title="Ad Account Permission Needed" description="This preview account has no permission to read ads." actions={retry} />
        : fixtureState === "readonly" ? <StatePanel tone="permission" title="Connection Is Read-Only" description="Your preview role cannot reconnect or import this source." />
        : fixtureState === "empty" ? <StatePanel tone="empty" title="No Ads in This Account" description="This sample account contains no creative." actions={retry} />
        : fixtureState === "error" ? <StatePanel tone="error" title="Could Not Import Ads" description="The sample connection could not be saved. Existing ads are unchanged." actions={<Button variant="secondary" onClick={()=>setFixtureState("connecting")}>Retry Connection</Button>} />
        : fixtureState === "connecting" || fixtureState === "importing" ? <ConnectionStatus state={fixtureState} title={fixtureState === "connecting" ? "Connecting to Kindred" : "Importing Sample Creative"} description="Local sample account only." progress={fixtureState === "importing" ? 58 : undefined} />
        : fixtureState === "partial" ? <ConnectionStatus state="partial" title="Import Preview with Gaps" description="The import is incomplete, but the available sample creative is ready to review." actions={<Button variant="primary" onClick={importSample}>Open Available Ads</Button>} />
        : connected ? <ConnectionStatus state="ready" title="Kindred Is Ready" description={`${sampleAdIds.length} sample ads are available in My Ads.`} actions={<div className="add-ads-actions"><Button asChild variant="primary"><Link to={appPath("/ads")}>Open Library</Link></Button><Button variant="secondary" asChild><Link to={appPath("/settings?tab=sources")}>Manage Source</Link></Button></div>} />
        : <><Combobox label="Meta Ad Account" value={account} onValueChange={setAccount} placeholder="Search sample accounts" searchPlaceholder="Search accounts…" options={[{value:"kindred",label:"Kindred · 3 ads · Full access"},{value:"empty",label:"Kindred Archive · 0 ads · Full access"},{value:"restricted",label:"Kindred Europe · Permission required"}]} hint="Only accounts this fixture identity can discover are listed. Selecting one does not contact Meta." /><InlineAlert title="What Butterfly Will Read">Creative, placement and delivery fields are represented by local fixtures. Butterfly never receives billing access or publishing permission in this demo.</InlineAlert>{account && account!=="restricted" ? <div className="add-ads-summary"><div className="add-ads-mini-photo" aria-hidden="true" /><div><strong>{account==="kindred"?"Kindred":"Kindred Archive"}</strong><span>Sample Meta account</span><small>{account==="kindred"?sampleAdIds.length:0} ads available</small></div></div> : null}<div className="add-ads-actions"><Button variant="primary" disabled={!account} trailingIcon={<ArrowRight />} onClick={()=>setFixtureState(account === "empty" ? "empty" : account === "restricted" ? "permission" : "connecting")}>Continue</Button></div></>}
      </section> : <section className="add-ads-flow" aria-labelledby="upload-title">
        <div className="add-ads-flow__intro"><p className="add-ads-eyebrow">Local Upload</p><h2 id="upload-title">{replaceId ? "Reattach Creative Media" : "Add a Creative"}</h2><p>{canReplace ? `Choose the original file for ${replacement.name || replacement.product}. Its library identity, notes and groups are preserved.` : "Preview an image, video or PDF, add useful context, then place it in your library."}</p></div>
        {restricted ? <StatePanel tone="permission" title="Uploading Is Not Allowed" description="Your preview role can view creative but cannot add files." />
        : replaceId && !canReplace ? <StatePanel tone="error" title="Upload Record Unavailable" description="This link no longer identifies a saved local upload." actions={<Button asChild variant="primary"><Link to={appPath("/ads")}>Return to My Ads</Link></Button>} />
        : fixtureState === "upload-error" ? <StatePanel tone="error" title="Upload Failed" description="This sample error has not changed your library." actions={retry} />
        : saving ? <div className="add-ads-progress"><UploadProgress name={`${selected.length} creative${selected.length===1?"":"s"}`} value={64} /><p>Saving local file records. JEV analysis remains not run.</p></div>
        : fixtureState === "analysing" || fixtureState === "partial" || fixtureState === "reviewed" ? <UploadAnalysisPreview state={fixtureState} name={selected[0]?.file.name ?? uploaded[0]?.name} context={context} onNext={()=>setFixtureState(fixtureState === "analysing" ? "partial" : fixtureState === "partial" ? "reviewed" : uploaded.length ? "saved" : "default")} />
        : fixtureState === "saved" ? <><StatePanel tone="success" title={uploaded.length && canReplace ? "Media Reattached" : uploaded.length===1?"Creative Added":"Creatives Added"} description={uploaded.length ? canReplace ? "The original library record now has session media. Its notes, groups and context are unchanged." : `${uploaded.length} file record${uploaded.length===1?" is":"s are"} saved locally. JEV analysis has not run; media previews last for this session.` : "This completed-state preview did not add a new file. Open your library to see saved records."} actions={<div className="add-ads-actions"><Button asChild variant="primary"><Link to={appPath(uploaded.length===1 ? `/ads/${uploaded[0].id}` : "/ads")}>{uploaded.length===1 ? "Open Ad" : "Open Library"}</Link></Button>{uploaded.length>0 && <Button variant="secondary" onClick={createFromFiles}>Create Ads From Files</Button>}<Button variant="quiet" onClick={()=>setFixtureState("analysing")}>Preview Analysis States</Button></div>} /><MetricCell label="Meta delivery" missingReason="No Meta delivery data: these local files are not linked to delivered ads." /></>
        : <><Dropzone label="Choose creatives" multiple={!replaceId} accept="image/*,video/*,application/pdf" selectedCount={selected.length} hint="Images, videos or PDFs · up to 100 MB each" onFiles={files=>void selectFiles(files)} />
          {preparing ? <UploadProgress name="Preparing preview" /> : null}
          {selected.length ? <><div className="add-ads-queue" aria-label="File queue">{selected.map(item=><div key={item.url}><FilePreview name={item.file.name} src={item.url} mediaType={item.file.type === "application/pdf" ? "document" : item.file.type.startsWith("video/") ? "video" : "image"} onRemove={()=>removeSelection(item.url)} description={<p>{Math.max(1,Math.round(item.file.size/1024))} KB · ready for this batch</p>} />{item.file.type === "application/pdf" ? <a href={item.url} target="_blank" rel="noreferrer">Open {item.file.name}</a> : null}</div>)}</div>{!canReplace && <fieldset className="add-ads-context"><legend>Shared Batch Context</legend><Field label="Product (optional)" value={context.product} onChange={event=>contextField("product",event.target.value)} /><Field label="Audience (optional)" value={context.audience} onChange={event=>contextField("audience",event.target.value)} /><Field id="upload-destination" label="Destination URL (optional)" type="url" value={context.destination} onChange={event=>contextField("destination",event.target.value)} /><TextareaField label="Notes (optional)" value={context.notes} onChange={event=>contextField("notes",event.target.value)} /></fieldset>}<div className="add-ads-actions"><Button variant="primary" onClick={confirmUpload} disabled={preparing}>{canReplace ? "Reattach Media" : `Add ${selected.length===1?"to Library":`${selected.length} to Library`}`}</Button>{!canReplace && <Button variant="secondary" onClick={createFromFiles}>Create Ads From Files</Button>}</div><p className="add-ads-note">This queue stays available while you browse the app. Save to keep its record and context after reload; the original media will need reattaching.</p></> : null}
          {error ? <InlineAlert tone="error" title="File Not Added">{error}</InlineAlert> : null}
        </>}
      </section>}
      </div>
      <aside className="add-ads-guide" aria-label="Add Ads guidance">
        <div className="add-ads-guide__icon" aria-hidden="true">{tab === "upload" ? <FileUp /> : <ShieldCheck />}</div>
        <p className="add-ads-eyebrow">{tab === "upload" ? "Local Creative" : "Sample Account"}</p>
        <h2>{tab === "upload" ? "What Gets Added" : "What the Import Includes"}</h2>
        <ul>
          {(tab === "upload" ? ["Original media for this browser session", "Product, audience and destination context", "A library record ready for review"] : ["Three Kindred sample ads", "Placement and delivery fixtures", "Sample JEV findings for the walkthrough"]).map(item=><li key={item}><Check aria-hidden="true" />{item}</li>)}
        </ul>
        <p>{tab === "upload" ? "The file record persists locally. Reattach the original media after a reload." : "This is a guided fixture. No OAuth, live sync or Meta account changes occur."}</p>
      </aside>
    </div>
  </Page>
}

function UploadAnalysisPreview({ state, name, context, onNext }: { state: "analysing" | "partial" | "reviewed"; name?: string; context: UploadContext; onNext: () => void }) {
  const states = {
    analysing: {title:"Analysis Progress Preview",tone:"loading",description:"This fixture demonstrates analysis progress separately from saving your file."},
    partial: {title:"Partial Analysis Preview",tone:"warning",description:"Input metadata is available. Creative interpretation remains unavailable in this local fixture."},
    reviewed: {title:"Reviewed Result Preview",tone:"success",description:"The fixture review is complete. Available input is shown below; this does not create or confirm JEV findings."},
  } as const
  const current = states[state]
  return <section className="add-ads-flow" aria-label="Upload analysis fixture">
    <StatePanel title={current.title} tone={current.tone} description={current.description} />
    {state === "analysing" ? <Progress label="Fixture analysis progress" value={35} /> : <dl><dt>File metadata</dt><dd>{name ?? "No file selected for this preview"}</dd><dt>Product context · user input</dt><dd>{context.product || "Not provided"}</dd>{state === "reviewed" ? <><dt>Audience context · user input</dt><dd>{context.audience || "Not provided"}</dd><dt>Notes · user input</dt><dd>{context.notes || "Not provided"}</dd></> : null}</dl>}
    <p>Creative findings remain unavailable; no analysis service has run.</p>
    <MetricCell label="Meta delivery" missingReason="No Meta delivery data: this local file is not linked to a delivered ad." />
    <Button variant="secondary" onClick={onNext}>{state === "analysing" ? "Show Partial Result" : state === "partial" ? "Review Preview Result" : "Back to Upload"}</Button>
  </section>
}

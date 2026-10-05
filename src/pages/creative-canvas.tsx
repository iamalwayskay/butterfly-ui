import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Focus, Lightbulb, Maximize2, Plus, ZoomIn, ZoomOut } from "lucide-react"
import { AlertDialog, AlertDialogActions, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, Badge, Button, Field, StatePanel, TextareaField, WorkspacePageHeader } from "@/design-system/components"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Page } from "@/components/page"
import { visibleAds } from "@/data/ads"
import { appPath } from "@/lib/app-location"
import "@/pages/creative-canvas.css"

type BoardNote = { id: string; title: string; body: string; tone: "pink" | "blue" | "paper" }

const startingNotes: BoardNote[] = [
  { id: "hook", title: "Opening Test", body: "Keep the product in frame at 0:00. Test the spoken hook, not the visual reveal.", tone: "pink" },
  { id: "proof", title: "Proof Gap", body: "The serum still life needs a visible result or texture demonstration before the CTA.", tone: "paper" },
  { id: "batch", title: "Next Batch", body: "One control, two opening lines, one hands-first variation.", tone: "blue" },
]
const storageKey = "butterfly:canvas:v1"
type BoardState = { notes: BoardNote[]; zoom: number; selected: string }
function readBoard(): BoardState {
  const fallback = { notes: startingNotes, zoom: 100, selected: "" }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null")
    if (!saved || !Array.isArray(saved.notes) || !saved.notes.every((note: BoardNote) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.body === "string" && ["pink", "blue", "paper"].includes(note.tone))) return fallback
    return { notes: saved.notes, zoom: Number.isFinite(saved.zoom) ? Math.max(28, Math.min(112, saved.zoom)) : 100, selected: typeof saved.selected === "string" ? saved.selected : "" }
  } catch { return fallback }
}

export function CreativeCanvas() {
  const ads = visibleAds().filter(ad=>!ad.id.startsWith("upload-") && Boolean(ad.name)).slice(-3)
  const [params, setParams] = useSearchParams()
  const [board, setBoard] = useState(readBoard)
  const [saveError, setSaveError] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BoardNote | null>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const addTrigger = useRef<HTMLButtonElement>(null)
  const removeTrigger = useRef<HTMLButtonElement>(null)
  const { zoom, selected } = board
  const notes = ads.length ? board.notes : []
  const objectId = params.get("object")
  const note = notes.find(item => item.id === objectId)
  const creative = ads.find(item => item.id === objectId)
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(board)); setSaveError(false) } catch { setSaveError(true) } }, [board])
  function select(id: string) {
    trigger.current = document.activeElement as HTMLElement
    setBoard(current => ({ ...current, selected: id }))
    const next = new URLSearchParams(params); next.set("object", id); setParams(next, { replace: true })
  }
  function closeInspector() { const next = new URLSearchParams(params); next.delete("object"); setParams(next, { replace: true }) }
  function editNote(patch: Partial<BoardNote>) { setBoard(current => ({ ...current, notes: current.notes.map(item => item.id === objectId ? { ...item, ...patch } : item) })) }
  function setZoom(value: number) { setBoard(current => ({ ...current, zoom: Math.max(28, Math.min(112, value)) })) }
  const addNote = () => {
    const id = `note-${crypto.randomUUID()}`
    setBoard(current => ({ ...current, notes: [...current.notes, { id, title: "New Note", body: "", tone: "paper" }] }))
    select(id)
  }
  return <Page className="canvas-page">
    <WorkspacePageHeader
      title="Creative Canvas"
      breadcrumb={[{label:"Workspace",href:appPath("/ads")},{label:"Creative Canvas"}]}
      description="Review sample creative and save working notes for your next batch."
      metadata={<Badge variant="outline">Local Board</Badge>}
      actions={<><Button variant="secondary" asChild><Link to={appPath("/ads")}>Browse Library</Link></Button><Button ref={addTrigger} icon={<Plus />} onClick={addNote} disabled={!ads.length}>Add Note</Button></>}
    />
    <section className="canvas-workbench" data-empty={!ads.length || undefined} aria-label="Creative planning board">
      <header className="canvas-toolbar">
        <div className="canvas-board-title"><strong>{ads.length ? "Kindred · Opening Tests" : "Creative Board"}</strong><span>{ads.length} Creatives · {notes.length} Notes</span></div>
        <div className="canvas-toolbar__group" aria-label="Zoom controls">
          <Button variant="quiet" size="sm" icon={<ZoomOut />} aria-label="Zoom out" title="Zoom out" disabled={zoom<=28} onClick={()=>setZoom(zoom-8)} />
          <output aria-live="polite">{zoom}%</output>
          <Button variant="quiet" size="sm" icon={<ZoomIn />} aria-label="Zoom in" title="Zoom in" disabled={zoom>=112} onClick={()=>setZoom(zoom+8)} />
          <Button variant="quiet" size="sm" icon={<Maximize2 />} aria-label="Fit board" title="Fit board overview" onClick={()=>setZoom(Math.floor(((viewport.current?.clientWidth || 1080)-68)/1080*100))} />
        </div>
      </header>
      {ads.length ? <div ref={viewport} className="canvas-viewport" tabIndex={0} aria-label="Board overview; select an object to read or edit">
        <p className="canvas-overview-hint">Select a creative or note to inspect its details.</p>
        <div className="canvas-board-shell" style={{"--canvas-zoom":zoom/100,"--canvas-height":`${486+Math.max(1,Math.ceil(notes.length/3))*190}px`,width:1080*zoom/100,height:(486+Math.max(1,Math.ceil(notes.length/3))*190)*zoom/100} as CSSProperties}><div className="canvas-board">
          <div className="canvas-frame canvas-frame--creative">
            <div className="canvas-frame__label"><span>Source Creative</span><Badge variant="outline">Meta Sample</Badge></div>
            <div className="canvas-creative-row">
              {ads.map(ad=><button type="button" key={ad.id} className="canvas-creative" data-selected={selected===ad.id} aria-pressed={selected===ad.id} onClick={()=>select(ad.id)}>
                <img src={ad.poster} width="112" height="199" alt={ad.name || ad.product} />
                <div><strong>{ad.name || ad.product}</strong><span>{ad.placement || "Creative"}</span></div>
              </button>)}
            </div>
          </div>
          <svg className="canvas-connectors" viewBox="0 0 1080 670" preserveAspectRatio="none" aria-hidden="true"><path d="M245 316 C245 382 350 364 350 438"/><path d="M540 316 C540 370 548 378 548 438"/><path d="M835 316 C835 382 741 364 741 438"/></svg>
          <div className="canvas-insight"><Lightbulb aria-hidden="true" /><div><span>Sample JEV Insight</span><strong>Product is visible from the first frame.</strong><small>Opening · First Product Appearance · 97% confidence</small></div></div>
          <div className="canvas-notes">
            {notes.map(note=><button type="button" key={note.id} className={`canvas-note canvas-note--${note.tone}`} data-selected={selected===note.id} aria-pressed={selected===note.id} onClick={()=>select(note.id)}><span>{note.title || "Untitled Note"}</span><p>{note.body || "Select to add text."}</p></button>)}
          </div>
          <div className="canvas-focus"><Focus aria-hidden="true" /><span>Decision</span><strong>Build three opening variants around the same first-frame proof.</strong></div>
        </div></div>
      </div> : <StatePanel tone="empty" title="No Source Creatives" description="Connect the sample account to start this board." actions={<Button asChild><Link to={appPath("/add")}>Add Ads</Link></Button>} />}
      <footer className="canvas-status"><span role="status"><i />{saveError ? "Changes could not be saved in this browser." : "Saved in This Browser"}</span>{ads.length ? <Button variant="primary" asChild><Link to={appPath(`/create?sourceAds=${ads.map(ad=>ad.id).join(",")}`)}>Create This Batch</Link></Button> : null}</footer>
    </section>
    <Sheet open={Boolean(note || creative)} onOpenChange={open=>{if(!open&&!pendingDelete)closeInspector()}}><SheetContent className="canvas-object-sheet" onCloseAutoFocus={event=>{event.preventDefault();const target=trigger.current;requestAnimationFrame(()=>{if(target?.isConnected)target.focus();else addTrigger.current?.focus()})}}><SheetTitle>Board Object</SheetTitle><SheetDescription>{note ? "Your note is saved in this browser as you type." : "Meta sample creative"}</SheetDescription>{note ? <><Field label="Note Title" value={note.title} onChange={event=>editNote({title:event.target.value})} /><TextareaField id="canvas-note-text" label="Note Text" value={note.body} onChange={event=>editNote({body:event.target.value})} /><Button ref={removeTrigger} variant="destructive" onClick={()=>setPendingDelete(note)}>Remove Note</Button></> : creative ? <><h2>{creative.name}</h2><img src={creative.poster} alt={creative.name} /><p>{creative.placement}</p><Button asChild><Link to={appPath(`/ads/${creative.id}`)}>Open Ad</Link></Button></> : null}{saveError ? <p role="alert">Changes could not be saved. Keep this page open to retain your note.</p> : null}</SheetContent></Sheet>
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open=>{if(!open)setPendingDelete(null)}}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();removeTrigger.current?.focus()}}><AlertDialogTitle>Remove Note?</AlertDialogTitle><AlertDialogDescription>This removes “{pendingDelete?.title || "Untitled Note"}” from this browser-local board. This cannot be undone.</AlertDialogDescription><AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep Note</Button></AlertDialogCancel><Button variant="destructive" onClick={()=>{if(!pendingDelete)return;setBoard(current=>({...current,notes:current.notes.filter(item=>item.id!==pendingDelete.id),selected:""}));setPendingDelete(null);closeInspector();requestAnimationFrame(()=>addTrigger.current?.focus())}}>Remove Note</Button></AlertDialogActions></AlertDialogContent></AlertDialog>
  </Page>
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowRight, Cloud, FileUp, LogOut, Pencil, Plus, RefreshCw, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogActions, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogCancel, Banner, Toast,
  Button,
  Combobox,
  ConnectionStatus,
  Field,
  InlineAlert,
  PageTabs,
  SelectField,
  StatePanel,
  WorkspacePageHeader,
  IconButton, Switch, TextareaField,
} from "@/design-system/components";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { filterAnalysisProperties, getAnalysisProperties, readAnalysisProperties, removeAnalysisOverride, reorderAnalysisProperty, resetAnalysisProperties, saveAnalysisProperty, type AnalysisPropertyDefinition } from "@/lib/analysis-properties";
import { Page } from "@/components/page";
import { appPath } from "@/lib/app-location";
import { signOutFixtureSession } from "@/lib/fixture-auth";
import { readStored, readWorkspace, saveWorkspaceDefaults } from "@/lib/support-storage";
import "@/pages/support.css";

type SettingsTab = "sources" | "workspace" | "profile" | "analysis-properties";
type SourceAccount = "kindred" | "archive" | "europe";
const sourceAccounts: Record<SourceAccount, { name: string; status: string; scope: string; lastSync: string }> = {
  kindred: { name: "Kindred", status: "Sample Source Ready", scope: "3 sample ads", lastSync: "Fixture data · 12:09" },
  archive: { name: "Kindred Archive", status: "No Ads Available", scope: "0 sample ads", lastSync: "Fixture data · no ads" },
  europe: { name: "Kindred Europe", status: "Permission Required", scope: "Sample ads unavailable", lastSync: "Permission repair needed" },
};
const workspaceDraftKey = "butterfly-workspace-draft";
type WorkspaceValues = { name: string; range: string; metric: string };

function readWorkspaceDraft(saved: WorkspaceValues): WorkspaceValues | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(workspaceDraftKey) || "null") as (WorkspaceValues & { saved: WorkspaceValues }) | null;
    if (!draft || draft.saved.name !== saved.name || draft.saved.range !== saved.range || draft.saved.metric !== saved.metric) return null;
    return {name:draft.name,range:draft.range,metric:draft.metric};
  } catch { return null; }
}

function storedSourceAccount(): SourceAccount {
  const saved = readStored("butterfly-meta-account");
  return saved === "archive" || saved === "europe" ? saved : "kindred";
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tab: SettingsTab =
    params.get("tab") === "workspace" || params.get("tab") === "profile" || params.get("tab") === "analysis-properties"
      ? (params.get("tab") as SettingsTab)
      : "sources";
  const fixtureState = params.get("state") || "default";
  const readOnly = fixtureState === "readonly" || fixtureState === "permission";
  const initialSaved = useRef(readWorkspace()).current;
  const initialDraft = useRef(readWorkspaceDraft(initialSaved)).current;
  const [savedName, setSavedName] = useState(initialSaved.name);
  const [savedRange, setSavedRange] = useState(initialSaved.range);
  const [savedMetric, setSavedMetric] = useState(initialSaved.metric);
  const [workspace, setWorkspace] = useState(initialDraft?.name ?? initialSaved.name);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failure"
  >(fixtureState === "save-failure" ? "failure" : "idle");
  const [range, setRange] = useState(initialDraft?.range ?? initialSaved.range);
  const [metric, setMetric] = useState(initialDraft?.metric ?? initialSaved.metric);
  const imported = readStored("butterfly-meta-connected") === "true";
  const [signOutError, setSignOutError] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const saveActionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(saveTimer.current), [fixtureState]);
  const workspaceDirty = workspace.trim() !== savedName || range !== savedRange || metric !== savedMetric;
  useEffect(() => {
    try {
      if (workspaceDirty) sessionStorage.setItem(workspaceDraftKey,JSON.stringify({name:workspace,range,metric,saved:{name:savedName,range:savedRange,metric:savedMetric}}));
      else sessionStorage.removeItem(workspaceDraftKey);
    } catch { /* The visible form remains the source of truth if session storage is unavailable. */ }
  },[workspace,range,metric,savedName,savedRange,savedMetric,workspaceDirty]);
  useEffect(() => {
    if (!workspaceDirty) return;
    const guard = (event: BeforeUnloadEvent) => {event.preventDefault();event.returnValue=""};
    window.addEventListener("beforeunload",guard);
    return () => window.removeEventListener("beforeunload",guard);
  },[workspaceDirty]);
  const workspaceError = !workspace.trim()
    ? "Enter a workspace name."
    : workspace.trim().length < 2
      ? "Use at least two characters."
      : undefined;

  function saveWorkspace() {
    if (workspaceError || readOnly) return;
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const next = workspace.trim();
      if (!saveWorkspaceDefaults({name:next,range,metric})) { setSaveState("failure");return; }
      setSavedName(next);
      setSavedRange(range);
      setSavedMetric(metric);
      setSaveState("saved");
    }, 350);
  }
  function resetWorkspace() {
    window.clearTimeout(saveTimer.current);
    setWorkspace(savedName);
    setRange(savedRange);
    setMetric(savedMetric);
    setSaveState("idle");
  }

  return (
    <Page className="support-page settings-page">
      <WorkspacePageHeader
        title="Settings"
        breadcrumb={[
          { label: savedName, href: appPath("/ads") },
          { label: "Settings" },
        ]}
        description="Manage connected sources, workspace defaults and your profile."
      />
      <PageTabs
        label="Settings sections"
        queryParam="tab"
        activeValue={tab}
        items={[
          { value: "sources", label: "Sources" },
          { value: "analysis-properties", label: "Analysis Properties" },
          { value: "workspace", label: "Workspace" },
          { value: "profile", label: "Profile" },
        ]}
      />
      <div className="support-tab-body">
        {tab === "sources" ? (
          <Sources imported={imported} state={fixtureState} />
        ) : tab === "analysis-properties" ? (
          <AnalysisProperties state={fixtureState} />
        ) : tab === "workspace" ? (
          <div className="settings-composition">
          <section className="support-section settings-composition__main" aria-labelledby="workspace-title">
            <div className="support-section__head">
              <div>
                <p className="support-eyebrow">Workspace Defaults</p>
                <h2 id="workspace-title">Workspace Identity and Defaults</h2>
              </div>
            </div>
            {readOnly ? (
              <Banner tone="permission" title="Workspace Is Read-Only">
                You can review these defaults but your fixture role cannot save
                changes.
              </Banner>
            ) : null}
            <div className="support-fields">
              <Field
                label="Workspace name"
                value={workspace}
                disabled={readOnly || saveState === "saving"}
                error={workspaceError}
                onChange={(event) => {
                  setWorkspace(event.target.value);
                  setSaveState("idle");
                }}
              />
              <div className="support-field-row">
                <SelectField
                  label="Default date range"
                  value={range}
                  disabled={readOnly || saveState === "saving"}
                  onChange={(event) => {
                    setRange(event.target.value);
                    setSaveState("idle");
                  }}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </SelectField>
                <SelectField
                  label="Card metric"
                  value={metric}
                  disabled={readOnly || saveState === "saving"}
                  onChange={(event) => {
                    setMetric(event.target.value);
                    setSaveState("idle");
                  }}
                >
                  <option>CPA</option>
                  <option>ROAS</option>
                  <option>Results</option>
                  <option>Spend</option>
                </SelectField>
              </div>
            </div>
            {saveState === "failure" ? (
              <InlineAlert tone="error" title="Settings Were Not Saved">
                Browser storage could not save these changes. Your previous saved defaults remain unchanged; the form still shows your unsaved edits.
              </InlineAlert>
            ) : saveState === "saved" ? (
              <Toast returnFocusRef={saveActionRef} open={saveState === "saved"} onOpenChange={open=>{if(!open)setSaveState("idle")}} title="Workspace settings saved in this browser." />
            ) : null}
            <div className="support-actions">
              <Button
                variant="primary"
                loading={saveState === "saving"}
                disabled={Boolean(workspaceError) || readOnly}
                onClick={saveWorkspace}
                ref={saveActionRef}
              >
                {saveState === "saving" ? "Saving" : "Save Workspace"}
              </Button>
              <Button
                variant="quiet"
                disabled={readOnly}
                onClick={resetWorkspace}
              >
                Reset Changes
              </Button>
            </div>
          </section>
          <aside className="settings-context" aria-label="Workspace default summary">
            <section className="settings-context__inverse">
              <span>Current Workspace</span>
              <strong>{workspace.trim() || "Workspace Name Required"}</strong>
              <p>These browser-local defaults keep the library focused on the delivery view you use most.</p>
            </section>
            <section className="settings-context__facts">
              <h2>Saved Defaults</h2>
              <dl>
                <div><dt>Delivery Window</dt><dd>Last {savedRange} days</dd></div>
                <div><dt>Card Metric</dt><dd>{savedMetric}</dd></div>
                <div><dt>Storage</dt><dd>This browser</dd></div>
              </dl>
            </section>
          </aside>
          </div>
        ) : (
          <div className="settings-composition settings-composition--profile">
          <section className="support-section settings-composition__main" aria-labelledby="profile-title">
            <div className="support-section__head">
              <div>
                <p className="support-eyebrow">Signed-In Identity</p>
                <h2 id="profile-title">Your Profile</h2>
              </div>
            </div>
            <div className="support-profile">
              <span className="support-profile-avatar">D</span>
              <div>
                <strong>Demo Owner</strong>
                <span>owner@kindred.example</span>
                <small>Local fixture identity · display only</small>
              </div>
            </div>
            <p className="support-note">Demo Owner is the sample workspace member, not a verified Google, email or phone identity. Profile editing is unavailable in this local preview.</p>
            {signOutError ? <InlineAlert tone="error">Could not clear the local session. Check browser storage and try again.</InlineAlert> : null}
            <Button variant="secondary" icon={<LogOut />} onClick={()=>{if(signOutFixtureSession())navigate(appPath("/login"));else setSignOutError(true)}}>Sign Out</Button>
          </section>
          <aside className="settings-context" aria-label="Profile access summary">
            <section className="settings-context__inverse">
              <span>Workspace Access</span>
              <strong>Owner</strong>
              <p>Demo Owner can manage access, workspace defaults and every local creative action in {savedName}.</p>
            </section>
            <section className="settings-context__facts">
              <h2>Session Details</h2>
              <dl>
                <div><dt>Identity</dt><dd>Local fixture</dd></div>
                <div><dt>Workspace</dt><dd>{savedName}</dd></div>
                <div><dt>Meta Source</dt><dd>{imported ? "Sample connected" : "Not connected"}</dd></div>
              </dl>
            </section>
          </aside>
          </div>
        )}
      </div>
    </Page>
  );
}

function AnalysisProperties({state}: {state: string}) {
  const [params,setParams]=useSearchParams()
  const [revision,refresh]=useState(0)
  const loaded=readAnalysisProperties(), definitions=getAnalysisProperties()
  const readOnly=loaded.readOnly || state==='readonly' || state==='permission'
  const [editor,setEditor]=useState<Partial<AnalysisPropertyDefinition>|null>(null)
  const [selectedId,setSelectedId]=useState<string>("")
  const [inspecting,setInspecting]=useState(false)
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[resetOpen,setResetOpen]=useState(false)
  const opener=useRef<HTMLElement|null>(null), heading=useRef<HTMLHeadingElement>(null)
  const addRef=useRef<HTMLButtonElement>(null),resetRef=useRef<HTMLButtonElement>(null)
  const editControls=useRef(new Map<string,HTMLButtonElement>())
  const pendingFocus=useRef<{element: HTMLElement;propertyId: string}|null>(null)
  const sheetCloseFocus=useRef<HTMLElement|null>(null)
  const [mobileDetail,setMobileDetail]=useState(()=>window.matchMedia('(max-width: 620px)').matches)
  useEffect(()=>{const query=window.matchMedia('(max-width: 620px)');const update=()=>setMobileDetail(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[])
  useLayoutEffect(()=>{
    const pending=pendingFocus.current
    if(!pending)return
    pendingFocus.current=null
    if(pending.element.isConnected&&!pending.element.matches(':disabled'))pending.element.focus()
    else (editControls.current.get(pending.propertyId)||heading.current)?.focus()
  },[revision])
  const filters={search:params.get('q')||'',category:params.get('category')||'all',origin:params.get('origin')||'all',enabled:params.get('enabled')||'all',valueType:params.get('type')||'all',evidenceRequirement:params.get('evidence')||'all'}
  const filtered=filterAnalysisProperties(definitions,filters)
  const selectedProperty=filtered.find(item=>item.id===selectedId) || filtered[0]
  const selectedGroup=selectedProperty ? definitions.filter(item=>item.category===selectedProperty.category) : []
  const selectedPosition=selectedProperty ? selectedGroup.findIndex(item=>item.id===selectedProperty.id) : -1
  const categories=[...new Set(definitions.map(item=>item.category))]
  function query(key: string,value: string) {setParams(previous=>{const next=new URLSearchParams(previous);if(value && value!=='all')next.set(key,value);else next.delete(key);return next},{replace:true})}
  function changed(success: boolean,message: string,propertyId?: string) {if(!success){setError('Property changes were not saved. Saved definitions and history are unchanged.');return false}if(propertyId)pendingFocus.current={element:document.activeElement as HTMLElement,propertyId};setError('');setNotice(message);refresh(value=>value+1);return true}
  function openEditor(definition?: AnalysisPropertyDefinition) {opener.current=document.activeElement as HTMLElement;setError('');setEditor(definition?{...definition}:{name:'',category:'Custom',description:'',valueType:'text',evidenceRequirement:'required',enabled:true})}
  function save() {
    if(!editor || readOnly)return
    if(!editor.name?.trim() || !editor.category?.trim()){setError('Enter a property name and category.');document.getElementById('analysis-property-name')?.focus();return}
    const input=editor.origin==='standard'?{id:editor.id,name:editor.name,description:editor.description}:editor
    if(changed(saveAnalysisProperty(input),'Property saved in this browser.'))setEditor(null)
    else setError('Could not save. Use a unique name and valid definition; browser storage must be available.')
  }
  const detailBody=selectedProperty?<><p className="support-eyebrow">{selectedProperty.category}</p><p>{selectedProperty.description}</p><dl><div><dt>Origin</dt><dd>{selectedProperty.origin}</dd></div><div><dt>Value Type</dt><dd>{selectedProperty.valueType}</dd></div><div><dt>Evidence</dt><dd>{selectedProperty.evidenceRequirement}</dd></div><div><dt>Status</dt><dd>{selectedProperty.enabled?'Enabled':'Disabled'}</dd></div><div><dt>Order</dt><dd>{selectedPosition+1} of {selectedGroup.length}</dd></div></dl><div className="analysis-property-detail__actions"><Switch label={`Enable ${selectedProperty.name}`} checked={selectedProperty.enabled} disabled={readOnly} onCheckedChange={enabled=>{const willLeaveFilter=(filters.enabled==='true'&&!enabled)||(filters.enabled==='false'&&enabled);if(changed(saveAnalysisProperty({id:selectedProperty.id,enabled}),`${selectedProperty.name} ${enabled?'enabled':'disabled'} for future walkthroughs.`,selectedProperty.id)&&willLeaveFilter){if(heading.current){pendingFocus.current={element:heading.current,propertyId:selectedProperty.id};sheetCloseFocus.current=heading.current}setSelectedId('');setInspecting(false)}}} /><IconButton icon={<ArrowUp />} label={`Move ${selectedProperty.name} up`} variant="quiet" disabled={readOnly||selectedPosition===0} onClick={()=>{if(changed(reorderAnalysisProperty(selectedProperty.id,-1),`Moved ${selectedProperty.name} to position ${selectedPosition} of ${selectedGroup.length}.`,selectedProperty.id)&&mobileDetail)setInspecting(false)}} /><IconButton icon={<ArrowDown />} label={`Move ${selectedProperty.name} down`} variant="quiet" disabled={readOnly||selectedPosition===selectedGroup.length-1} onClick={()=>{if(changed(reorderAnalysisProperty(selectedProperty.id,1),`Moved ${selectedProperty.name} to position ${selectedPosition+2} of ${selectedGroup.length}.`,selectedProperty.id)&&mobileDetail)setInspecting(false)}} /><Button aria-label={`Edit ${selectedProperty.name}`} variant="secondary" icon={<Pencil />} disabled={readOnly} onClick={()=>openEditor(selectedProperty)}>Edit Property</Button>{loaded.data.overrides[selectedProperty.id]?<Button aria-label={`Restore ${selectedProperty.name}`} variant="quiet" icon={<RotateCcw />} disabled={readOnly} onClick={()=>changed(removeAnalysisOverride(selectedProperty.id),'Standard definition restored.',selectedProperty.id)}>Restore</Button>:null}</div></>:null
  return <section className="support-section analysis-properties" aria-labelledby="analysis-properties-title">
    <div className="analysis-properties__head"><div><p className="support-eyebrow">JEV Definitions</p><h2 id="analysis-properties-title" ref={heading} tabIndex={-1}>Analysis Properties</h2><p className="support-note">Choose what future local walkthroughs assess. Existing findings keep their original definitions.</p></div><Button variant="primary" ref={addRef} icon={<Plus />} disabled={readOnly} onClick={()=>openEditor()}>Add Property</Button></div>
    {readOnly?<Banner tone="permission" title={state==='permission'?'Source Permission Required':'Properties Are Read-Only'}>{loaded.reason || (state==='permission'?<>Your fixture lacks source permission. <Link to={appPath('/settings?tab=sources')}>Repair Sources</Link> to restore access.</>:'Your fixture workspace role allows inspection only.')} Search and inspect definitions below.</Banner>:null}
    <div className="analysis-properties__toolbar"><Field label="Search properties" type="search" value={filters.search} onChange={event=>query('q',event.target.value)} /><SelectField label="Filter category" value={filters.category} onChange={event=>query('category',event.target.value)}><option value="all">All categories</option>{categories.map(category=><option key={category}>{category}</option>)}</SelectField><SelectField label="Property origin" value={filters.origin} onChange={event=>query('origin',event.target.value)}><option value="all">Standard and custom</option><option value="standard">Standard</option><option value="custom">Custom</option></SelectField><SelectField label="Enabled state" value={filters.enabled} onChange={event=>query('enabled',event.target.value)}><option value="all">All states</option><option value="true">Enabled</option><option value="false">Disabled</option></SelectField></div>
    <details className="analysis-properties__filters"><summary>More Filters</summary><div className="support-field-row"><SelectField label="Filter value type" value={filters.valueType} onChange={event=>query('type',event.target.value)}><option value="all">All value types</option>{['text','category','number','time','boolean'].map(type=><option key={type}>{type}</option>)}</SelectField><SelectField label="Filter evidence requirement" value={filters.evidenceRequirement} onChange={event=>query('evidence',event.target.value)}><option value="all">Any evidence requirement</option>{['required','optional','none'].map(type=><option key={type}>{type}</option>)}</SelectField></div></details>
    <div className="analysis-properties__summary"><p>{filtered.length} of {definitions.length} properties · {definitions.filter(item=>item.enabled).length} enabled</p><Button ref={resetRef} variant="quiet" icon={<RotateCcw />} disabled={readOnly} onClick={()=>{setError('');setResetOpen(true)}}>Reset to Defaults</Button></div>
    {error&&!editor?<InlineAlert tone="error">{error}</InlineAlert>:null}
    {!mobileDetail?<p role="status" className={notice?"support-status":"sr-only"}>{notice}</p>:null}
    {!filtered.length?<StatePanel title="No Matching Properties" description="Change the search or filters to see more definitions." actions={<Button variant="secondary" onClick={()=>setParams(previous=>{const next=new URLSearchParams(previous);['q','category','origin','enabled','type','evidence'].forEach(key=>next.delete(key));return next})}>Clear Filters</Button>} />:null}
    <div className="analysis-properties__browser">
    <div className="analysis-property-groups" aria-label="Analysis property master list">
      {categories.map(category=>{const rows=filtered.filter(item=>item.category===category);return rows.length?<section className="analysis-property-group" key={category} aria-label={category}><h3>{category}<span>{rows.length}</span></h3><ul>{rows.map(property=><li key={property.id} className="analysis-property-row" data-selected={selectedProperty?.id===property.id}><button ref={node=>{if(node)editControls.current.set(property.id,node);else editControls.current.delete(property.id)}} type="button" className="analysis-property-row__select" aria-label={`Inspect ${property.name}`} onClick={()=>{setSelectedId(property.id);setInspecting(true)}}><strong>{property.name}</strong><small>{property.valueType} · {property.enabled?'Enabled':'Disabled'}</small></button></li>)}</ul></section>:null})}
    </div>
    {selectedProperty&&!mobileDetail?<aside className="analysis-property-detail" aria-label={`${selectedProperty.name} details`}><h3>{selectedProperty.name}</h3>{detailBody}</aside>:null}
    </div>
    {selectedProperty&&mobileDetail?<Sheet open={inspecting} onOpenChange={setInspecting}><SheetContent side="bottom" className="analysis-property-detail analysis-property-sheet" onCloseAutoFocus={event=>{event.preventDefault();const target=sheetCloseFocus.current||editControls.current.get(selectedProperty.id);sheetCloseFocus.current=null;target?.focus()}}><SheetTitle>{selectedProperty.name}</SheetTitle><SheetDescription className="sr-only">Inspect and manage this analysis property.</SheetDescription>{detailBody}<p role="status" className={notice?"support-status":"sr-only"}>{notice}</p></SheetContent></Sheet>:null}
    <p className="support-note">Standard definitions are fixed JEV fixtures. Name and description edits are removable display overrides. Custom properties are browser-local definitions; no analysis service is connected.</p>
    <Dialog open={Boolean(editor)} onOpenChange={open=>{if(!open)setEditor(null)}}><DialogContent className="analysis-property-dialog" onCloseAutoFocus={event=>{event.preventDefault();if(opener.current?.isConnected)opener.current.focus();else addRef.current?.focus()}}><DialogTitle>{editor?.id?'Edit Property':'Add Property'}</DialogTitle><DialogDescription>{editor?.origin==='standard'?'Edit display wording only. Standard identity, category, type and evidence rules remain fixed.':'Create a custom property for future local analysis walkthroughs.'}</DialogDescription>{editor?<form className="support-dialog-form" onSubmit={event=>{event.preventDefault();save()}}><Field id="analysis-property-name" label="Property name" value={editor.name||''} onChange={event=>setEditor({...editor,name:event.target.value})} /><Field label="Category" disabled={editor.origin==='standard'} value={editor.category||''} onChange={event=>setEditor({...editor,category:event.target.value})} /><TextareaField label="Description" value={editor.description||''} onChange={event=>setEditor({...editor,description:event.target.value})} /><div className="support-field-row"><SelectField label="Value type" disabled={editor.origin==='standard'} value={editor.valueType} onChange={event=>setEditor({...editor,valueType:event.target.value as AnalysisPropertyDefinition['valueType']})}>{['text','category','number','time','boolean'].map(type=><option key={type}>{type}</option>)}</SelectField><SelectField label="Evidence requirement" disabled={editor.origin==='standard'} value={editor.evidenceRequirement} onChange={event=>setEditor({...editor,evidenceRequirement:event.target.value as AnalysisPropertyDefinition['evidenceRequirement']})}>{['required','optional','none'].map(type=><option key={type}>{type}</option>)}</SelectField></div>{error?<InlineAlert tone="error">{error}</InlineAlert>:null}<div className="support-actions"><Button variant="primary" type="submit" disabled={readOnly}>Save Property</Button><Button type="button" variant="quiet" onClick={()=>setEditor(null)}>Cancel</Button></div></form>:null}</DialogContent></Dialog>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();resetRef.current?.focus()}}><AlertDialogTitle>Reset Property Definitions?</AlertDialogTitle><AlertDialogDescription>Remove custom properties and restore standard display wording, enabled states and ordering. Ads, analysis attempts, findings, reviews, drafts, versions and outcomes remain unchanged.</AlertDialogDescription>{error?<InlineAlert tone="error">{error}</InlineAlert>:null}<AlertDialogActions><AlertDialogCancel asChild><Button variant="quiet">Keep Changes</Button></AlertDialogCancel><Button variant="destructive" disabled={readOnly} onClick={()=>{if(changed(resetAnalysisProperties(),'Property definitions reset. Historical work is unchanged.'))setResetOpen(false)}}>Reset Properties</Button></AlertDialogActions></AlertDialogContent></AlertDialog>
  </section>
}

function Sources({ imported, state }: { imported: boolean; state: string }) {
  const [connected, setConnected] = useState(imported);
  const [syncing, setSyncing] = useState(false);
  const [changingAccount, setChangingAccount] = useState(false);
  const [sourceAccount, setSourceAccount] = useState<SourceAccount>(storedSourceAccount);
  const [pendingAccount, setPendingAccount] = useState<SourceAccount>(storedSourceAccount);
  const [sourceNotice, setSourceNotice] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const disconnectTriggerRef = useRef<HTMLButtonElement>(null);
  const sourceHeadingRef = useRef<HTMLHeadingElement>(null);
  const disconnectedRef = useRef(false);
  const [disconnectError, setDisconnectError] = useState(false);
  const mutationsDisabled = ["loading","connecting","importing","permission","readonly"].includes(state)
  const account = sourceAccounts[sourceAccount];
  const accountHasAds = sourceAccount === "kindred";
  const accountNeedsPermission = sourceAccount === "europe";
  const sourceState = state === "loading" ? <StatePanel compact tone="loading" title="Refreshing Known Source" description="The last known source remains visible while this local fixture checks its status." />
    : state === "permission" ? <Banner tone="permission" title="Source Permission Needed">Known source details remain visible, but sync and account changes are disabled until permission is repaired. <Link to={appPath("/settings?tab=sources")}>Review repair steps</Link>.</Banner>
    : state === "readonly" ? <Banner tone="permission" title="Source Is Read-Only">You can view its known status, account and ads, but cannot sync, reconnect, disconnect or change account.</Banner>
    : state === "error" ? <ConnectionStatus state="error" title="Sync Failed" description="Known source details and existing ads remain available. This local failure changed nothing." actions={<Button asChild variant="secondary" icon={<RefreshCw />}><Link to={appPath("/settings?tab=sources")}>Retry</Link></Button>} />
    : state === "connecting" ? <ConnectionStatus state="connecting" title="Connecting Source" description="The last known source remains visible while the local fixture checks access." />
    : state === "importing" ? <ConnectionStatus state="importing" title="Importing Ads" description="Known source content remains available while creative and delivery fixtures refresh." progress={63} />
    : state === "partial" ? <ConnectionStatus state="partial" title="Source Partially Synced" description="Creative and known account details are ready. Delivery data is unavailable for one ad." actions={<Button asChild variant="secondary"><Link to={appPath("/ads")}>View Available Ads</Link></Button>} />
    : connected && accountNeedsPermission ? <Banner tone="permission" title="Account Permission Needed">Kindred Europe is still known, but its sample ads and sync actions are unavailable. Choose another account or disconnect this source.</Banner>
    : null
  return (
    <section className="support-section support-section--sources" aria-labelledby="source-title">
      <div className="support-section__head">
        <div>
          <p className="support-eyebrow">Connected Sources</p>
          <h2 id="source-title" ref={sourceHeadingRef} tabIndex={-1}>Creative Sources</h2>
        </div>
        <span>{connected && accountHasAds ? "2 Available" : "1 Available"}</span>
      </div>
      {sourceState}
      {sourceNotice ? <Toast returnFocusRef={sourceHeadingRef} open={Boolean(sourceNotice)} onOpenChange={open=>{if(!open)setSourceNotice("")}} title={sourceNotice} /> : null}
      <div className="support-source-list">
        <article className="support-source-row">
          <div className="support-source-row__identity"><span className="support-source-row__icon"><Cloud aria-hidden="true" /></span><div><p className="support-eyebrow">Meta · Sample Account</p><h3>{account.name}</h3><span>{connected ? state === "partial" ? "Partially Synced" : account.status : "Not Connected"}</span></div></div>
          <dl className="support-source-row__facts"><div><dt>Scope</dt><dd>{connected ? account.scope : "Sample ads hidden"}</dd></div><div><dt>Last Sync</dt><dd>{connected ? account.lastSync : "Not available"}</dd></div></dl>
          <AlertDialogActions>
            {connected ? <>{accountHasAds ? <Button asChild variant="secondary" trailingIcon={<ArrowRight />}><Link to={appPath("/ads")}>View Ads</Link></Button> : null}{!accountNeedsPermission ? <Button disabled={mutationsDisabled} variant="quiet" icon={<RefreshCw />} loading={syncing} onClick={()=>{setSyncing(true);window.setTimeout(()=>{setSyncing(false);setSourceNotice("Sample source synced locally.")},450)}}>{syncing ? "Syncing" : "Sync Now"}</Button> : null}<Button disabled={mutationsDisabled} variant="quiet" onClick={()=>setChangingAccount(value=>!value)}>Choose Another Account</Button><Button disabled={mutationsDisabled} ref={disconnectTriggerRef} variant="quiet" onClick={()=>{disconnectedRef.current=false;setDisconnectError(false);setConfirmDisconnect(true)}}>Disconnect</Button></> : <Button variant="primary" disabled={mutationsDisabled || accountNeedsPermission} onClick={()=>{try{localStorage.setItem("butterfly-meta-connected","true");localStorage.setItem("butterfly-meta-ever-configured","true");setConnected(true);setSourceNotice(`${account.name} sample source reconnected.`)}catch{setSourceNotice("Could not reconnect the sample source.")}}}>Reconnect</Button>}
          </AlertDialogActions>
          {changingAccount && connected ? <div className="support-source-change"><Combobox label="Meta Ad Account" value={pendingAccount} onValueChange={value=>setPendingAccount(value as SourceAccount)} options={[{value:"kindred",label:"Kindred · 3 ads"},{value:"archive",label:"Kindred Archive · 0 ads"},{value:"europe",label:"Kindred Europe · permission required"}]} hint="Search the accounts available to this local fixture identity." /><div><p>Changing account replaces the sample source context shown in this browser. No Meta account is contacted.</p><div className="support-actions"><Button variant="primary" disabled={!pendingAccount || mutationsDisabled} onClick={()=>{try{localStorage.setItem("butterfly-meta-account",pendingAccount)}catch{setSourceNotice("Could not save the sample account. Existing source details are unchanged.");return}setSourceAccount(pendingAccount);setChangingAccount(false);setSourceNotice(`${sourceAccounts[pendingAccount].name} selected locally.`)}}>Apply Account</Button><Button variant="quiet" onClick={()=>{setPendingAccount(sourceAccount);setChangingAccount(false)}}>Cancel</Button></div></div></div> : null}
        </article>
        <article className="support-source-row">
          <div className="support-source-row__identity"><span className="support-source-row__icon"><FileUp aria-hidden="true" /></span><div><p className="support-eyebrow">Browser Storage</p><h3>Local Uploads</h3><span>Available</span></div></div>
          <dl className="support-source-row__facts"><div><dt>Scope</dt><dd>Images, video and PDF</dd></div><div><dt>Persistence</dt><dd>Records only after reload</dd></div></dl>
          <div className="support-actions"><Button asChild variant="secondary"><Link to={appPath("/add?tab=upload")}>Add Creative</Link></Button></div>
        </article>
      </div>
      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();if(disconnectedRef.current)sourceHeadingRef.current?.focus();else disconnectTriggerRef.current?.focus()}}>
          <AlertDialogTitle>Disconnect Kindred?</AlertDialogTitle>
          <AlertDialogDescription>Disconnecting hides sample Meta ads from this browser's library. Local uploads remain. Reconnecting restores the samples; no live Meta account changes.</AlertDialogDescription>
          {disconnectError ? <InlineAlert tone="error">Could not disconnect. Browser storage is unavailable.</InlineAlert> : null}
          <div className="support-actions">
            <AlertDialogCancel asChild><Button
              variant="quiet"
              size="sm"
              onClick={() => {
                setConfirmDisconnect(false);
              }}
            >
              Keep Connected
            </Button></AlertDialogCancel>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                try { localStorage.setItem("butterfly-meta-ever-configured","true"); localStorage.removeItem("butterfly-meta-connected"); } catch {setDisconnectError(true);return;}
                disconnectedRef.current=true;
                setConnected(false);
                setConfirmDisconnect(false);
              }}
            >
              Disconnect
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

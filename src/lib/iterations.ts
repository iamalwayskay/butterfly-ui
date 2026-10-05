import { snapshotAnalysisProperty, standardAnalysisProperties, type AnalysisPropertySnapshot } from '@/lib/analysis-properties'

export interface SidecartNotes {
  hypothesis: string
  angle: string
  transcript: string
}

export interface IterationDraft {
  propertyDefinition?: AnalysisPropertySnapshot
  id: string
  adId: string
  kind: "fix" | "variant"
  change: string
  createdAt: string
  propertyId?: string
  owner?: string
  status?: "draft" | "completed"
  sample?: boolean
}

export interface WorkflowFinding {
  propertyDefinition?: AnalysisPropertySnapshot
  id: string
  adId: string
  propertyId: string
  label: string
  value?: string
  evidence: string
  owner: string
  updatedAt: string
  status: "review" | "failed" | "outdated" | "confirmed" | "corrected"
  sample: boolean
  retryCount?: number
  review?: { action: "confirmed" | "corrected"; value?: string; reason: string; reviewer: string; at: string; definitionSnapshot?: AnalysisPropertySnapshot }
}
export type VersionOutcome = { kind: "unmeasured"; summary: string } | { kind: "sample" | "manual"; summary: string; source: string; window: string }
export interface CreativeVersion {
  propertyDefinition?: AnalysisPropertySnapshot
  id: string
  adId: string
  draftId?: string
  propertyId?: string
  change: string
  owner: string
  createdAt: string
  sample: boolean
  outcome: VersionOutcome
}
export interface WorkflowState { version: 1; findings: WorkflowFinding[]; drafts: IterationDraft[]; versions: CreativeVersion[] }
export interface WorkItem {
  id: string
  adId: string
  kind: "finding" | "draft" | "version"
  view: "review" | "drafts" | "completed"
  title: string
  detail: string
  owner: string
  updatedAt: string
  sample: boolean
  propertyId?: string
  status?: WorkflowFinding["status"]
  outcome?: VersionOutcome
  missingSource: boolean
}

const notesKey = "butterfly:notes:v1"
const draftsKey = "butterfly:iterations:v1"
const workflowKey = "butterfly:workflow:v1"
const sampleFindings: WorkflowFinding[] = [
  {id:"finding-hook",adId:"2529793287483755",propertyId:"opening-1",label:"Opening Structure",evidence:"Check the recorded opening against the source creative.",owner:"Demo Owner",updatedAt:"2026-09-21T14:20:00.000Z",status:"review",sample:true},
  {id:"finding-audio",adId:"1277290320948697",propertyId:"offer-and-action-3",label:"Spoken Call to Action",evidence:"Audio interpretation is unavailable. Review the spoken call to action manually.",owner:"Unassigned",updatedAt:"2026-09-20T09:45:00.000Z",status:"failed",sample:true},
  {id:"finding-product",adId:"1235086835413596",propertyId:"visual-language-5",label:"Product Visibility",evidence:"Compare this finding against the current creative.",owner:"Demo Editor",updatedAt:"2026-09-19T09:45:00.000Z",status:"outdated",sample:true},
]
const sampleDrafts: IterationDraft[] = [
  {id:"sample-draft-hook",adId:"2529793287483755",propertyId:"opening-1",kind:"variant",change:"Show the result before the routine demonstration.",owner:"Demo Owner",createdAt:"2026-09-21T14:20:00.000Z",status:"draft",sample:true},
  {id:"sample-draft-proof",adId:"1277290320948697",propertyId:"offer-and-action-3",kind:"variant",change:"Keep the call to action visible beside the product close-up.",owner:"Demo Editor",createdAt:"2026-09-19T09:45:00.000Z",status:"draft",sample:true},
]
const sampleVersions: CreativeVersion[] = [
  {id:"sample-version-application",adId:"1235086835413596",propertyId:"visual-language-5",change:"Moved product application into the opening sequence.",owner:"Demo Owner",createdAt:"2026-09-18T12:00:00.000Z",sample:true,outcome:{kind:"sample",summary:"Approved for the next creative test.",source:"Kindred review",window:"18 September 2026"}},
]

function readStore<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function getNotes(adId: string, fallback: SidecartNotes): SidecartNotes {
  const stored = readStore<unknown>(notesKey, {})
  const notes = stored && typeof stored === "object"
    ? (stored as Record<string, SidecartNotes>)[adId]
    : undefined
  return notes && typeof notes.hypothesis === "string" && typeof notes.angle === "string" && typeof notes.transcript === "string"
    ? notes
    : fallback
}

export function saveNotes(adId: string, notes: SidecartNotes): boolean {
  try {
    const stored = readStore<unknown>(notesKey, {})
    const all = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}
    window.localStorage.setItem(notesKey, JSON.stringify({ ...all, [adId]: notes }))
    return true
  } catch {
    return false
  }
}

export function getIterationDrafts(): IterationDraft[] {
  return getWorkflowState().drafts
}

export function saveIterationDraft(draft: IterationDraft): boolean {
  const state = getWorkflowState()
  const previous=state.drafts.find(item=>item.id===draft.id)
  if(previous && previous.propertyId!==draft.propertyId || draft.propertyDefinition && draft.propertyDefinition.id!==draft.propertyId)return false
  return writeWorkflow({...state,drafts:unique([{...draft,propertyDefinition:previous?.propertyDefinition || draft.propertyDefinition || (draft.propertyId ? snapshotAnalysisProperty(draft.propertyId) : undefined),sample:!draft.adId.startsWith("upload-") && draft.sample === true},...state.drafts])})
}

function unique<T extends {id: string}>(records: T[]): T[] {
  return records.filter((item,index)=>records.findIndex(other=>other.id === item.id) === index)
}
function validDraft(d: IterationDraft) {
  return d && typeof d.id === "string" && typeof d.adId === "string" && ["fix","variant"].includes(d.kind) && typeof d.change === "string" && typeof d.createdAt === "string"
}
function validFinding(f: WorkflowFinding) {
  return f && ["id","adId","propertyId","label","evidence","owner","updatedAt"].every(key=>typeof f[key as keyof WorkflowFinding] === "string") && typeof f.sample === "boolean" && !(f.adId.startsWith("upload-") && f.sample) && ["review","failed","outdated","confirmed","corrected"].includes(f.status)
}
function validVersion(v: CreativeVersion) {
  return v && ["id","adId","change","owner","createdAt"].every(key=>typeof v[key as keyof CreativeVersion] === "string") && typeof v.sample === "boolean" && !(v.adId.startsWith("upload-") && v.sample) && v.outcome && !(v.adId.startsWith("upload-") && v.outcome.kind === "sample") && typeof v.outcome.summary === "string" && (v.outcome.kind === "unmeasured" || ["sample","manual"].includes(v.outcome.kind) && "source" in v.outcome && typeof v.outcome.source === "string" && typeof v.outcome.window === "string")
}
function withLegacyDefinition<T extends {propertyId?: string; propertyDefinition?: AnalysisPropertySnapshot}>(record: T): T {
  if(record.propertyDefinition || !record.propertyId)return record
  const standard=standardAnalysisProperties().find(item=>item.id===record.propertyId)
  return standard ? {...record,propertyDefinition:{...standard,schemaRevision:1,provenance:'standard-fixture'}} : record
}
function withLegacyReview(finding: WorkflowFinding): WorkflowFinding {
  const enriched=withLegacyDefinition(finding)
  if(!enriched.review || enriched.review.definitionSnapshot)return enriched
  const standard=standardAnalysisProperties().find(item=>item.id===enriched.propertyId)
  return standard ? {...enriched,review:{...enriched.review,definitionSnapshot:{...standard,schemaRevision:1,provenance:'standard-fixture'}}} : enriched
}
export function getWorkflowState(): WorkflowState {
  const stored = readStore<Partial<WorkflowState> | null>(workflowKey,null)
  const legacy = readStore<unknown>(draftsKey,[])
  const drafts = Array.isArray(stored?.drafts) ? stored.drafts : [...(Array.isArray(legacy) ? legacy : []),...sampleDrafts]
  return {
    version:1,
    findings:unique((Array.isArray(stored?.findings) ? stored.findings : sampleFindings).filter(validFinding)).map(withLegacyReview),
    drafts:unique(drafts.filter(validDraft)).map(d=>({...withLegacyDefinition(d),owner:typeof d.owner === "string" ? d.owner : "Demo Owner",status:d.status === "completed" ? "completed" : "draft",sample:!d.adId.startsWith("upload-") && d.sample === true})),
    versions:unique((Array.isArray(stored?.versions) ? stored.versions : sampleVersions).filter(validVersion)).map(withLegacyDefinition),
  }
}
function writeWorkflow(state: WorkflowState) {
  try { window.localStorage.setItem(workflowKey,JSON.stringify(state));return true } catch {return false}
}
export function upsertWorkflowFinding(finding: WorkflowFinding) {
  if(!validFinding(finding))return false
  const state = getWorkflowState();const previous=state.findings.find(item=>item.id===finding.id)
  if(previous && previous.propertyId!==finding.propertyId || finding.propertyDefinition && finding.propertyDefinition.id!==finding.propertyId || finding.review?.definitionSnapshot && finding.review.definitionSnapshot.id!==finding.propertyId)return false
  return writeWorkflow({...state,findings:unique([withLegacyReview({...finding,propertyDefinition:previous?.propertyDefinition || finding.propertyDefinition || snapshotAnalysisProperty(finding.propertyId)}),...state.findings])})
}
export function updateWorkflowFinding(id: string, patch: Partial<Pick<WorkflowFinding,"status" | "value" | "owner" | "review">>) {
  const state = getWorkflowState();const finding = state.findings.find(f=>f.id === id)
  return finding ? upsertWorkflowFinding({...finding,...patch,updatedAt:new Date().toISOString()}) : false
}
export function retryWorkflowFinding(id: string) {
  const finding = getWorkflowState().findings.find(f=>f.id === id)
  return finding?.status === "failed" ? upsertWorkflowFinding({...finding,status:"review",retryCount:(finding.retryCount ?? 0)+1,updatedAt:new Date().toISOString()}) : false
}
export function saveCreativeVersion(version: CreativeVersion) {
  if(!validVersion(version))return false
  const state = getWorkflowState();const previous=state.versions.find(item=>item.id===version.id), draft=state.drafts.find(item=>item.id===version.draftId)
  if(previous && previous.propertyId!==version.propertyId || version.propertyDefinition && version.propertyDefinition.id!==version.propertyId || draft?.propertyDefinition && draft.propertyDefinition.id!==version.propertyId)return false
  return writeWorkflow({...state,versions:unique([{...version,propertyDefinition:previous?.propertyDefinition || version.propertyDefinition || draft?.propertyDefinition || (version.propertyId ? snapshotAnalysisProperty(version.propertyId) : undefined)},...state.versions])})
}
export function removeIterationDraft(id: string) {
  const state = getWorkflowState()
  return state.drafts.some(draft=>draft.id === id)
    ? writeWorkflow({...state,drafts:state.drafts.filter(draft=>draft.id !== id)})
    : false
}
export function completeIterationDraft(id: string) {
  const state = getWorkflowState();const draft = state.drafts.find(d=>d.id === id)
  if(!draft)return false
  if(draft.status === "completed")return true
  const version: CreativeVersion = {id:`version-${draft.id}`,adId:draft.adId,draftId:draft.id,propertyId:draft.propertyId,propertyDefinition:draft.propertyDefinition || (draft.propertyId ? snapshotAnalysisProperty(draft.propertyId) : undefined),change:draft.change,owner:draft.owner || "Demo Owner",createdAt:new Date().toISOString(),sample:draft.sample === true,outcome:{kind:"unmeasured",summary:"No delivery data is linked to this change."}}
  return writeWorkflow({...state,drafts:state.drafts.map(d=>d.id === id ? {...d,status:"completed"} : d),versions:unique([version,...state.versions])})
}
export function deriveWorkQueue(state: WorkflowState, visibleAdIds: readonly string[]): WorkItem[] {
  const items: WorkItem[] = [
    ...state.findings.map(f=>({id:f.id,adId:f.adId,kind:"finding" as const,view:f.status === "confirmed" || f.status === "corrected" ? "completed" as const : "review" as const,title:f.label,detail:f.evidence,owner:f.owner,updatedAt:f.updatedAt,sample:f.sample,propertyId:f.propertyId,status:f.status,missingSource:!visibleAdIds.includes(f.adId)})),
    ...state.drafts.filter(d=>d.status !== "completed").map(d=>({id:d.id,adId:d.adId,kind:"draft" as const,view:"drafts" as const,title:d.change,detail:"Saved change proposal.",owner:d.owner || "Demo Owner",updatedAt:d.createdAt,sample:d.sample === true,propertyId:d.propertyId,missingSource:!visibleAdIds.includes(d.adId)})),
    ...state.versions.map(v=>({id:v.id,adId:v.adId,kind:"version" as const,view:"completed" as const,title:v.change,detail:v.outcome.summary,owner:v.owner,updatedAt:v.createdAt,sample:v.sample,propertyId:v.propertyId,outcome:v.outcome,missingSource:!visibleAdIds.includes(v.adId)})),
  ]
  return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
}

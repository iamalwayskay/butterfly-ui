import { getAnalysisProperties, readAnalysisProperties, snapshotAnalysisProperty, standardAnalysisProperties, type AnalysisPropertySnapshot } from './analysis-properties'

export type AnalysisView = 'not-analysed' | 'queued' | 'preparing' | 'analysing' | 'partial' | 'complete' | 'failed' | 'stale' | 'permission' | 'readonly'
export interface AnalysisLifecycleRecord {
  version: 1; adId: string; fixture: true
  run: 'idle' | 'queued' | 'preparing' | 'analysing' | 'failed'
  result: 'none' | 'partial' | 'complete'; freshness: 'current' | 'stale'; access: 'editable' | 'permission-blocked' | 'read-only'
  ordinal: number; attemptId?: string; stage: string; progress: number; completedGroupIds: string[]
  schemaRevision: number; propertySnapshots: AnalysisPropertySnapshot[]; updatedAt: string; startedAt?: string; completedAt?: string; staleAt?: string; reason?: string
  history: Omit<AnalysisLifecycleRecord, 'history'>[]
}
export type AnalysisAction = 'start' | 'retry' | 'prepare' | 'analyse' | 'partial' | 'complete' | 'fail' | 'cancel' | 'stale'
export const ANALYSIS_STORAGE_KEY='butterfly.analysis.v1'
const views: AnalysisView[]=['not-analysed','queued','preparing','analysing','partial','complete','failed','stale','permission','readonly']
const sampleIds=['1235086835413596','2529793287483755','1277290320948697']
function baseRecord(adId: string, hasResult=false): AnalysisLifecycleRecord {
  return {version:1,adId,fixture:true,run:'idle',result:hasResult?'complete':'none',freshness:'current',access:'editable',ordinal:0,stage:hasResult?'Sample analysis complete':'Analysis has not run',progress:hasResult?100:0,completedGroupIds:hasResult?[...new Set(standardAnalysisProperties().map(item=>item.category))]:[],schemaRevision:hasResult?1:readAnalysisProperties().data.schemaRevision,propertySnapshots:hasResult&&sampleIds.includes(adId)?standardAnalysisProperties().map(item=>({...item,schemaRevision:1,provenance:'standard-fixture'})):[],updatedAt:'2026-10-04T12:00:00.000Z',history:[]}
}
function fixtureRecord(record: AnalysisLifecycleRecord, fixture: AnalysisView) {
  const next=structuredClone(record)
  next.run=['queued','preparing','analysing','failed'].includes(fixture)?fixture as AnalysisLifecycleRecord['run']:'idle'
  next.result=['complete','stale','permission','readonly'].includes(fixture)?'complete':fixture==='partial'?'partial':['not-analysed','queued','preparing','analysing'].includes(fixture)?'none':record.result
  next.freshness=fixture==='stale'?'stale':'current'
  next.access=record.access==='read-only'?'read-only':record.access==='permission-blocked'?'permission-blocked':fixture==='permission'?'permission-blocked':fixture==='readonly'?'read-only':'editable'
  next.stage=fixture==='preparing'?'Preparing media':fixture==='analysing'?'Reviewing creative groups':fixture==='failed'?'Sample media preparation failed':fixture==='queued'?'Queued local walkthrough':next.stage
  next.progress=fixture==='complete'||fixture==='stale'?100:fixture==='partial'?45:fixture==='analysing'?20:0
  if(fixture==='permission')next.reason='Source permission is missing in this fixture. Repair the source in Settings.'
  if(fixture==='readonly'&&record.access!=='read-only')next.reason='Your fixture workspace role allows inspection only.'
  if(fixture==='stale')next.reason='The creative or analysis definitions changed after this sample result.'
  if(next.result!=='none' && !next.propertySnapshots.length && sampleIds.includes(next.adId)) next.propertySnapshots=baseRecord(next.adId,true).propertySnapshots
  const groups=[...new Set(next.propertySnapshots.map(item=>item.category))]
  next.completedGroupIds=next.result==='complete'?groups:next.result==='partial'?groups.slice(0,3):[]
  return next
}
function validSnapshot(snapshot: AnalysisPropertySnapshot): boolean {
  if(!snapshot || typeof snapshot!=='object')return false
  const standard=standardAnalysisProperties().find(item=>item.id===snapshot.id)
  return typeof snapshot.id==='string' && (snapshot.origin==='standard' ? Boolean(standard) && ['standard-fixture','local-override'].includes(snapshot.provenance) : snapshot.origin==='custom' && /^custom:[1-9]\d*$/.test(snapshot.id) && snapshot.provenance==='local-definition') && typeof snapshot.name==='string' && !!snapshot.name.trim() && typeof snapshot.category==='string' && !!snapshot.category.trim() && ['text','category','time','number','boolean'].includes(snapshot.valueType) && typeof snapshot.description==='string' && ['none','optional','required'].includes(snapshot.evidenceRequirement) && typeof snapshot.enabled==='boolean' && Number.isFinite(snapshot.order) && Number.isInteger(snapshot.version) && snapshot.version>0 && Number.isInteger(snapshot.schemaRevision) && snapshot.schemaRevision>0
}
function validRecordBody(record: Omit<AnalysisLifecycleRecord,'history'>): boolean {
  return !!record && record.version===1 && typeof record.adId==='string' && !!record.adId && record.fixture===true && ['idle','queued','preparing','analysing','failed'].includes(record.run) && ['none','partial','complete'].includes(record.result) && ['current','stale'].includes(record.freshness) && ['editable','permission-blocked','read-only'].includes(record.access) && Number.isInteger(record.ordinal) && record.ordinal>=0 && (record.ordinal===0 ? record.attemptId===undefined : record.attemptId===`analysis:${record.adId}:${record.ordinal}`) && typeof record.stage==='string' && Number.isFinite(record.progress) && record.progress>=0 && record.progress<=100 && Number.isInteger(record.schemaRevision) && record.schemaRevision>0 && Array.isArray(record.completedGroupIds) && record.completedGroupIds.every(item=>typeof item==='string') && Array.isArray(record.propertySnapshots) && record.propertySnapshots.every(validSnapshot) && new Set(record.propertySnapshots.map(item=>item.id)).size===record.propertySnapshots.length && typeof record.updatedAt==='string' && [record.startedAt,record.completedAt,record.staleAt,record.reason].every(item=>item===undefined||typeof item==='string')
}
function validRecord(record: AnalysisLifecycleRecord): boolean {
  return validRecordBody(record) && Array.isArray(record.history) && record.history.every((item,index)=>validRecordBody(item) && !('history' in item) && item.adId===record.adId && item.ordinal<record.ordinal && (index===0||record.history[index-1].ordinal<item.ordinal))
}
export function readAnalysisStore(): { records: Record<string,AnalysisLifecycleRecord>; readOnly: boolean; reason?: string } {
  try {
    const raw=localStorage.getItem(ANALYSIS_STORAGE_KEY)
    if(!raw)return {records:{},readOnly:false}
    const value=JSON.parse(raw)
    if(value.version===0 && Array.isArray(value.records) && value.records.every((item: {adId:string;state:AnalysisView})=>typeof item.adId==='string'&&views.includes(item.state))) return {records:Object.fromEntries(value.records.map((item: {adId:string;state:AnalysisView})=>[item.adId,fixtureRecord(baseRecord(item.adId),item.state)])),readOnly:false}
    if(value.version!==1)return {records:{},readOnly:true,reason:'A newer or unsupported analysis storage version is preserved in this browser.'}
    if(!value.records||typeof value.records!=='object'||Array.isArray(value.records)||Object.entries(value.records).some(([id,record])=>!validRecord(record as AnalysisLifecycleRecord)||(record as AnalysisLifecycleRecord).adId!==id))throw Error('Malformed')
    return {records:value.records,readOnly:false}
  } catch {return {records:{},readOnly:true,reason:'Saved analysis data could not be read. It has been preserved; changes are disabled.'}}
}
export function getAnalysisLifecycle(adId: string, options: {hasResult?: boolean; fixture?: string | null}={}): AnalysisLifecycleRecord {
  const stored=readAnalysisStore(), registry=readAnalysisProperties()
  let record=structuredClone(stored.records[adId] || baseRecord(adId,options.hasResult))
  if(record.result!=='none'&&record.schemaRevision!==registry.data.schemaRevision)record={...record,freshness:'stale',reason:'Analysis property definitions changed after this result.'}
  if(stored.readOnly||registry.readOnly) record={...record,access:'read-only',reason:stored.reason||registry.reason}
  if(views.includes(options.fixture as AnalysisView))record=fixtureRecord(record,options.fixture as AnalysisView)
  return record
}
export function deriveAnalysisView(record: AnalysisLifecycleRecord): AnalysisView {
  if(record.access==='read-only')return 'readonly'
  if(record.access==='permission-blocked')return 'permission'
  if(record.run!=='idle')return record.run
  if(record.result==='none')return 'not-analysed'
  if(record.freshness==='stale')return 'stale'
  return record.result
}
export function analysisPermissions(record: AnalysisLifecycleRecord) {
  const editable=record.access==='editable', busy=['queued','preparing','analysing'].includes(record.run)
  return {inspect:true,start:editable&&!busy,retry:editable&&record.run==='failed',cancel:editable&&busy,review:editable&&record.result!=='none'&&record.freshness==='current',handoff:editable&&record.result!=='none'}
}
export function transitionAnalysis(record: AnalysisLifecycleRecord, action: AnalysisAction): AnalysisLifecycleRecord | null {
  if(!validRecord(record)||record.access!=='editable')return null
  const next=structuredClone(record), now=new Date().toISOString(), busy=['queued','preparing','analysing'].includes(record.run)
  if(action==='start'||action==='retry') {
    if(busy||(action==='retry'&&record.run!=='failed'))return null
    const {history: _history,...snapshot}=structuredClone(record)
    next.history.push(snapshot); next.ordinal++; next.attemptId=`analysis:${record.adId}:${next.ordinal}`; next.run='queued';next.stage='Queued local walkthrough';next.progress=0;next.startedAt=now
  } else if(action==='prepare'&&record.run==='queued') {next.run='preparing';next.stage='Preparing media';next.progress=10}
  else if(action==='analyse'&&(record.run==='preparing'||(record.run==='idle'&&record.result==='partial'))) {next.run='analysing';next.stage='Reviewing creative groups';next.progress=Math.max(record.progress,20)}
  else if(action==='partial'&&record.run==='analysing') {next.run='idle';next.result='partial';next.progress=Math.max(record.progress,45);next.stage='Some sample groups are ready';next.freshness='current';next.schemaRevision=readAnalysisProperties().data.schemaRevision;next.propertySnapshots=sampleIds.includes(record.adId)?getAnalysisProperties().filter(item=>item.enabled).map(item=>snapshotAnalysisProperty(item.id)!):[];next.completedGroupIds=[...new Set(next.propertySnapshots.map(item=>item.category))].slice(0,3)}
  else if(action==='complete'&&(record.run==='analysing'||record.result==='partial'&&record.run==='idle')) {next.run='idle';next.result='complete';next.freshness='current';next.progress=100;next.stage='Local walkthrough complete';next.completedAt=now;next.schemaRevision=readAnalysisProperties().data.schemaRevision;next.propertySnapshots=sampleIds.includes(record.adId)?getAnalysisProperties().filter(item=>item.enabled).map(item=>snapshotAnalysisProperty(item.id)!):[];next.completedGroupIds=[...new Set(next.propertySnapshots.map(item=>item.category))]}
  else if(action==='fail'&&(busy||record.result==='partial')) {next.run='failed';next.reason=`The local fixture failed during ${record.stage.toLowerCase()}. Retained results are unchanged.`}
  else if(action==='cancel'&&busy) {next.run='idle';next.stage='Local walkthrough cancelled';next.progress=record.result==='complete'?100:record.result==='partial'?45:0}
  else if(action==='stale'&&record.result!=='none') {next.freshness='stale';next.staleAt=now;next.reason='Creative or property definitions changed after this result.'}
  else return null
  next.updatedAt=now
  return next
}
export function saveAnalysisLifecycle(record: AnalysisLifecycleRecord): boolean {
  const stored=readAnalysisStore()
  if(stored.readOnly||!validRecord(record)||record.access!=='editable'||stored.records[record.adId]?.access==='read-only'||stored.records[record.adId]?.access==='permission-blocked')return false
  if((stored.records[record.adId]?.ordinal || 0)>record.ordinal)return false
  try {localStorage.setItem(ANALYSIS_STORAGE_KEY,JSON.stringify({version:1,records:{...stored.records,[record.adId]:record}}));return true}catch{return false}
}
/** Passing null removes only the fixture preview; every return/context parameter survives. */
export function analysisFixtureParams(params: URLSearchParams, fixture: AnalysisView | null): URLSearchParams {
  const next=new URLSearchParams(params); if(fixture)next.set('analysis',fixture);else next.delete('analysis');return next
}

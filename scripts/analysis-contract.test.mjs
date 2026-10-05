import assert from 'node:assert/strict'
import { before, beforeEach, after, test } from 'node:test'
import { createServer } from 'vite'
let server, lifecycle, properties, jev, ads
const storage = new Map()
before(async () => {
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  globalThis.window = { localStorage: globalThis.localStorage }
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  try { lifecycle = await server.ssrLoadModule('/src/lib/analysis-lifecycle.ts'); properties = await server.ssrLoadModule('/src/lib/analysis-properties.ts') } catch {}
  jev = await server.ssrLoadModule('/src/data/jev.ts'); ads = await server.ssrLoadModule('/src/data/ads.ts')
})
beforeEach(() => storage.clear())
after(async () => { await server?.close(); delete globalThis.localStorage; delete globalThis.window })
test('ten fixtures preserve independent result, freshness and access axes', () => {
  assert.ok(lifecycle, 'analysis lifecycle contract must exist')
  const expected = {
    'not-analysed': ['idle','none','current','editable'], queued: ['queued','none','current','editable'], preparing: ['preparing','none','current','editable'], analysing: ['analysing','none','current','editable'], partial: ['idle','partial','current','editable'], complete: ['idle','complete','current','editable'], failed: ['failed','none','current','editable'], stale: ['idle','complete','stale','editable'], permission: ['idle','complete','current','permission-blocked'], readonly: ['idle','complete','current','read-only'],
  }
  for (const [fixture, axes] of Object.entries(expected)) {
    const record = lifecycle.getAnalysisLifecycle('1235086835413596', { fixture })
    assert.deepEqual([record.run,record.result,record.freshness,record.access], axes)
    assert.equal(lifecycle.deriveAnalysisView(record), fixture)
  }
  assert.equal(storage.size, 0)
  const upload = lifecycle.getAnalysisLifecycle('upload-real', { fixture: 'complete' })
  assert.equal(upload.propertySnapshots.length, 0)
})
test('attempt transitions retain stale results, reject invalid moves and persist monotonic retry identities', () => {
  assert.ok(lifecycle)
  let record = lifecycle.getAnalysisLifecycle('1235086835413596', { hasResult: true })
  record = lifecycle.transitionAnalysis(record, 'stale')
  record = lifecycle.transitionAnalysis(record, 'start')
  assert.equal(record.attemptId, 'analysis:1235086835413596:1')
  assert.equal(record.result, 'complete'); assert.equal(record.freshness, 'stale')
  assert.equal(record.history[0].result, 'complete')
  assert.equal(lifecycle.transitionAnalysis(record, 'complete'), null)
  record = lifecycle.transitionAnalysis(record, 'prepare')
  record = lifecycle.transitionAnalysis(record, 'analyse')
  record = lifecycle.transitionAnalysis(record, 'partial')
  record = lifecycle.transitionAnalysis(record, 'fail')
  assert.equal(record.result, 'partial')
  record = lifecycle.transitionAnalysis(record, 'retry')
  assert.equal(record.attemptId, 'analysis:1235086835413596:2')
  assert.equal(lifecycle.saveAnalysisLifecycle(record), true)
  assert.equal(lifecycle.getAnalysisLifecycle(record.adId).attemptId, record.attemptId)
})
test('URL overrides win without persisting or elevating durable permissions', () => {
  assert.ok(lifecycle)
  let record = lifecycle.getAnalysisLifecycle('1235086835413596', { hasResult: true })
  record = { ...record, access: 'read-only' }
  storage.set('butterfly.analysis.v1', JSON.stringify({version:1,records:{[record.adId]:record}}))
  const before = storage.get('butterfly.analysis.v1')
  const view = lifecycle.getAnalysisLifecycle(record.adId, { fixture:'queued' })
  assert.equal(view.run,'queued'); assert.equal(view.access,'read-only')
  assert.equal(lifecycle.transitionAnalysis(view,'start'),null)
  assert.equal(storage.get('butterfly.analysis.v1'),before)
})
test('malformed and future schemas are protected; known legacy state migrates only in memory', () => {
  assert.ok(lifecycle)
  for (const raw of ['{broken', JSON.stringify({version:5,records:{}})]) {
    storage.set('butterfly.analysis.v1',raw)
    const record=lifecycle.getAnalysisLifecycle('1235086835413596',{hasResult:true})
    assert.equal(record.access,'read-only'); assert.equal(lifecycle.saveAnalysisLifecycle(record),false)
    assert.equal(storage.get('butterfly.analysis.v1'),raw)
  }
  storage.set('butterfly.analysis.v1',JSON.stringify({version:0,records:[{adId:'1235086835413596',state:'stale'}]}))
  assert.equal(lifecycle.getAnalysisLifecycle('1235086835413596').freshness,'stale')
  assert.equal(JSON.parse(storage.get('butterfly.analysis.v1')).version,0)
})
test('standard overrides are reversible and snapshot history survives registry changes and reset', () => {
  assert.ok(properties, 'property registry contract must exist')
  const original=properties.snapshotAnalysisProperty('opening-1')
  assert.equal(original.name,'Hook type')
  assert.equal(properties.saveAnalysisProperty({id:'opening-1',name:'Opening approach',description:'Display wording',enabled:false}),true)
  assert.equal(properties.getAnalysisProperties()[0].name,'Opening approach')
  assert.equal(jev.jevPropertyRegistry[0].label,'Hook type')
  assert.equal(original.name,'Hook type')
  assert.equal(properties.saveAnalysisProperty({id:'opening-1',valueType:'boolean'}),false)
  assert.equal(properties.removeAnalysisOverride('opening-1'),true)
  assert.equal(properties.getAnalysisProperties()[0].name,'Hook type')
  storage.set('butterfly:workflow:v1','preserve-history')
  assert.equal(properties.resetAnalysisProperties(),true)
  assert.equal(storage.get('butterfly:workflow:v1'),'preserve-history')
})
test('custom properties scale beyond 41 with stable IDs, semantic revision, filtering and reorder', () => {
  assert.ok(properties)
  const revision=properties.readAnalysisProperties().data.schemaRevision
  assert.equal(properties.saveAnalysisProperty({name:'Offer certainty',category:'Offer and action',valueType:'boolean',description:'Is the offer clear?',evidenceRequirement:'required',enabled:false}),true)
  assert.equal(properties.readAnalysisProperties().data.schemaRevision,revision)
  let custom=properties.getAnalysisProperties().find(item=>item.origin==='custom')
  assert.equal(custom.id,'custom:1')
  assert.equal(properties.saveAnalysisProperty({id:custom.id,enabled:true}),true)
  assert.equal(properties.readAnalysisProperties().data.schemaRevision,revision+1)
  assert.equal(properties.reorderAnalysisProperty(custom.id,-1),true)
  const order=properties.getAnalysisProperties().filter(item=>item.category==='Offer and action')
  assert.equal(order.at(-2).id,custom.id)
  for(let i=0;i<15;i++) assert.equal(properties.saveAnalysisProperty({name:`Claim ${i}`,category:'Proof and trust',valueType:'text',description:'Check claim',evidenceRequirement:'required',enabled:true}),true)
  assert.equal(properties.getAnalysisProperties().length,57)
  assert.equal(properties.filterAnalysisProperties(properties.getAnalysisProperties(),{search:'offer clear',origin:'custom'}).length,1)
  const snapshot=properties.snapshotAnalysisProperty(custom.id)
  properties.resetAnalysisProperties()
  properties.saveAnalysisProperty({name:'New claim',category:'Proof',valueType:'text',description:'Claim',evidenceRequirement:'optional',enabled:true})
  assert.equal(properties.getAnalysisProperties().at(-1).id,'custom:17')
  assert.equal(snapshot.id,'custom:1')
})
test('registry rejects invalid definitions and protects future/malformed storage from reset', () => {
  assert.ok(properties)
  assert.equal(properties.saveAnalysisProperty({name:' ',category:'Opening'}),false)
  for(const raw of ['{broken',JSON.stringify({version:9})]) {
    storage.set('butterfly.analysis-properties.v1',raw)
    assert.equal(properties.readAnalysisProperties().readOnly,true)
    assert.equal(properties.resetAnalysisProperties(),false)
    assert.equal(storage.get('butterfly.analysis-properties.v1'),raw)
  }
})
test('sample findings and human reviews retain definition provenance after display edits', () => {
  const ad=ads.adById('1235086835413596')
  assert.ok(jev.getJevFindings(ad)[0].definitionSnapshot,'finding must snapshot definition')
  assert.equal(jev.saveJevReview(ad,'opening-1',{action:'confirmed',reason:'Viewed source',reviewer:'You'}),true)
  properties.saveAnalysisProperty({id:'opening-1',name:'Renamed for display'})
  const finding=jev.getJevFindings(ad)[0]
  assert.equal(finding.definitionSnapshot.name,'Hook type')
  assert.equal(finding.review.definitionSnapshot.name,'Hook type')
})
test('workflow draft and completed version retain the captured definition when registry changes', async () => {
  const workflow=await server.ssrLoadModule('/src/lib/iterations.ts')
  workflow.saveIterationDraft({id:'snapshot-draft',adId:'1235086835413596',propertyId:'opening-1',kind:'variant',change:'Try another opening',createdAt:'2026-10-04T12:00:00Z'})
  assert.equal(workflow.getWorkflowState().drafts.find(item=>item.id==='snapshot-draft').propertyDefinition?.name,'Hook type')
  properties.saveAnalysisProperty({id:'opening-1',name:'New name'})
  workflow.completeIterationDraft('snapshot-draft')
  assert.equal(workflow.getWorkflowState().versions.find(item=>item.draftId==='snapshot-draft').propertyDefinition?.name,'Hook type')
})
test('fixture query helpers preserve exact source and return context',()=>{
  assert.ok(lifecycle)
  const params=new URLSearchParams('panel=jev&view=transcript&property=opening-1&finding=abc&sourceAds=one,two&returnTo=%2Fads%3Fpage%3D2&draft=draft-a')
  const next=lifecycle.analysisFixtureParams(params,'stale')
  assert.equal(next.get('analysis'),'stale')
  next.delete('analysis');assert.equal(next.toString(),params.toString())
})
test('seeded workflow and analysis snapshots predate cosmetic and semantic registry edits',async()=>{
  const workflow=await server.ssrLoadModule('/src/lib/iterations.ts')
  properties.saveAnalysisProperty({id:'opening-1',name:'New wording',enabled:false})
  assert.equal(workflow.getWorkflowState().findings.find(item=>item.id==='finding-hook').propertyDefinition?.name,'Hook type')
  const record=lifecycle.getAnalysisLifecycle('1235086835413596',{hasResult:true})
  assert.equal(record.freshness,'stale')
  assert.equal(record.propertySnapshots.find(item=>item.id==='opening-1')?.name,'Hook type')
  const queued=lifecycle.transitionAnalysis(record,'start')
  const failed=lifecycle.transitionAnalysis(queued,'fail')
  assert.equal(failed.result,'complete');assert.equal(failed.freshness,'stale')
})
test('rerun partial results capture the changed schema revision and remain current after reload',()=>{
  let record=lifecycle.getAnalysisLifecycle('1235086835413596',{hasResult:true})
  properties.saveAnalysisProperty({id:'opening-1',enabled:false})
  for(const action of ['start','prepare','analyse','partial'])record=lifecycle.transitionAnalysis(record,action)
  assert.equal(lifecycle.saveAnalysisLifecycle(record),true)
  const restored=lifecycle.getAnalysisLifecycle(record.adId)
  assert.equal(restored.result,'partial');assert.equal(restored.freshness,'current')
  assert.equal(restored.schemaRevision,2)
})
test('nested malformed lifecycle histories and incomplete snapshots are rejected without overwriting bytes',()=>{
  const original=lifecycle.getAnalysisLifecycle('1235086835413596',{hasResult:true})
  const {history,...historical}=original
  const malformed=[{...original,history:[null]},{...original,history:[{...historical,propertySnapshots:[{id:'opening-1',name:'Hook type',version:1}]}]},{...original,propertySnapshots:[{id:'opening-1',name:'Hook type',version:1}]},{...original,propertySnapshots:[{...original.propertySnapshots[0],provenance:'invented'}]}]
  for(const record of malformed){
    const raw=JSON.stringify({version:1,records:{[record.adId]:record}});storage.set('butterfly.analysis.v1',raw)
    assert.equal(lifecycle.readAnalysisStore().readOnly,true)
    assert.equal(lifecycle.saveAnalysisLifecycle(original),false)
    assert.equal(lifecycle.transitionAnalysis(record,'start'),null)
    assert.equal(storage.get('butterfly.analysis.v1'),raw)
  }
})
test('updates cannot reassign workflow property identity beneath a preserved snapshot',async()=>{
  const workflow=await server.ssrLoadModule('/src/lib/iterations.ts')
  const finding=workflow.getWorkflowState().findings[0]
  assert.equal(workflow.upsertWorkflowFinding({...finding,propertyId:'opening-2'}),false)
  const draft={id:'stable-draft',adId:finding.adId,propertyId:'opening-1',kind:'variant',change:'Test source identity',createdAt:'2026-10-04T12:00:00Z'}
  assert.equal(workflow.saveIterationDraft(draft),true)
  assert.equal(workflow.saveIterationDraft({...draft,propertyId:'opening-2'}),false)
  workflow.completeIterationDraft(draft.id)
  const version=workflow.getWorkflowState().versions.find(item=>item.draftId===draft.id)
  assert.equal(workflow.saveCreativeVersion({...version,propertyId:'opening-2'}),false)
  for(const record of [workflow.getWorkflowState().findings[0],workflow.getWorkflowState().drafts.find(item=>item.id===draft.id),workflow.getWorkflowState().versions.find(item=>item.id===version.id)])assert.equal(record.propertyId,record.propertyDefinition.id)
})
test('legacy standard review snapshots are enriched in memory and survive subsequent writes',async()=>{
  const workflow=await server.ssrLoadModule('/src/lib/iterations.ts')
  const finding={...workflow.getWorkflowState().findings[0],propertyDefinition:undefined,review:{action:'confirmed',reason:'Original check',reviewer:'Demo Owner',at:'2026-09-01T12:00:00Z'}}
  const raw=JSON.stringify({version:1,findings:[finding],drafts:[],versions:[]});storage.set('butterfly:workflow:v1',raw)
  properties.saveAnalysisProperty({id:'opening-1',name:'New local wording'})
  const restored=workflow.getWorkflowState().findings[0]
  assert.equal(restored.review.definitionSnapshot?.name,'Hook type')
  assert.equal(storage.get('butterfly:workflow:v1'),raw)
  workflow.updateWorkflowFinding(finding.id,{owner:'Demo Editor'})
  assert.equal(workflow.getWorkflowState().findings[0].review.definitionSnapshot.name,'Hook type')
  workflow.upsertWorkflowFinding({...finding,owner:'Demo Editor'})
  assert.equal(JSON.parse(storage.get('butterfly:workflow:v1')).findings[0].review.definitionSnapshot?.name,'Hook type')
})
test('effective local overrides retain standard identity with local override provenance',()=>{
  properties.saveAnalysisProperty({id:'opening-1',name:'Opening approach'})
  const snapshot=properties.snapshotAnalysisProperty('opening-1')
  assert.equal(snapshot.origin,'standard');assert.equal(snapshot.provenance,'local-override')
  properties.removeAnalysisOverride('opening-1')
  assert.equal(properties.snapshotAnalysisProperty('opening-1').provenance,'standard-fixture')
})

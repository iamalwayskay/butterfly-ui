import assert from 'node:assert/strict'
import {before,after,beforeEach,test} from 'node:test'
import {createServer} from 'vite'
let server,workflow;const store=new Map()
before(async()=>{
 globalThis.window={localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)}}
 server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
 workflow=await server.ssrLoadModule('/src/lib/iterations.ts')
})
after(async()=>{await server?.close();delete globalThis.window})
beforeEach(()=>store.clear())
const sampleIds=['1235086835413596','2529793287483755','1277290320948697']
test('queue preserves unavailable source records without assigning sample work to uploads',()=>{
 assert.equal(typeof workflow.getWorkflowState,'function')
 const state=workflow.getWorkflowState()
 const missing=workflow.deriveWorkQueue(state,['upload-private'])
 assert.equal(missing.length,6);assert.ok(missing.every(item=>item.missingSource))
 const items=workflow.deriveWorkQueue(state,sampleIds)
 assert.equal(items.filter(i=>i.view==='review').length,3)
 assert.ok(items.every(i=>i.sample===true))
 assert.ok(items.every(i=>i.missingSource===false))
 assert.ok(items.filter(i=>i.kind==='version').every(i=>i.outcome.kind==='unmeasured'||(i.outcome.source&&i.outcome.window)))
})
test('legacy drafts migrate without duplicate IDs or invented findings and retain note storage',()=>{
 const legacy={id:'legacy',adId:'upload-one',kind:'variant',change:'User hypothesis',createdAt:'2026-10-03T12:00:00Z'}
 store.set('butterfly:iterations:v1',JSON.stringify([legacy,null,legacy]))
 assert.equal(workflow.getIterationDrafts().filter(d=>d.id==='legacy').length,1)
 assert.ok(workflow.saveIterationDraft({...legacy,change:'Revised hypothesis'}))
 assert.equal(workflow.getIterationDrafts().filter(d=>d.id==='legacy').length,1)
 assert.equal(workflow.getIterationDrafts().find(d=>d.id==='legacy').change,'Revised hypothesis')
 assert.equal(workflow.getWorkflowState().findings.some(f=>f.adId==='upload-one'),false)
 const notes={hypothesis:'Mine',angle:'Practical',transcript:''};assert.ok(workflow.saveNotes('upload-one',notes));assert.deepEqual(workflow.getNotes('upload-one',{}),notes)
})
test('retry mutates a failed finding and review completion derives a precise completed item',()=>{
 assert.equal(typeof workflow.retryWorkflowFinding,'function')
 const failed=workflow.getWorkflowState().findings.find(f=>f.status==='failed')
 assert.ok(workflow.retryWorkflowFinding(failed.id))
 const retried=workflow.getWorkflowState().findings.find(f=>f.id===failed.id)
 assert.equal(retried.status,'review');assert.equal(retried.retryCount,1)
 assert.ok(workflow.updateWorkflowFinding(failed.id,{status:'confirmed',owner:'Demo Owner'}))
 const item=workflow.deriveWorkQueue(workflow.getWorkflowState(),sampleIds).find(i=>i.id===failed.id)
 assert.equal(item.view,'completed');assert.equal(item.propertyId,failed.propertyId)
})
test('draft completion writes a linked version once with an explicit missing-outcome reason',()=>{
 assert.equal(typeof workflow.completeIterationDraft,'function')
 workflow.saveIterationDraft({id:'draft-owned',adId:'upload-one',kind:'variant',change:'Longer CTA',createdAt:'2026-10-03T12:00:00Z',propertyId:'offer-and-action-3'})
 assert.ok(workflow.completeIterationDraft('draft-owned'))
 assert.ok(workflow.completeIterationDraft('draft-owned'))
 const state=workflow.getWorkflowState();const versions=state.versions.filter(v=>v.draftId==='draft-owned')
 assert.equal(versions.length,1);assert.equal(versions[0].propertyId,'offer-and-action-3');assert.equal(versions[0].outcome.kind,'unmeasured')
 assert.match(versions[0].outcome.summary,/No delivery/)
 assert.equal(workflow.deriveWorkQueue(state,['upload-one']).filter(i=>i.id==='draft-owned'&&i.view==='drafts').length,0)
})
test('finding and version upserts persist exact per-ad identity and corrected value',()=>{
 assert.equal(typeof workflow.upsertWorkflowFinding,'function')
 const finding={id:'upload-finding',adId:'upload-one',propertyId:'opening-1',label:'Opening',value:'User correction',evidence:'User entered',owner:'Demo Owner',updatedAt:'2026-10-03T12:00:00Z',status:'corrected',sample:false}
 assert.ok(workflow.upsertWorkflowFinding(finding));assert.ok(workflow.upsertWorkflowFinding({...finding,value:'Updated correction'}))
 assert.equal(workflow.getWorkflowState().findings.filter(f=>f.id===finding.id).length,1)
 assert.equal(workflow.getWorkflowState().findings.find(f=>f.id===finding.id).value,'Updated correction')
 assert.ok(workflow.saveCreativeVersion({id:'version-owned',adId:'upload-one',change:'Saved version',owner:'Demo Owner',createdAt:'2026-10-03T12:00:00Z',sample:false,outcome:{kind:'unmeasured',summary:'No delivery data supplied.'}}))
 const queue=workflow.deriveWorkQueue(workflow.getWorkflowState(),['upload-one']);assert.equal(queue.filter(item=>item.adId==='upload-one').length,2);assert.ok(queue.filter(item=>item.adId==='upload-one').every(item=>item.missingSource===false))
})
test('human review provenance and manually sourced outcomes share the workflow store',()=>{
 const finding=workflow.getWorkflowState().findings[0]
 const review={action:'corrected',value:'Human value',reason:'Frame evidence',reviewer:'Demo Owner',at:'2026-10-03T12:00:00Z'}
 assert.ok(workflow.updateWorkflowFinding(finding.id,{status:'corrected',review}))
 const {definitionSnapshot,...restoredReview}=workflow.getWorkflowState().findings.find(f=>f.id===finding.id).review
 assert.deepEqual(restoredReview,review)
 assert.equal(definitionSnapshot.id,'opening-1')
 assert.equal(definitionSnapshot.provenance,'standard-fixture')
 assert.ok(workflow.saveCreativeVersion({id:'manual-version',adId:finding.adId,change:'Tested change',owner:'Demo Owner',createdAt:review.at,sample:false,outcome:{kind:'manual',summary:'Operator observation',source:'User-entered account export',window:'2026-09-01 to 2026-09-30'}}))
 assert.ok(workflow.updateWorkflowFinding(finding.id,{status:'review',review:undefined}))
 assert.equal(workflow.getWorkflowState().findings.find(f=>f.id===finding.id).review,undefined)
})
test('failed writes never advance queue state and malformed storage falls back safely',()=>{
 assert.equal(typeof workflow.getWorkflowState,'function')
 store.set('butterfly:workflow:v1','{broken');const before=workflow.getWorkflowState()
 const write=window.localStorage.setItem;window.localStorage.setItem=()=>{throw new Error('quota')}
 try{assert.equal(workflow.updateWorkflowFinding(before.findings[0].id,{status:'confirmed'}),false)}finally{window.localStorage.setItem=write}
 assert.equal(workflow.getWorkflowState().findings[0].status,before.findings[0].status)
})
test('public finding and version APIs reject sample provenance on uploads and invalid boolean flags',()=>{
 const state=workflow.getWorkflowState()
 for(const sample of [true,'true',undefined]) {
  assert.equal(workflow.upsertWorkflowFinding({...state.findings[0],id:'upload-rejected-finding',adId:'upload-provenance',sample}),false)
  assert.equal(workflow.saveCreativeVersion({...state.versions[0],id:'upload-rejected-version',adId:'upload-provenance',sample}),false)
 }
 assert.equal(workflow.deriveWorkQueue(workflow.getWorkflowState(),['upload-provenance']).some(item=>item.adId==='upload-provenance'),false)
})
test('restored upload sample findings and versions are excluded rather than relabelled as user evidence',()=>{
 const state=workflow.getWorkflowState()
 store.set('butterfly:workflow:v1',JSON.stringify({version:1,findings:[{...state.findings[0],id:'bad-finding',adId:'upload-restored',sample:true}],versions:[{...state.versions[0],id:'bad-version',adId:'upload-restored',sample:true}],drafts:[{id:'legacy-upload-draft',adId:'upload-restored',kind:'variant',change:'User proposal',createdAt:'2026-10-03T12:00:00Z',sample:true}]}))
 const restored=workflow.getWorkflowState();assert.equal(restored.findings.length,0);assert.equal(restored.versions.length,0);assert.equal(restored.drafts[0].sample,false)
 assert.ok(workflow.saveIterationDraft({...restored.drafts[0],sample:true}));assert.equal(JSON.parse(store.get('butterfly:workflow:v1')).drafts[0].sample,false)
})

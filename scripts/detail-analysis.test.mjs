import assert from 'node:assert/strict'
import {before,beforeEach,after,test} from 'node:test'
import {createServer} from 'vite'
let server,detail,jev,ads,lifecycle,registry
const storage=new Map()
before(async()=>{
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}
 globalThis.window={localStorage:globalThis.localStorage}
 server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
 try{detail=await server.ssrLoadModule('/src/pages/detail-analysis.ts')}catch{}
 jev=await server.ssrLoadModule('/src/data/jev.ts');ads=await server.ssrLoadModule('/src/data/ads.ts')
 lifecycle=await server.ssrLoadModule('/src/lib/analysis-lifecycle.ts');registry=await server.ssrLoadModule('/src/lib/analysis-properties.ts')
})
beforeEach(()=>storage.clear())
after(async()=>{await server?.close();delete globalThis.window;delete globalThis.localStorage})
const id='1235086835413596'
function project(fixture){return detail.detailAnalysis(jev.getJevAnalysis(ads.adById(id)),lifecycle.getAnalysisLifecycle(id,{hasResult:true,fixture}),registry.getAnalysisProperties())}
test('result axes gate source evidence while failure and access overlays retain findings',()=>{
 assert.ok(detail,'detail projection exists')
 for(const state of ['not-analysed','queued','preparing','analysing'])assert.equal(project(state).properties.length,0)
 for(const state of ['complete','failed','stale','permission','readonly'])assert.equal(project(state).properties.length,41)
 assert.equal(project('partial').properties.filter(p=>p.status!=='pending').length,18)
 assert.equal(project('partial').properties.find(p=>p.id==='visual-language-1').evidence,undefined)
})
test('enabled custom definitions grow counts without invented results or losing historical definitions',()=>{
 assert.ok(detail)
 registry.saveAnalysisProperty({name:'New check',category:'Custom checks',description:'Manual definition'})
 registry.saveAnalysisProperty({id:'opening-1',name:'Opening approach'})
 const analysis=project('complete')
 assert.equal(analysis.properties.length,42)
 assert.equal(analysis.properties.at(-1).status,'unavailable')
 assert.equal(analysis.properties.at(-1).evidence,undefined)
 assert.equal(analysis.properties[0].label,'Opening approach')
 assert.equal(analysis.properties[0].definitionSnapshot.name,'Hook type')
 registry.saveAnalysisProperty({id:'opening-1',enabled:false})
 assert.equal(project('complete').properties.some(p=>p.id==='opening-1'),false)
})
test('finding filter combinations select real evidence by group confidence source assessment and origin',()=>{
 assert.ok(detail)
 const properties=project('complete').properties
 const params=new URLSearchParams('q=hook&category=Opening&assessment=assessed&confidence=high&source=Visual&origin=standard')
 assert.deepEqual(detail.filterDetailProperties(properties,params).map(p=>p.id),['opening-1'])
 assert.equal(detail.filterDetailProperties(properties,new URLSearchParams('assessment=unavailable')).length,1)
 assert.equal(detail.filterDetailProperties(properties,new URLSearchParams('status=pending')).length,2)
 assert.equal(detail.filterDetailProperties(properties,new URLSearchParams('confidence=low')).length,3)
})
test('an uploaded source never receives sample output even under complete preview',()=>{
 assert.ok(detail)
 const ad={...ads.adById(id),id:'upload-real',status:'uploaded',analysisStatus:'not-run'}
 const result=detail.detailAnalysis(jev.getJevAnalysis(ad),lifecycle.getAnalysisLifecycle(ad.id,{fixture:'complete'}),registry.getAnalysisProperties())
 assert.deepEqual(result.properties,[]);assert.deepEqual(result.transcript,[])
})

import assert from "node:assert/strict"
import {before,beforeEach,after,test} from "node:test"
import {createServer} from "vite"
let server,data,jev
const storage=new Map()
before(async()=>{
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}
  globalThis.window={localStorage:globalThis.localStorage}
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:"custom"})
  data=await server.ssrLoadModule("/src/data/ads.ts");jev=await server.ssrLoadModule("/src/data/jev.ts")
})
after(async()=>{await server?.close();delete globalThis.localStorage;delete globalThis.window})
beforeEach(()=>storage.clear())
test("confirming and correcting a sample finding retain source provenance while new human records stay local",async()=>{
  const workflow=await server.ssrLoadModule("/src/lib/iterations.ts")
  const seed=workflow.getWorkflowState().findings.find(item=>item.id==="finding-hook")
  assert.equal(seed.sample,true)
  for(const action of ["confirmed","corrected"]){
    assert.equal(jev.saveJevReview(data.adById(seed.adId),seed.propertyId,{action,value:action==="corrected"?"Quiet product opening":undefined,reason:"Checked the actual sample",reviewer:"You"},seed.id),true)
    assert.equal(workflow.getWorkflowState().findings.find(item=>item.id===seed.id).sample,true)
  }
  const ad=data.adById("1235086835413596")
  assert.equal(jev.saveJevReview(ad,"opening-2",{action:"confirmed",reason:"Checked",reviewer:"You"}),true)
  assert.equal(workflow.getWorkflowState().findings.find(item=>item.adId===ad.id&&item.propertyId==="opening-2").sample,false)
})
test("each actual sample ad has its own analysis and uploads never inherit it",()=>{
  assert.equal(typeof jev.getJevAnalysis,"function")
  const ads=data.sampleAdIds.map(data.adById)
  const analyses=ads.map(jev.getJevAnalysis)
  assert.equal(analyses[0].properties.length,41)
  assert.notEqual(analyses[0].properties[0].value,analyses[1].properties[0].value)
  assert.notDeepEqual(analyses[0].transcript,analyses[1].transcript)
  const upload={...ads[0],id:"upload-real-file",status:"uploaded",analysisStatus:"not-run"}
  assert.deepEqual(jev.getJevAnalysis(upload).properties,[])
  assert.deepEqual(jev.getJevAnalysis(upload).transcript,[])
  assert.equal(jev.getJevAnalysis(upload).status,"not-run")
})
test("human corrections persist by ad and retain original evidence and model confidence",()=>{
  assert.equal(typeof jev.saveJevReview,"function")
  const ad=data.adById(data.sampleAdIds[0]),other=data.adById(data.sampleAdIds[1])
  const original=jev.getJevFindings(ad)[0]
  assert.equal(jev.saveJevReview(ad,original.id,{action:"corrected",value:"Product demonstration",reason:"Checked the opening frame",reviewer:"You"}),true)
  const corrected=jev.getJevFindings(ad)[0]
  assert.equal(corrected.value,"Product demonstration")
  assert.equal(corrected.originalValue,original.value)
  assert.deepEqual(corrected.evidence,original.evidence)
  assert.equal(corrected.confidence,original.confidence)
  assert.equal(corrected.review.reason,"Checked the opening frame")
  assert.equal(jev.getJevFindings(other)[0].review,undefined)
  assert.equal(jev.clearJevReview(ad.id,original.id),true)
  assert.equal(jev.getJevFindings(ad)[0].value,original.value)
})
test("confirmation is reversible and malformed or failed storage does not invent reviewed status",()=>{
  const ad=data.adById(data.sampleAdIds[0]),property="opening-1"
  assert.equal(typeof jev.saveJevReview,"function")
  assert.equal(jev.saveJevReview(ad,property,{action:"confirmed",reviewer:"You",reason:""}),true)
  assert.equal(jev.getJevFindings(ad)[0].review.action,"confirmed")
  assert.equal(jev.clearJevReview(ad.id,property),true)
  storage.set("butterfly:workflow:v1","{broken")
  assert.equal(jev.getJevFindings(ad)[0].review,undefined)
  const setItem=globalThis.localStorage.setItem;globalThis.localStorage.setItem=()=>{throw Error("Quota")}
  assert.equal(jev.saveJevReview(ad,property,{action:"confirmed",reviewer:"You",reason:""}),false)
  globalThis.localStorage.setItem=setItem
})

test("an exact finding ID selects and updates only that ad's workflow record",async()=>{
  const workflow=await server.ssrLoadModule("/src/lib/iterations.ts")
  const ad=data.adById("1235086835413596")
  for(const [id,value]of [["review-a","First review"],["review-b","Second review"]])workflow.upsertWorkflowFinding({id,adId:ad.id,propertyId:"opening-1",label:"Hook review",value,evidence:"Manual check",owner:"You",updatedAt:"2026-10-03T12:00:00Z",status:"corrected",sample:false,review:{action:"corrected",value,reason:"Checked",reviewer:"You",at:"2026-10-03T12:00:00Z"}})
  assert.equal(jev.getJevAnalysis(ad,"review-a").properties[0].value,"First review")
  assert.equal(jev.saveJevReview(ad,"opening-1",{action:"confirmed",reason:"Confirmed exact record",reviewer:"You"},"review-a"),true)
  assert.equal(workflow.getWorkflowState().findings.find(item=>item.id==="review-a").value,"First review")
  assert.equal(jev.saveJevReview(ad,"opening-1",{action:"corrected",value:"Updated first",reason:"Second look",reviewer:"You"},"review-a"),true)
  assert.equal(workflow.getWorkflowState().findings.find(item=>item.id==="review-a").review.value,"Updated first")
  assert.equal(workflow.getWorkflowState().findings.find(item=>item.id==="review-b").review.value,"Second review")
})

import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { before, after, test } from "node:test"
import { createServer } from "vite"

let server, library = {}, data, groups
const saved = new Map()
before(async () => {
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) }
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" })
  data = await server.ssrLoadModule("/src/data/ads.ts")
  groups = await server.ssrLoadModule("/src/lib/groups.ts")
  if (existsSync("src/lib/library.ts")) library = await server.ssrLoadModule("/src/lib/library.ts")
})
after(async () => { await server?.close(); delete globalThis.localStorage })

function state(query = "") {
  assert.equal(typeof library.readLibraryState, "function", "Tested URL-backed library selectors are missing")
  return library.readLibraryState(new URLSearchParams(query))
}
const sample = () => data.sampleAdIds.map(id => data.adById(id))

test("date boundaries filter actual creative dates and seven-day activity excludes inactive sample ads", () => {
  assert.deepEqual(library.selectLibraryAds?.(sample(), state("from=2026-06-20&to=2026-06-30"), [] ).map(ad => ad.id), ["1235086835413596", "2529793287483755"])
  assert.deepEqual(library.selectLibraryAds(sample(), state("range=7"), []).map(ad => ad.id), ["1235086835413596", "2529793287483755"])
  assert.equal(library.selectLibraryAds(sample(), state("from=2026-07-01"), []).length, 0)
})

test("JEV filtering uses each ad's supplied finding and never borrows a global result", () => {
  const records = sample()
  const findings = {
    [records[0].id]: [{ id: "opening-1", label: "Hook type", value: "Routine", status: "ready" }],
    [records[1].id]: [{ id: "opening-1", label: "Hook type", value: "Product", status: "ready" }],
  }
  assert.deepEqual(library.selectLibraryAds?.(records, state("property=opening-1&value=Product"), [], findings).map(ad => ad.id), ["2529793287483755"])
  assert.equal(library.selectLibraryAds(records, state("property=opening-1"), []).length, 0)
})

test("URL changes preserve filters and ordering, reset pagination, and detail links carry exact context", () => {
  const original = new URLSearchParams("q=serum&range=90&view=groups&group=ritual&sort=name&direction=ascending&page=3&layout=table&state=partial")
  assert.equal(typeof library.updateLibrarySearch, "function")
  const next = library.updateLibrarySearch(original, { placement: "Instagram Stories" })
  assert.equal(next.get("page"), null)
  for (const key of ["q", "range", "view", "group", "sort", "direction", "layout", "state"]) assert.equal(next.get(key), original.get(key))
  const href = new URL(library.libraryDetailHref("2529793287483755", next, ["2529793287483755", "1235086835413596"], "app.butterfly.example.com"), "https://app.butterfly.example.com")
  assert.equal(href.pathname, "/ads/2529793287483755")
  assert.equal(href.searchParams.get("sourceAds"), "2529793287483755,1235086835413596")
  assert.equal(href.searchParams.get("returnTo"), `/ads?${next}`)
  assert.equal(href.searchParams.get("q"), "serum")
})

test("comparison accepts exactly two to four ads in visible order and rejects hidden or oversized selections", () => {
  assert.equal(typeof library.comparisonAds, "function")
  const rows = sample()
  assert.equal(library.comparisonAds(rows, [rows[0].id]).length, 0)
  assert.deepEqual(library.comparisonAds(rows, [rows[2].id, rows[0].id]).map(ad => ad.id), [rows[0].id, rows[2].id])
  assert.equal(library.comparisonAds(rows, [rows[0].id, "missing"]).length, 0)
  const five = data.ads.slice(0, 5)
  assert.equal(library.comparisonAds(five, five.map(ad => ad.id)).length, 0)
  assert.equal(library.comparisonAds(five, five.slice(0,4).map(ad => ad.id)).length, 4)
})

test("saved groups survive reload, deduplicate membership and tolerate null legacy entries", () => {
  const id = sample()[0].id
  saved.set("butterfly-ad-groups", JSON.stringify([null, { id: "keep", name: "Keep", adIds: [id,id,null,"deleted"] }]))
  assert.deepEqual(groups.readGroups(), [{id:"keep",name:"Keep",adIds:[id]}])
  groups.writeGroups([{id:"persist",name:"Renamed group",adIds:[id]}])
  assert.deepEqual(groups.readGroups(), [{id:"persist",name:"Renamed group",adIds:[id]}])
  groups.writeGroups([])
  assert.deepEqual(groups.readGroups(), [])
})

test("creative aspect ratios preserve square and landscape while Reels and Stories use portrait stages", () => {
  assert.equal(typeof library.creativeAspectRatio, "function")
  const ad = sample()[0]
  assert.equal(library.creativeAspectRatio({...ad,placement:"Facebook Feed",w:1200,h:1200}), "1200 / 1200")
  assert.equal(library.creativeAspectRatio({...ad,placement:"Facebook Feed",w:1920,h:1080}), "1920 / 1080")
  assert.equal(library.creativeAspectRatio({...ad,placement:"Instagram Reels",w:1920,h:1080}), "9 / 16")
  assert.equal(library.creativeAspectRatio({...ad,placement:undefined,w:0,h:0}), "1 / 1")
})

test("Saved group filters the all-ads library without switching the management tab", () => {
  const group = { id:"review",name:"Review",adIds:["2529793287483755"] }
  assert.deepEqual(library.selectLibraryAds(sample(),state("group=review"),[group]).map(ad=>ad.id),["2529793287483755"])
})

test("detail navigation validates library IDs and return destination while preserving sibling context", () => {
  assert.equal(typeof library.detailNavigation,"function")
  const location={hostname:"app.butterfly.example.com",origin:"https://app.butterfly.example.com"}
  const params = new URLSearchParams({sourceAds:"2529793287483755,missing,1235086835413596,2529793287483755",returnTo:"/ads?group=review&layout=table",group:"review",layout:"table",sort:"name",direction:"descending"})
  const navigation=library.detailNavigation(sample(),"2529793287483755",params,location)
  assert.deepEqual(navigation.ids,["2529793287483755","1235086835413596"])
  assert.equal(navigation.index,0)
  assert.equal(navigation.backHref,"/ads?group=review&layout=table")
  assert.equal(navigation.siblingHref(-1),undefined)
  const next=new URL(navigation.siblingHref(1),location.origin)
  assert.equal(next.pathname,"/ads/1235086835413596")
  assert.equal(next.searchParams.get("group"),"review")
  assert.equal(next.searchParams.get("sourceAds"),"2529793287483755,1235086835413596")
  for (const destination of ["https://outside.example/ads","//outside.example/ads","javascript:alert(1)","/settings"]) {
    params.set("returnTo",destination)
    assert.equal(library.detailNavigation(sample(),"2529793287483755",params,location).backHref,"/ads")
  }
})

test("sibling navigation drops ad-specific workflow identities but preserves library context",()=>{
 const location={hostname:"app.butterfly.example.com",origin:"https://app.butterfly.example.com"}
 const identities={finding:"finding-hook",findingId:"exact-finding",draft:"sample-draft-proof",draftId:"exact-draft",version:"sample-version-application",versionId:"exact-version",change:"recorded-change"}
 for(const key of Object.keys(identities)){
  const params=new URLSearchParams({sourceAds:"2529793287483755,1235086835413596",returnTo:"/ads?group=review&layout=table",group:"review",sort:"name",range:"7",panel:"jev",property:"opening-1",ideate:"1",[key]:identities[key]})
  const next=new URL(library.detailNavigation(sample(),"2529793287483755",params,location).siblingHref(1),location.origin)
  for(const id of Object.keys(identities))assert.equal(next.searchParams.has(id),false)
  assert.equal(next.searchParams.has("ideate"),false)
  for(const preserved of ["sourceAds","returnTo","group","sort","range","panel","property"])assert.equal(next.searchParams.get(preserved),params.get(preserved))
 }
})

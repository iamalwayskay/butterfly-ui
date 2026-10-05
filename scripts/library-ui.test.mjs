import assert from "node:assert/strict"
import { before, after, test } from "node:test"
import { createServer } from "vite"
import { chromium } from "playwright"

let server, browser, base
before(async () => {
  server = await createServer({ server: { port: 0, host: "127.0.0.1" } })
  await server.listen()
  base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {}) })
})
after(async () => { await browser?.close(); await server?.close() })
async function pageFor(t, search = "") {
  const page = await browser.newPage({viewport:{width:1280,height:1000}})
  page.setDefaultTimeout(5000)
  t.after(()=>page.close())
  await page.addInitScript(()=>localStorage.setItem("butterfly-meta-connected","true"))
  await page.goto(`${base}/app/ads${search}`)
  await page.getByRole("heading",{name:"My Ads",exact:true}).waitFor()
  return page
}

async function pageForViewport(t, width, { collapsed = false, search = "" } = {}) {
  const page = await browser.newPage({viewport:{width,height:1000}})
  page.setDefaultTimeout(5000)
  t.after(()=>page.close())
  await page.addInitScript(({ collapsed })=>{
    localStorage.setItem("butterfly-meta-connected","true")
    localStorage.setItem("butterfly-sidebar-open",String(!collapsed))
  },{collapsed})
  await page.goto(`${base}/app/ads${search}`)
  await page.locator(".bf-page-header h1").waitFor()
  return page
}

test("real library filters activity, preserves URL-backed table order and supplies detail context", async t => {
  const page = await pageFor(t,"?range=7&sort=name&layout=table&q=routine")
  const name = "Evening Routine — Cut 02"
  const links = page.getByRole("link",{name,exact:true})
  assert.equal(await links.count(),1)
  assert.equal(await page.locator(".bf-data-table tbody tr").count(),1)
  const row = page.locator(".bf-data-table tbody tr").first()
  assert.equal(await row.locator(".bf-checkbox__label, a").filter({hasText:name}).filter({visible:true}).count(),1)
  assert.equal(await row.getByRole("checkbox",{name:`Select ${name}`,exact:true}).count(),1)
  const href = new URL(await links.getAttribute("href"),base)
  assert.equal(href.searchParams.get("sourceAds"),"1235086835413596")
  assert.equal(new URL(href.searchParams.get("returnTo"),base).searchParams.get("layout"),"table")
  await page.reload()
  assert.equal(await page.getByRole("button",{name:"Table",exact:true}).getAttribute("aria-pressed"),"true")
})

test("an inherited workspace delivery window is carried into the detail URL", async t => {
  const page = await pageFor(t)
  await page.evaluate(()=>localStorage.setItem("butterfly-default-range","90"))
  await page.reload()
  const link=page.getByRole("link",{name:"Evening Routine — Cut 02",exact:true})
  await link.waitFor()
  const href=new URL(await link.getAttribute("href"),base)
  assert.equal(href.searchParams.get("range"),"90")
  assert.equal(new URL(href.searchParams.get("returnTo"),base).searchParams.get("range"),"90")
})

for (const {width,collapsed} of [
  ...[1688,1510,1280,1024,900,768,620,540,390,320].map(width=>({width,collapsed:false})),
  ...[1688,1510,1280,1024,900].map(width=>({width,collapsed:true})),
]) test(`Library cards and toolbar use the available container at ${width}px ${collapsed ? "collapsed" : "expanded"}`, async t => {
  const page = await pageForViewport(t,width,{collapsed})
  const name = "Evening Routine — Cut 02"
  const card = page.getByRole("article",{name,exact:true})
  const stage = card.locator(".bf-creative-card__media")
  const image = stage.locator("img")
  const [cardGeometry,stageBox,imageBox,stageStyle] = await Promise.all([
    card.evaluate(node=>{
      const stage=node.querySelector(".bf-creative-card__media")
      const cardBox=node.getBoundingClientRect()
      const stageBox=stage.getBoundingClientRect()
      const style=getComputedStyle(node)
      return {
        border:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],
        radius:style.borderRadius,
        background:style.backgroundColor,
        shadow:style.boxShadow,
        leftGutter:stageBox.left-cardBox.left,
        rightGutter:cardBox.right-stageBox.right,
      }
    }),
    stage.boundingBox(),
    image.boundingBox(),
    stage.evaluate(element=>({aspectRatio:getComputedStyle(element).aspectRatio,borderTopWidth:getComputedStyle(element).borderTopWidth,objectFit:getComputedStyle(element.querySelector("img")).objectFit})),
  ])
  assert.deepEqual(cardGeometry.border,["0px","0px","0px","0px"])
  assert.equal(cardGeometry.radius,"0px")
  assert.equal(cardGeometry.background,"rgba(0, 0, 0, 0)")
  assert.equal(cardGeometry.shadow,"none")
  assert.ok(cardGeometry.leftGutter<=13.5,JSON.stringify(cardGeometry))
  assert.ok(cardGeometry.rightGutter>=13,JSON.stringify(cardGeometry))
  assert.ok(stageBox.height<=341,"compact media-object preview must stay bounded")
  assert.equal(stageStyle.aspectRatio,"9 / 16")
  assert.equal(stageStyle.borderTopWidth,"0px")
  assert.equal(stageStyle.objectFit,"contain")
  assert.ok(Math.abs(stageBox.width*16-stageBox.height*9)<1,"stage must be exactly 9:16")
  assert.ok(Math.abs(imageBox.width-stageBox.width)<1,"image and media must share a width")
  assert.ok(Math.abs(imageBox.height-stageBox.height)<1,"image and media must share a height")
  assert.equal(await card.getByText(name,{exact:true}).filter({visible:true}).count(),1)
  assert.equal(await card.getByRole("checkbox",{name:`Select ${name}`,exact:true}).count(),1)

  assert.equal(await page.getByRole("heading",{name:"My Ads",exact:true}).count(),1)
  assert.equal(await page.locator(".bf-page-tabs").getByRole("link",{name:"All Ads",exact:true}).count(),1)
  assert.equal(await page.locator(".bf-page-tabs").getByRole("link",{name:"Saved Groups",exact:true}).count(),1)
  assert.equal(await page.getByRole("heading",{name:"Creative Library",exact:true}).count(),1)

  const toolbar=page.locator(".library-toolbar")
  const [toolbarBox,gridBox]=await Promise.all([toolbar.boundingBox(),page.locator(".library-grid").boundingBox()])
  assert.ok(Math.abs(toolbarBox.x-gridBox.x)<=1,JSON.stringify({toolbarBox,gridBox}))
  assert.ok(Math.abs((toolbarBox.x+toolbarBox.width)-(gridBox.x+gridBox.width))<=1,JSON.stringify({toolbarBox,gridBox}))
  if(width<=390){
    const toolbarBounds=await toolbar.evaluate(node=>{
      const box=node.getBoundingClientRect()
      return {box:{left:box.left,right:box.right},children:[...node.children].map(child=>{const childBox=child.getBoundingClientRect();return {left:childBox.left,right:childBox.right}})}
    })
    assert.ok(toolbarBounds.children.every(child=>child.left>=toolbarBounds.box.left-.5&&child.right<=toolbarBounds.box.right+.5),JSON.stringify(toolbarBounds))
    const primary=toolbar.locator(".library-toolbar__primary")
    assert.equal(await primary.getByLabel("Search Ads",{exact:true}).count(),1)
    assert.equal(await primary.getByRole("button",{name:/^Filters/}).count(),1)
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width)
})

test("comparison appears only for valid selection counts and aligns shared property rows", async t => {
  const page = await pageFor(t)
  await page.getByRole("checkbox",{name:"Select Evening Routine — Cut 02",exact:true}).check()
  assert.equal(await page.getByRole("button",{name:"Compare",exact:true}).count(),0)
  await page.getByText("Select one more ad to compare.",{exact:true}).waitFor()
  await page.getByRole("checkbox",{name:"Select Serum Still Life — Cut 01",exact:true}).check()
  await page.getByRole("button",{name:"Compare",exact:true}).click()
  await page.getByRole("table",{name:"Selected ad comparison"}).waitFor()
  assert.equal(await page.getByRole("table",{name:"Selected ad comparison"}).count(),1)
  assert.equal(await page.getByRole("rowheader",{name:"Hook type",exact:true}).count(),1)
  assert.equal(await page.getByRole("columnheader").count(),3)
})

test("a real uploaded diptych keeps its non-Reels ratio and explains missing session media after reload", async t => {
  const page = await pageFor(t)
  await page.evaluate(async () => {
    const { addLocalAd } = await import("/src/data/ads.ts")
    const blob = await fetch("/brand/kindred-campaign-diptych.png").then(response=>response.blob())
    const image = await createImageBitmap(blob)
    addLocalAd(new File([blob],"Campaign diptych.png",{type:blob.type}),URL.createObjectURL(blob),{w:image.width,h:image.height})
  })
  await page.reload()
  const card = page.getByRole("article",{name:"Campaign diptych.png",exact:true})
  await card.waitFor()
  assert.equal(await card.locator(".bf-creative-card__media").evaluate(e=>getComputedStyle(e).aspectRatio),"1330 / 1182")
  assert.equal(await card.getByText("Media unavailable",{exact:true}).count(),1)
  assert.equal(await card.getByText("JEV analysis: Not run",{exact:true}).count(),1)
  assert.equal(await card.getByText("No delivery data",{exact:true}).count(),1)
})

test("mobile filter sheet applies creative dates, restores focus and keeps selections honest", async t => {
  const page = await pageFor(t)
  await page.setViewportSize({width:390,height:844})
  const trigger = page.getByRole("button",{name:/^Filters/})
  await trigger.click()
  await page.getByRole("button",{name:/^Creative added/}).click()
  const calendar = page.getByRole("dialog",{name:"Creative added calendar"})
  for(let month=0;month<4;month++)await calendar.getByRole("button",{name:"Previous month"}).click()
  await calendar.getByRole("gridcell",{name:"June 20, 2026"}).click()
  await calendar.getByRole("gridcell",{name:"June 30, 2026"}).click()
  await page.keyboard.press("Escape")
  assert.equal(await trigger.evaluate(e=>e===document.activeElement),true)
  assert.equal(await page.locator(".bf-creative-card").count(),2)
  assert.equal(new URL(page.url()).searchParams.get("from"),"2026-06-20")
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390)
})

test("group create rename membership removal and delete persist across reload", async t => {
  const page = await pageFor(t,"?view=groups")
  await page.getByRole("button",{name:"New Group",exact:true}).click()
  await page.getByLabel("Group name",{exact:true}).fill("Session review")
  await page.getByRole("button",{name:"Create Group",exact:true}).click()
  await page.reload()
  assert.equal(await page.getByRole("button",{name:/Session review/}).count()>0,true)
  await page.getByRole("button",{name:"Rename Group",exact:true}).click()
  await page.getByLabel("Group name",{exact:true}).fill("Review again")
  await page.getByRole("button",{name:"Save Group Name",exact:true}).click()
  await page.getByRole("link",{name:"All Ads",exact:true}).click()
  await page.getByRole("button",{name:"Remove Saved group: Review again",exact:true}).click()
  await page.getByRole("checkbox",{name:"Select Evening Routine — Cut 02",exact:true}).check()
  await page.getByLabel("Add selected ads to group",{exact:true}).selectOption({label:"Review again"})
  await page.getByRole("link",{name:"Saved Groups",exact:true}).click()
  await page.getByRole("button",{name:/Review again/}).first().click()
  await page.getByRole("checkbox",{name:"Select Evening Routine — Cut 02",exact:true}).check()
  await page.getByRole("button",{name:"Remove From Group",exact:true}).click()
  await page.reload()
  assert.equal(await page.locator(".bf-creative-card").count(),0)
  await page.getByRole("button",{name:"Delete Group",exact:true}).click()
  await page.getByRole("button",{name:"Delete Group",exact:true}).click()
  await page.reload()
  assert.equal(await page.getByRole("button",{name:/Review again/}).count(),0)
})

test("a group storage failure stays visible inside the editable group sheet", async t => {
  const page = await pageFor(t,"?view=groups")
  await page.getByRole("button",{name:"New Group",exact:true}).click()
  await page.getByLabel("Group name",{exact:true}).fill("Unsaved group")
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==="butterfly-ad-groups")throw new Error("Storage full");return original.call(this,key,value)}})
  await page.getByRole("button",{name:"Create Group",exact:true}).click()
  const sheet = page.getByRole("dialog",{name:"New Group",exact:true})
  assert.equal(await sheet.getByText(/Could not save groups/).count(),1)
  assert.equal(await page.getByLabel("Group name",{exact:true}).inputValue(),"Unsaved group")
})

test("pagination keeps selected ads and ordering across pages and reload", async t => {
  const page = await pageFor(t)
  await page.evaluate(async () => {
    const { addLocalAd } = await import("/src/data/ads.ts")
    const paths = ["/brand/kindred-campaign-diptych.png", "/brand/kindred-campaign-hands.png", "/ads/1235086835413596.jpg", "/ads/2529793287483755.jpg"]
    for (let index=0; index<10; index++) {
      const blob = await fetch(paths[index%paths.length]).then(response=>response.blob())
      const image = await createImageBitmap(blob)
      addLocalAd(new File([blob],`Pagination creative ${index+1}`,{type:blob.type}),URL.createObjectURL(blob),{w:image.width,h:image.height})
    }
  })
  await page.reload()
  assert.equal(await page.locator(".bf-creative-card").count(),12)
  await page.getByRole("checkbox",{name:"Select Evening Routine — Cut 02",exact:true}).check()
  await page.getByRole("button",{name:"Next page",exact:true}).click()
  await page.waitForURL(/page=2/)
  await page.waitForFunction(()=>document.querySelectorAll(".bf-creative-card").length===1)
  assert.equal(await page.locator(".bf-creative-card").count(),1)
  assert.equal(await page.getByRole("button",{name:"Compare",exact:true}).count(),0)
  await page.reload()
  await page.locator(".bf-creative-card").first().waitFor()
  assert.equal(await page.locator(".bf-creative-card").count(),1)
  assert.equal(new URL(page.url()).searchParams.get("page"),"2")
})

test("an empty read-only library does not offer a mutation action", async t => {
  const page = await browser.newPage()
  t.after(()=>page.close())
  await page.goto(`${base}/app/ads?state=readonly`)
  await page.getByRole("heading",{name:"Add Your First Creative",exact:true}).waitFor()
  assert.equal(await page.locator(".library-workspace").getByRole("link",{name:"Add Ads",exact:true}).count(),0)
})

test("detail previous next and Back retain filtered group order and exact library context", async t => {
  const query="?view=groups&group=barrier-cream-tests&sort=name&direction=descending&layout=table&range=90&campaign=Daily+ritual"
  const page=await pageFor(t,query)
  await page.getByRole("link",{name:"Serum Still Life — Cut 01",exact:true}).click()
  await page.getByRole("heading",{name:"Serum Still Life — Cut 01",exact:true}).waitFor()
  assert.equal(await page.getByRole("button",{name:"Previous Ad",exact:true}).isDisabled(),true)
  await page.getByRole("button",{name:"Next Ad",exact:true}).click()
  await page.getByRole("heading",{name:"Evening Routine — Cut 02",exact:true}).waitFor()
  assert.equal(await page.getByRole("button",{name:"Next Ad",exact:true}).isDisabled(),true)
  await page.getByRole("button",{name:"Previous Ad",exact:true}).click()
  await page.getByRole("heading",{name:"Serum Still Life — Cut 01",exact:true}).waitFor()
  await page.locator(".ad-detail-back").click()
  await page.getByRole("heading",{name:"My Ads",exact:true}).waitFor()
  assert.equal(new URL(page.url()).search,query)
  assert.equal(await page.locator(".bf-data-table tbody tr").count(),2)
})

for(const [kind,id,other,record] of [
 ["finding","2529793287483755","1235086835413596",{finding:"finding-hook",findingId:"finding-hook",panel:"jev",property:"opening-1"}],
 ["draft","2529793287483755","1235086835413596",{draft:"sample-draft-hook",ideate:"1",panel:"jev",property:"opening-1"}],
 ["version","1235086835413596","2529793287483755",{version:"sample-version-application",versionId:"sample-version-application",change:"sample-version-application",panel:"notes"}],
])test(`detail sibling movement clears the exact ${kind} identity and keeps library return context`,async t=>{
 const page=await pageFor(t),returnTo="/app/ads?group=barrier-cream-tests&layout=table&sort=name"
 const params=new URLSearchParams({...record,sourceAds:`${id},${other}`,returnTo,group:"barrier-cream-tests",sort:"name",range:"7"})
 await page.goto(`${base}/app/ads/${id}?${params}`)
 if(kind==="draft")await page.getByRole("dialog",{name:"JEV Neural Ideation",exact:true}).getByRole("button",{name:"Close",exact:true}).first().click()
 if(kind==="finding"){await page.getByRole("dialog",{name:/^Evidence:/}).waitFor();await page.keyboard.press("Escape")}
 await page.getByRole("button",{name:"Next Ad",exact:true}).click()
 const next=new URL(page.url());assert.equal(next.pathname,`/app/ads/${other}`)
 for(const key of ["finding","findingId","draft","draftId","version","versionId","change","changeId","ideate"])assert.equal(next.searchParams.has(key),false)
 for(const key of ["sourceAds","returnTo","group","sort","range"])assert.equal(next.searchParams.get(key),params.get(key))
 if(record.panel==="jev"){await page.getByRole("dialog",{name:/^Evidence:/}).waitFor();await page.keyboard.press("Escape")}
 await page.getByRole("heading",{name:other==="1235086835413596"?"Evening Routine — Cut 02":"Serum Still Life — Cut 01",exact:true}).waitFor()
 await page.getByRole("button",{name:"Previous Ad",exact:true}).click()
 if(record.panel==="jev"){await page.getByRole("dialog",{name:/^Evidence:/}).waitFor();await page.keyboard.press("Escape")}
 await page.getByRole("heading",{name:id==="1235086835413596"?"Evening Routine — Cut 02":"Serum Still Life — Cut 01",exact:true}).waitFor()
 assert.equal(new URL(page.url()).pathname,`/app/ads/${id}`)
 await page.locator(".ad-detail-back").click()
 assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,returnTo)
})

test("searchable JEV pickers and Saved group filter scope all ads with per-ad values", async t => {
  const page=await pageFor(t)
  await page.getByRole("button",{name:/^Filters/}).click()
  const sheet=page.getByRole("dialog",{name:"Filter Ads",exact:true})
  await sheet.getByRole("combobox",{name:/JEV property/}).click()
  await sheet.getByRole("combobox",{name:"Search JEV property",exact:true}).fill("Hook type")
  await sheet.getByRole("option",{name:"Hook type",exact:true}).click()
  await sheet.getByRole("combobox",{name:/JEV finding/}).click()
  await sheet.getByRole("combobox",{name:"Search JEV finding",exact:true}).fill("Product still life")
  await sheet.getByRole("option",{name:"Product still life",exact:true}).click()
  await sheet.getByRole("combobox",{name:/Saved group/}).click()
  await sheet.getByRole("combobox",{name:"Search Saved group",exact:true}).fill("Daily ritual")
  await sheet.getByRole("listbox",{name:"Saved group",exact:true}).getByRole("option",{name:"Daily ritual",exact:true}).click()
  await sheet.getByRole("button",{name:"Done",exact:true}).click()
  await page.waitForFunction(()=>document.querySelectorAll(".bf-creative-card").length===1)
  await page.getByRole("article",{name:"Serum Still Life — Cut 01",exact:true}).waitFor()
  assert.equal(await page.getByRole("article",{name:"Serum Still Life — Cut 01",exact:true}).count(),1)
  assert.notEqual(new URL(page.url()).searchParams.get("view"),"groups")
  assert.equal(new URL(page.url()).searchParams.get("group"),"barrier-cream-tests")
})

test("Enter on an uploaded card keeps its current-session media and truth guard", async t => {
  const page=await pageFor(t)
  await page.evaluate(async()=>{
    const {addLocalAd}=await import("/src/data/ads.ts")
    const blob=await fetch("/brand/kindred-campaign-hands.png").then(response=>response.blob())
    addLocalAd(new File([blob],"Keyboard creative.png",{type:blob.type}),URL.createObjectURL(blob),{w:941,h:1672})
    window.librarySessionMarker="retained"
  })
  await page.locator(".library-workspace").getByRole("link",{name:"Add Ads",exact:true}).click()
  await page.locator(".butterfly-sidebar").getByRole("link",{name:"My Ads",exact:true}).click()
  const link=page.getByRole("link",{name:"Keyboard creative.png",exact:true})
  await link.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("heading",{name:"JEV Analysis Has Not Run",exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>window.librarySessionMarker),"retained")
  assert.match(await page.locator(".detail-media .bf-media img").getAttribute("src"),/^blob:/)
  await page.locator(".ad-detail-back").click()
  await page.getByRole("article",{name:"Keyboard creative.png",exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>window.librarySessionMarker),"retained")
})

test("JEV picker opens with Enter and selects a searched finding with the keyboard",async t=>{
  const page=await pageFor(t)
  await page.getByRole("button",{name:/^Filters/}).click()
  const property=page.getByRole("combobox",{name:/JEV property/})
  await property.focus()
  await page.keyboard.press("Enter")
  const search=page.getByRole("combobox",{name:"Search JEV property",exact:true})
  await search.fill("Hook type")
  await page.keyboard.press("Enter")
  assert.equal(await property.getAttribute("aria-expanded"),"false")
  // Selection restores this trigger in requestAnimationFrame, after the popover unmounts.
  await page.waitForFunction(el=>el===document.activeElement,await property.elementHandle())
  const finding=page.getByRole("combobox",{name:/JEV finding/})
  await finding.focus()
  await page.keyboard.press("ArrowDown")
  await page.getByRole("combobox",{name:"Search JEV finding",exact:true}).fill("Product still life")
  await page.keyboard.press("Enter")
  await page.getByRole("button",{name:"Done",exact:true}).click()
  await page.getByRole("article",{name:"Serum Still Life — Cut 01",exact:true}).waitFor()
  assert.equal(await page.getByRole("article",{name:"Serum Still Life — Cut 01",exact:true}).count(),1)
})

test("mobile searchable picker reserves space above the sheet actions",async t=>{
  const page=await pageFor(t)
  await page.setViewportSize({width:390,height:844})
  await page.getByRole("button",{name:/^Filters/}).click()
  const sheet=page.getByRole("dialog",{name:"Filter Ads",exact:true})
  await sheet.getByRole("combobox",{name:/JEV property/}).click()
  const list=sheet.getByRole("listbox",{name:"JEV property",exact:true})
  await list.waitFor()
  // Opening autofocus scrolls the sheet; compare both rectangles in the same frame.
  const search=sheet.getByRole("combobox",{name:"Search JEV property",exact:true})
  await page.waitForFunction(el=>el===document.activeElement,await search.elementHandle())
  const {listBottom,actionTop}=await page.evaluate(({list,action})=>({listBottom:list.getBoundingClientRect().bottom,actionTop:action.getBoundingClientRect().top}),{list:await list.elementHandle(),action:await sheet.getByRole("button",{name:"Clear All Filters",exact:true}).elementHandle()})
  assert.ok(listBottom<=actionTop,"Search results must not overlap the sheet action")
})

test("group comparison aligns only the saved group's members", async t => {
  const page=await pageFor(t,"?view=groups&group=barrier-cream-tests&sort=name")
  assert.equal(await page.getByRole("article").count(),2)
  for (const checkbox of await page.locator(".bf-creative-card").getByRole("checkbox").all()) await checkbox.check()
  await page.getByRole("button",{name:"Compare",exact:true}).click()
  const table=page.getByRole("table",{name:"Selected ad comparison"})
  await table.waitFor()
  assert.equal(await table.getByRole("columnheader").count(),3)
  assert.deepEqual(await table.locator("thead a").allTextContents(),["Evening Routine — Cut 02","Serum Still Life — Cut 01"])
})

test("three and four selected ads align; five removes the invalid comparison action and stale columns", async t => {
  const page=await pageFor(t)
  await page.evaluate(async()=>{
    const {addLocalAd}=await import("/src/data/ads.ts")
    for (const [path,name] of [["/brand/kindred-campaign-diptych.png","Comparison diptych"],["/brand/kindred-campaign-hands.png","Comparison hands"]]) {
      const blob=await fetch(path).then(response=>response.blob())
      const bitmap=await createImageBitmap(blob)
      addLocalAd(new File([blob],name,{type:blob.type}),URL.createObjectURL(blob),{w:bitmap.width,h:bitmap.height})
    }
  })
  await page.reload()
  await page.getByRole("article",{name:"Comparison hands",exact:true}).waitFor()
  const choices=page.locator(".bf-creative-card").getByRole("checkbox")
  for (let index=0;index<3;index++) await choices.nth(index).check()
  for (const count of [3,4]) {
    if(count===4) await choices.nth(3).check()
    await page.getByRole("button",{name:"Compare",exact:true}).click()
    const table=page.getByRole("table",{name:"Selected ad comparison"})
    await table.waitFor()
    assert.equal(await table.getByRole("columnheader").count(),count+1)
    for(const row of await table.locator("tbody tr").all()) assert.equal(await row.locator("td").count(),count)
    await page.getByRole("button",{name:"Return to Library",exact:true}).click()
  }
  await choices.nth(4).check()
  assert.equal(await page.getByRole("button",{name:"Compare",exact:true}).count(),0)
  await page.getByText("Select no more than 4 ads to compare.",{exact:true}).waitFor()
  assert.equal(await page.getByRole("table",{name:"Selected ad comparison"}).count(),0)
})

for (const [state,title] of [["loading","Loading Creative"],["empty","Add Your First Creative"],["partial","Some Delivery Data Is Unavailable"],["error","The Latest Sample Sync Did Not Finish"],["permission","You Can View but Not Change This Library"],["readonly","You Can View but Not Change This Library"],["missing-media",null]]) {
  test(`library state ${state} is explicit and recoverable without invented evidence`,async t=>{
    const page=await pageFor(t,`?state=${state}`)
    if(title) await page.getByRole("heading",{name:title,exact:true}).waitFor()
    if(state==="empty") assert.equal(await page.locator(".bf-creative-card").count(),0)
    else assert.equal(await page.locator(".bf-creative-card").count(),3)
    if(state==="permission" || state==="readonly") {
      assert.equal(await page.locator(".library-workspace").getByRole("checkbox").count(),0)
      assert.equal(await page.locator(".library-workspace").getByRole("link",{name:"Add Ads",exact:true}).count(),0)
    }
    if(state==="missing-media") {
      assert.equal(await page.getByText("Media unavailable",{exact:true}).count(),3)
      assert.equal(await page.getByRole("link",{name:"Reattach Media",exact:true}).count(),0,"Meta sample creatives cannot be replaced as local uploads")
    }
    if(state==="error") {
      await page.getByRole("button",{name:"Retry",exact:true}).click()
      await page.waitForURL(url=>!url.searchParams.has("state"))
      await page.getByRole("heading",{name:title,exact:true}).waitFor({state:"hidden"})
      assert.equal(await page.getByRole("heading",{name:title,exact:true}).count(),0)
    }
  })
}

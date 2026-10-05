import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createServer } from "vite"
import { chromium } from "playwright"

let server, browser, base
before(async () => {
  server = await createServer({server:{port:0,host:"127.0.0.1"},plugins:[{name:"foundations-fixture",configureServer(vite){vite.middlewares.use("/__foundations",(_request,response)=>{
    response.setHeader("Content-Type","text/html")
    response.end('<html><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module" src="/scripts/foundations.fixture.tsx"></script></body></html>')
  })}}]})
  await server.listen(); base=`http://127.0.0.1:${server.httpServer.address().port}`
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
})
after(async()=>{await browser?.close();await server?.close()})
async function pageFor(t,path="/__foundations",width=1280){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"})
  const errors=[];page.on("pageerror",error=>errors.push(error.message))
  t.after(async()=>{await page.close();assert.deepEqual(errors,[])})
  await page.goto(`${base}${path}`);await page.locator("h1").waitFor();return page
}

test("human roles use Archivo Narrow while compact data retains JetBrains Mono",async t=>{
  const page=await pageFor(t)
  for(const selector of ["h1","p",".bf-button",".bf-filter-label"]){
    const family=await page.locator(selector).first().evaluate(el=>getComputedStyle(el).fontFamily)
    assert.match(family,/Archivo Narrow/,`${selector} must use the human interface role`)
    assert.doesNotMatch(family,/Mono/,`${selector} must not use the compact data role`)
  }
  assert.match(await page.getByTestId("brand").evaluate(el=>getComputedStyle(el).fontFamily),/Archivo Narrow/)
  assert.match(await page.getByTestId("data").evaluate(el=>getComputedStyle(el).fontFamily),/JetBrains Mono/)
})
test("primary and outline actions expose the approved hierarchy",async t=>{
  const page=await pageFor(t)
  const primary=await page.getByRole("button",{name:"Create Batch",exact:true}).evaluate(el=>({bg:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}))
  assert.match(primary.bg,/rgb\(194, 24, 91\).*rgb\(139, 26, 117\)/)
  assert.equal(primary.color,"rgb(255, 255, 255)")
  assert.equal(await page.getByRole("button",{name:"Upload",exact:true}).evaluate(el=>getComputedStyle(el).borderTopWidth),"1px")
})
test("icon utilities keep 44px targets, keyboard tooltips, selected state and visible focus",async t=>{
  const page=await pageFor(t)
  for(const name of ["Add note","Selected tool","Compact action"]){const box=await page.getByRole("button",{name,exact:true}).boundingBox();assert.ok(box.width>=44&&box.height>=44,`${name}: ${box.width}×${box.height}`)}
  const control=page.getByRole("button",{name:"Add note",exact:true});await control.focus()
  assert.notEqual(await control.evaluate(el=>getComputedStyle(el).boxShadow),"none")
  await page.getByRole("tooltip",{name:"Add note",exact:true}).waitFor({timeout:1500})
  const normal=await control.evaluate(el=>getComputedStyle(el).backgroundColor)
  assert.notEqual(await page.getByRole("button",{name:"Selected tool",exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),normal)
})
test("combobox search owns the active option and Tab leaves the closed control in order",async t=>{
  const page=await pageFor(t)
  const trigger=page.getByRole("combobox",{name:/Account/}).first()
  await trigger.focus();await page.keyboard.press("Enter")
  const search=page.getByRole("combobox",{name:"Search Account",exact:true})
  await search.waitFor({timeout:1500})
  await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-autocomplete")==="list")
  assert.equal(await search.evaluate(el=>el===document.activeElement),true)
  const active=await search.getAttribute("aria-activedescendant");assert.ok(active)
  assert.equal(await page.locator(`[id="${active}"]`).textContent(),"Kindred")
  await page.keyboard.press("ArrowDown");await page.keyboard.press("Enter")
  assert.equal(await page.locator("output").textContent(),"other")
  await trigger.click();await search.waitFor();await page.keyboard.press("Tab")
  assert.equal(await page.getByRole("button",{name:"After account",exact:true}).evaluate(el=>el===document.activeElement),true)
  assert.equal(await page.getByRole("listbox").count(),0)
  await trigger.click();await search.waitFor();await page.keyboard.press("Shift+Tab")
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
  assert.equal(await page.getByRole("listbox").count(),0)
  await trigger.click();await search.fill("missing");assert.ok(await page.getByText("No options found.").isVisible())
  await page.keyboard.press("Escape");assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
  await trigger.click();await search.waitFor();await page.getByRole("button",{name:"Before account",exact:true}).click()
  assert.equal(await page.getByRole("listbox").count(),0)
})
test("clicking an open combobox trigger closes it and keeps focus on the trigger",async t=>{
  const page=await pageFor(t)
  const trigger=page.locator(".bf-combobox__trigger")
  await trigger.click()
  await page.getByRole("combobox",{name:"Search Account",exact:true}).waitFor()
  await trigger.click()
  assert.equal(await trigger.getAttribute("aria-expanded"),"false")
  assert.equal(await page.getByRole("listbox").count(),0)
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
  await trigger.click()
  await page.keyboard.press("Shift+Tab")
  assert.equal(await trigger.getAttribute("aria-expanded"),"false")
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
})

async function settledScroll(page){
  return page.evaluate(()=>new Promise(resolve=>{
    const started=performance.now()
    let previous="",stable=0
    const sample=()=>{
      const dialog=document.querySelector('[role="dialog"]')
      const current=JSON.stringify([scrollY,dialog?.scrollTop??null])
      stable=current===previous?stable+1:0;previous=current
      if(performance.now()-started>=300&&stable>=6)resolve(JSON.parse(current))
      else requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }))
}
test("dialogs and sheets bound their content and contain scroll on mobile",async t=>{
  const page=await pageFor(t,"/__foundations",390)
  assert.ok(await page.evaluate(()=>document.scrollingElement.scrollHeight>innerHeight+600),"background must be scrollable")
  await page.mouse.move(380,700);await page.mouse.wheel(0,300)
  assert.ok((await settledScroll(page))[0]>0,"control wheel must move the unblocked background")
  for(const kind of ["dialog","sheet"]){
    await page.evaluate(()=>scrollTo(0,0));await settledScroll(page)
    const opener=page.getByRole("button",{name:`Open ${kind}`,exact:true});await opener.click()
    const overlay=page.getByRole("dialog",{name:`Review ${kind}`,exact:true});await overlay.waitFor()
    const style=await overlay.evaluate(el=>({overscroll:getComputedStyle(el).overscrollBehaviorY,height:el.getBoundingClientRect().height,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}))
    assert.equal(style.overscroll,"contain");assert.ok(style.height<=900);assert.ok(style.scrollHeight>style.clientHeight)
    await overlay.evaluate(el=>{el.scrollTop=el.scrollHeight})
    const before=await settledScroll(page)
    await overlay.hover();await page.mouse.wheel(0,600)
    assert.deepEqual(await settledScroll(page),before,"wheel at the overlay boundary must not move overlay or background")
    await page.keyboard.press("Escape");await overlay.waitFor({state:"hidden"});await page.waitForFunction(name=>document.activeElement?.textContent===name,`Open ${kind}`);assert.equal(await opener.evaluate(el=>el===document.activeElement),true)
  }
})
test("desktop rail preserves 240/72px shell geometry and makes all rail controls 44px",async t=>{
  const page=await pageFor(t,"/app/ads")
  for(const width of [1688,1510,1280,1024,900]){
    await page.setViewportSize({width,height:900})
    assert.equal((await page.locator('[data-slot="sidebar-container"]').boundingBox()).width,240)
    await page.getByRole("button",{name:"Collapse Sidebar",exact:true}).click()
    await page.waitForFunction(()=>{
      const item=document.querySelector(".butterfly-nav-item")?.getBoundingClientRect()
      const inner=document.querySelector('[data-slot="sidebar-inner"]')?.getBoundingClientRect()
      return item&&inner&&Math.abs(item.x+item.width/2-(inner.x+inner.width/2))<=0.5
    },undefined,{timeout:1500})
    const rail=await page.locator('[data-slot="sidebar-container"]').boundingBox();assert.equal(rail.width,72)
    assert.equal((await page.locator("#workspace-main").boundingBox()).x,72)
    for(const selector of [".butterfly-nav-item",".butterfly-account-trigger",".butterfly-user-trigger",".butterfly-collapse-control"]){
      const boxes=await page.locator(selector).evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,center:r.x+r.width/2}}))
      for(const box of boxes){assert.ok(box.width>=44&&box.height>=44,`${selector}: ${JSON.stringify(box)}`);assert.ok(Math.abs(box.center-35.5)<=0.5,`${width}px ${selector} must share the rail axis: ${JSON.stringify(box)}`)}
    }
    await page.getByRole("button",{name:"Expand Sidebar",exact:true}).click()
  }
  await page.getByRole("button",{name:"Collapse Sidebar",exact:true}).click();await page.reload()
  await page.getByRole("button",{name:"Expand Sidebar",exact:true}).waitFor()
  assert.equal((await page.locator("#workspace-main").boundingBox()).x,72)
})
test("mobile navigation restores focus or focuses the destination at every drawer width",async t=>{
  const page=await pageFor(t,"/app/ads",390)
  for(const width of [768,620,540,390,320]){
    await page.setViewportSize({width,height:900})
    const opener=page.getByRole("button",{name:"Open navigation",exact:true});await opener.click()
    const drawer=page.locator('[data-slot="sidebar"][data-mobile="true"]');await drawer.waitFor()
    assert.equal((await drawer.boundingBox()).width,288)
    await page.keyboard.press("Escape");await drawer.waitFor({state:"hidden"});await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Open navigation");assert.equal(await opener.evaluate(el=>el===document.activeElement),true)
  }
  await page.getByRole("button",{name:"Open navigation",exact:true}).click()
  await page.locator('[data-mobile="true"]').getByRole("link",{name:"Team",exact:true}).click()
  await page.locator('[data-mobile="true"]').waitFor({state:"hidden"})
  await page.waitForFunction(()=>document.activeElement?.id==="workspace-main")
  assert.equal(await page.locator("#workspace-main").evaluate(el=>el===document.activeElement),true)
})

test("shell human labels avoid data typography",async t=>{
  const page=await pageFor(t,"/app/ads")
  for(const selector of [".butterfly-nav-group-label",".butterfly-account-tile",".butterfly-user-avatar"]){
    assert.doesNotMatch(await page.locator(selector).first().evaluate(el=>getComputedStyle(el).fontFamily),/Mono/)
  }
})
test("active shell navigation keeps contrasting keyboard focus",async t=>{
  const page=await pageFor(t,"/app/ads")
  const active=page.locator('.butterfly-nav-item[aria-current="page"]')
  await page.keyboard.press("Tab");await active.focus()
  assert.match(await active.evaluate(el=>getComputedStyle(el).boxShadow),/rgb\(255, 255, 255\)/)
})

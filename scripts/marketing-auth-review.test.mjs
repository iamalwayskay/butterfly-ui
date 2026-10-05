import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { mkdir } from "node:fs/promises"
import { createServer } from "vite"
import { chromium } from "playwright"

let server, browser, publicBase, appBase
const shots = "/tmp/butterfly-task7-fix-shots"

before(async () => {
  server = await createServer({server:{host:"127.0.0.1",port:0}})
  await server.listen()
  const port = server.httpServer.address().port
  publicBase = `http://127.0.0.1:${port}`
  appBase = `http://app.butterfly.localhost:${port}`
  browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})})
  await mkdir(shots,{recursive:true})
})

after(async () => { await browser?.close(); await server?.close() })

async function pageFor(t,{width=390,reducedMotion="no-preference",app=false,path="/"}={}) {
  const context = await browser.newContext({viewport:{width,height:900},reducedMotion})
  const page = await context.newPage()
  const errors=[]
  page.on("pageerror",error=>errors.push(error.message))
  t.after(async()=>{await context.close();assert.deepEqual(errors,[])})
  await page.goto((app?appBase:publicBase)+path)
  return page
}

async function expectFocused(locator) {
  await locator.waitFor()
  assert.equal(await locator.evaluate(node=>node===document.activeElement),true)
}

test("mobile marketing navigation is modal, scroll-contained and restores or transfers focus",async t=>{
  const page=await pageFor(t)
  const opener=page.getByRole("button",{name:"Open navigation",exact:true})
  await opener.click()
  const dialog=page.getByRole("dialog",{name:"Main Navigation",exact:true})
  await dialog.waitFor()
  assert.equal(await dialog.getAttribute("aria-modal"),"true")
  assert.equal(await page.locator("#root").getAttribute("aria-hidden"),"true")
  await expectFocused(dialog.getByRole("link",{name:"Product",exact:true}))
  const before=await page.evaluate(()=>scrollY)
  await page.mouse.move(20,700);await page.mouse.wheel(0,700)
  assert.equal(await page.evaluate(()=>scrollY),before)
  await dialog.getByRole("button",{name:"Close navigation",exact:true}).click()
  await expectFocused(opener)

  await page.evaluate(()=>scrollTo(0,650))
  await page.screenshot({path:`${shots}/marketing-390-scrolled.png`,fullPage:false})
  await page.evaluate(()=>scrollTo(0,0));await opener.click()
  await dialog.getByRole("link",{name:"How It Works",exact:true}).click()
  await dialog.waitFor({state:"hidden"})
  await expectFocused(page.getByRole("heading",{name:"From Creative to the Next Test.",exact:true}))
})

test("reduced motion opens on the first link and anchor navigation focuses its heading",async t=>{
  const page=await pageFor(t,{reducedMotion:"reduce"})
  await page.getByRole("button",{name:"Open navigation",exact:true}).click()
  const dialog=page.getByRole("dialog",{name:"Main Navigation",exact:true})
  await expectFocused(dialog.getByRole("link",{name:"Product",exact:true}))
  await page.screenshot({path:`${shots}/marketing-390-reduced-menu.png`})
  await dialog.getByRole("link",{name:"Your Data",exact:true}).click()
  await dialog.waitFor({state:"hidden"})
  await expectFocused(page.getByRole("heading",{name:"A Truthful Demo, Ready for the Real Services.",exact:true}))
})

for(const width of [390,320])test(`${width}px marketing and verification controls retain 44px targets`,async t=>{
  const marketing=await pageFor(t,{width})
  const footerSignIn=marketing.locator(".landing-footer").getByRole("link",{name:"Sign In",exact:true})
  let box=await footerSignIn.boundingBox();assert.ok(box.width>=44&&box.height>=44)
  await marketing.getByRole("button",{name:"Open navigation",exact:true}).click()
  const dialog=marketing.getByRole("dialog",{name:"Main Navigation",exact:true})
  for(const target of await dialog.locator("a,button").all()){box=await target.boundingBox();assert.ok(box.width>=44&&box.height>=44)}
  await pageWait(marketing,550)
  await marketing.screenshot({path:`${shots}/marketing-${width}-menu.png`})

  const login=await pageFor(t,{width,app:true,path:"/login?state=verifying"})
  for(const input of await login.locator(".bf-otp input").all()){box=await input.boundingBox();assert.ok(box.width>=44&&box.height>=44)}
  assert.equal(await login.getByLabel("Verification code, digit 1 of 6",{exact:true}).inputValue(),"2")
  await login.screenshot({path:`${shots}/login-${width}-verifying.png`})
})

function pageWait(page,ms){return page.waitForTimeout(ms)}

test("hero geometry paints behind the product preview in its own stacking context",async t=>{
  const page=await pageFor(t,{width:1280})
  const layers=await page.evaluate(()=>{
    const geometry=document.querySelector(".landing-geometry")
    const preview=document.querySelector(".landing-preview")
    return {sameContext:geometry.parentElement===preview.parentElement,geometry:Number(getComputedStyle(geometry).zIndex),preview:Number(getComputedStyle(preview).zIndex)}
  })
  assert.equal(layers.sameContext,true,"brand geometry must not escape a higher sibling stacking context")
  assert.ok(layers.geometry<layers.preview)
})

for (const width of [1280,390,320]) test(`${width}px marketing CTAs open their named sample destinations with mouse and keyboard`,async t=>{
  const page=await pageFor(t,{width})
  await page.screenshot({path:`${shots}/marketing-${width}-full.png`,fullPage:true})
  console.log(`Marketing ${width}px document height: ${await page.evaluate(()=>document.documentElement.scrollHeight)}`)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  for(const [name,path] of [
    ["Explore Sample Account","/app/add?tab=meta"],
    ["Explore the Review","/app/ads/1277290320948697?panel=jev&fixture-count=3"],
  ]) {
    for(const keyboard of [false,true]) {
      await page.goto(publicBase)
      const link=page.getByRole("link",{name,exact:true}).first()
      assert.equal(await link.getAttribute("href"),path)
      if(keyboard){await link.focus();await page.keyboard.press("Enter")}
      else await link.click()
      await page.waitForURL(`${publicBase}${path}`)
      await page.getByRole("heading",{name:name==="Explore Sample Account"?"Add Ads":"First Drop — Cut 03",exact:true}).first().waitFor()
      assert.doesNotMatch(await page.locator("body").innerText(),/Ad Not Found|This Ad Is Not in Your Library/)
    }
  }
  for (const path of ["/app/add?tab=upload","/app/ads?view=all&fixture-count=3","/app/ads/1277290320948697?panel=jev&view=transcript&fixture-count=3","/app/settings?tab=analysis-properties","/app/create?step=copy","/app/canvas","/app/work?view=drafts","/app/team","/login"]) {
    for (const keyboard of [false,true]) {
      await page.goto(publicBase)
      const link=page.locator(`a[href="${path}"]:visible`).first()
      if(keyboard){await link.focus();await page.keyboard.press("Enter")}
      else await link.click()
      await page.waitForURL(`${publicBase}${path}`)
      await page.getByRole("heading").first().waitFor()
      assert.doesNotMatch(await page.locator("body").innerText(),/Ad Not Found|This Ad Is Not in Your Library/)
      if(path.includes("fixture-count=3")) {
        if(path.includes("view=all")) await page.getByRole("link",{name:/First Drop — Cut 03/}).first().waitFor()
        if(path.includes("view=transcript")) await page.getByRole("region",{name:"Transcript & Timeline",exact:true}).waitFor()
      }
    }
  }
  assert.deepEqual(await page.evaluate(()=>["butterfly-meta-connected","butterfly-meta-ever-configured","butterfly-meta-account","butterfly-local-uploads"].map(key=>localStorage.getItem(key))),[null,null,null,null],"public sample previews must not import an account or alter uploads")
})

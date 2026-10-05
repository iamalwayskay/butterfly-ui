import assert from 'node:assert/strict'
import {before,after,test} from 'node:test'
import {createServer} from 'vite'
import {chromium} from 'playwright'

let server,browser,base
before(async()=>{server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();base=`http://app.butterfly.localhost:${server.httpServer.address().port}`;browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})})
after(async()=>{await browser?.close();await server?.close()})
async function pageFor(t,path,width=390){const context=await browser.newContext({viewport:{width,height:700}});const page=await context.newPage();page.setDefaultTimeout(3000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('butterfly-fixture-authenticated','true');localStorage.setItem('butterfly-meta-connected','true');sessionStorage.setItem('seeded','true')}});t.after(async()=>{await context.close();assert.deepEqual(errors,[])});await page.goto(base+path);await page.locator('h1').waitFor();return page}
async function focused(locator){await locator.page().waitForFunction(el=>el===document.activeElement,await locator.elementHandle())}
function capturePageErrors(page){
 const errors=[]
 const knownFavicon=(url,status)=>status===404 && url===new URL('/favicon.ico',page.url()).href
 page.on('console',message=>{if(message.type()==='error'&&!knownFavicon(message.location().url,message.text().includes('404')?404:0))errors.push(`${message.location().url}: ${message.text()}`)})
 page.on('response',response=>{if(response.status()>=400&&!knownFavicon(response.url(),response.status()))errors.push(`${response.status()} ${response.url()}`)})
 return errors
}

test('route sweep reports missing creative resources but ignores only its favicon 404',async t=>{
 const page=await pageFor(t,'/ads');const errors=capturePageErrors(page)
 for(const path of ['/favicon.ico','/missing-creative-regression.png'])await page.route(base+path,route=>route.fulfill({status:404,body:'Not found'}))
 const loadImage=path=>page.evaluate(path=>new Promise(resolve=>{const image=new Image();image.onload=image.onerror=()=>resolve();image.src=path;document.body.append(image)}),path)
 await loadImage('/favicon.ico');assert.deepEqual(errors,[])
 await loadImage('/missing-creative-regression.png');assert.ok(errors.some(error=>error.includes('/missing-creative-regression.png')),JSON.stringify(errors))
})

for(const width of [390,768,1440])for(const surface of ['workspace','team'])test(`${surface} toast keyboard dismissal restores its owning action at ${width}`,async t=>{
 const page=await pageFor(t,surface==='workspace'?'/settings?tab=workspace':'/team',width)
 const owner=page.getByRole('button',{name:surface==='workspace'?'Save Workspace':'Invite Member',exact:true})
 let action=owner
 if(surface==='team'){await owner.click();await page.getByLabel('Email Address',{exact:true}).fill(`invite-${width}@example.com`);action=page.getByRole('button',{name:'Add Invitation',exact:true})}
 await action.click();const toast=page.locator('[data-bf-toast]');await toast.waitFor();await toast.getByRole('button',{name:'Dismiss notification',exact:true}).focus();await page.keyboard.press('Enter');await toast.waitFor({state:'hidden'});await focused(owner)
})

test('long workspace pages scroll the document, not a nested inset',async t=>{const page=await pageFor(t,'/ads');assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight));await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));assert.ok(await page.evaluate(()=>scrollY>0));assert.equal(await page.locator('#workspace-main').evaluate(el=>el.scrollTop),0)})
test('desktop shell is a 240px product column and collapses to a persistent 72px rail',async t=>{
 const page=await pageFor(t,'/ads',1440);const sidebar=page.locator('.butterfly-sidebar[data-slot="sidebar-container"]')
 assert.equal(Math.round((await sidebar.boundingBox()).width),240)
 for(const name of ['My Ads','Add Ads','Create Ads','Work Queue','Team','Settings'])assert.equal(await page.locator('.butterfly-sidebar').getByRole('link',{name,exact:true}).count(),1)
 const active=page.getByRole('link',{name:'My Ads',exact:true});assert.equal(await active.getAttribute('aria-current'),'page')
 await page.getByRole('button',{name:'Collapse Sidebar',exact:true}).click();await page.waitForFunction(()=>Math.round(document.querySelector('.butterfly-sidebar[data-slot="sidebar-container"]').getBoundingClientRect().width)===72);assert.equal(Math.round((await sidebar.boundingBox()).width),72)
 await page.getByRole('button',{name:'Expand Sidebar',exact:true}).waitFor();assert.equal(await active.getAttribute('aria-current'),'page');assert.ok(await active.isVisible())
 for(const name of ['My Ads','Add Ads','Create Ads','Work Queue','Team','Settings'])assert.equal(await page.locator('.butterfly-sidebar').getByRole('link',{name,exact:true}).count(),1)
 await page.getByRole('link',{name:'Work Queue',exact:true}).focus();await page.getByRole('tooltip').filter({hasText:'Work Queue'}).waitFor()
 const expand=page.getByRole('button',{name:'Expand Sidebar',exact:true});await expand.focus();await page.getByRole('tooltip').filter({hasText:'Expand Sidebar'}).waitFor()
 await page.reload();await page.locator('h1').waitFor();assert.equal(Math.round((await sidebar.boundingBox()).width),72)
 await page.getByRole('button',{name:'Expand Sidebar',exact:true}).click();await page.waitForFunction(()=>Math.round(document.querySelector('.butterfly-sidebar[data-slot="sidebar-container"]').getBoundingClientRect().width)===240);assert.equal(Math.round((await sidebar.boundingBox()).width),240)
})
test('workspace menu is keyboard operable and Escape restores its trigger',async t=>{
 const page=await pageFor(t,'/ads',1440);const trigger=page.getByRole('button',{name:'Switch account or manage sources',exact:true});await trigger.focus();await page.keyboard.press('Enter')
 await page.getByRole('menu').waitFor();await page.getByRole('menuitem',{name:'Manage Sources',exact:true}).waitFor();await page.getByRole('menuitem',{name:'Workspace Settings',exact:true}).waitFor()
 await page.keyboard.press('Escape');await page.getByRole('menu').waitFor({state:'hidden'});await focused(trigger)
})
test('mobile drawer dismissal restores its opener',async t=>{const page=await pageFor(t,'/ads');const opener=page.getByRole('button',{name:'Open navigation',exact:true});await opener.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await focused(opener)})
test('mobile drawer exposes canonical navigation labels and a visible named close action',async t=>{const page=await pageFor(t,'/ads',390);await page.getByRole('button',{name:'Open navigation',exact:true}).click();const dialog=page.getByRole('dialog');for(const name of ['My Ads','Add Ads','Create Ads','Work Queue','Team','Settings'])assert.equal(await dialog.getByRole('link',{name,exact:true}).count(),1);const close=dialog.getByRole('button',{name:'Close',exact:true});await close.waitFor();assert.ok(await close.isVisible());const box=await close.boundingBox();assert.ok(box.width>=44&&box.height>=44);await close.click();await dialog.waitFor({state:'hidden'})})
test('tablet width uses the full mobile drawer instead of squeezing a desktop column',async t=>{const page=await pageFor(t,'/team',768);assert.equal(await page.locator('.butterfly-sidebar[data-slot="sidebar-container"]').count(),0);await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Team',exact:true}).waitFor();assert.ok(await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).isVisible())})
test('mobile drawer navigation focuses the destination landmark',async t=>{const page=await pageFor(t,'/ads',320);await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Work Queue',exact:true}).click();await page.getByRole('heading',{name:'Work Queue',exact:true}).waitFor();await page.getByRole('dialog').waitFor({state:'hidden'});await focused(page.locator('#workspace-main'))})
test('invalid identity focuses the identity input',async t=>{const page=await pageFor(t,'/login');await page.getByRole('button',{name:'Continue With Email',exact:true}).click();await focused(page.getByLabel('Email Address',{exact:true}))})
test('invalid verification focuses the first code digit',async t=>{const page=await pageFor(t,'/login?state=code');await page.getByLabel('Verification code, digit 1 of 6',{exact:true}).fill('1');await page.getByRole('button',{name:'Continue',exact:true}).click();await focused(page.getByLabel('Verification code, digit 1 of 6',{exact:true}))})
test('detail has one main landmark and a creative heading before subsections',async t=>{const page=await pageFor(t,'/ads/2529793287483755?panel=jev',1440);assert.equal(await page.locator('main').count(),1);const headings=await page.locator('h1,h2,h3').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({level:Number(n.tagName[1]),text:n.textContent})));let previous=0;for(const heading of headings){assert.ok(heading.level<=previous+1,JSON.stringify(headings));previous=heading.level}})
test('queue row controls identify their record',async t=>{const page=await pageFor(t,'/work',1440);for(const row of await page.locator('.work-queue-row').all()){const title=await row.locator('h2').innerText();await row.getByRole('combobox',{name:`Owner for ${title}`,exact:true}).waitFor();await row.getByRole('link',{name:`Review Finding ${title}`,exact:true}).waitFor();await row.getByRole('button',{name:`More actions for ${title}`,exact:true}).waitFor()}})
test('review completion preserves keyboard focus after the row disappears',async t=>{const page=await pageFor(t,'/work');const row=page.locator('.work-queue-row').first();await row.getByRole('button',{name:/^More actions for /}).click();const button=page.getByRole('menuitem',{name:'Mark Reviewed',exact:true});await button.focus();await page.keyboard.press('Enter');await page.getByText('Finding marked reviewed.',{exact:true}).waitFor();await focused(page.getByRole('region',{name:'Work Queue views',exact:true}))})
test('draft completion preserves keyboard focus after the row disappears',async t=>{const page=await pageFor(t,'/work?view=drafts');const row=page.locator('.work-queue-row').first();await row.getByRole('button',{name:/^More actions for /}).click();const button=page.getByRole('menuitem',{name:'Mark Complete',exact:true});await button.focus();await page.keyboard.press('Enter');await page.getByText('Draft moved to Completed.',{exact:true}).waitFor();await focused(page.getByRole('region',{name:'Work Queue views',exact:true}))})
test('saved group delete cancellation restores its trigger',async t=>{const page=await pageFor(t,'/ads?view=groups&group=barrier-cream-tests');const trigger=page.getByRole('button',{name:'Delete Group',exact:true});await trigger.click();const dialog=page.getByRole('alertdialog');await dialog.waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await focused(trigger)})
test('destructive team confirmation is an alertdialog with safe focus and cancellation',async t=>{const page=await pageFor(t,'/team');const trigger=page.getByRole('button',{name:'More actions for Demo Editor',exact:true});await trigger.click();await page.getByRole('menuitem',{name:'Remove Demo Editor',exact:true}).click();const dialog=page.getByRole('alertdialog',{name:'Remove Demo Editor?'});await dialog.waitFor();await focused(dialog.getByRole('button',{name:'Keep Member'}));await page.keyboard.press('Shift+Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await focused(trigger)})
test('destructive source confirmation is an alertdialog with safe focus',async t=>{const page=await pageFor(t,'/settings');await page.getByRole('button',{name:'Disconnect',exact:true}).click();const dialog=page.getByRole('alertdialog',{name:'Disconnect Kindred?'});await dialog.waitFor();await focused(dialog.getByRole('button',{name:'Keep Connected'}));await dialog.getByRole('button',{name:'Disconnect',exact:true}).click();await dialog.waitFor({state:'hidden'});await focused(page.getByRole('heading',{name:'Creative Sources',exact:true}))})
test('shared alert dialog specimen restores its trigger on cancellation',async t=>{const page=await pageFor(t,'/demo/design-system');const trigger=page.getByRole('button',{name:'Preview confirmation',exact:true});await trigger.click();await page.getByRole('alertdialog').getByRole('button',{name:'Keep record',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});await focused(trigger)})
test('production banners identify permission restrictions',async t=>{const page=await pageFor(t,'/team?state=readonly');await page.getByRole('region',{name:'Team Is Read-Only',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Invite Member',exact:true}).isDisabled());await page.goto(base+'/settings?state=readonly');await page.getByRole('region',{name:'Source Is Read-Only',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Disconnect',exact:true}).isDisabled())})
test('workspace save toast is announced politely and dismissible',async t=>{const page=await pageFor(t,'/settings?tab=workspace');await page.getByRole('button',{name:'Save Workspace',exact:true}).click();const toast=page.locator('[data-bf-toast]');await toast.getByText('Workspace settings saved in this browser.').waitFor();await page.locator('[role=status][aria-live=polite]').filter({hasText:'Workspace settings saved in this browser.'}).waitFor({state:'attached'});await toast.getByRole('button',{name:'Dismiss notification'}).click();await toast.waitFor({state:'hidden'})})
test('public and production routes fit all ten frozen widths',async t=>{
 const page=await pageFor(t,'/ads');const consoleErrors=capturePageErrors(page)
 const routes=['/','/login','/add','/ads','/ads/2529793287483755?panel=jev','/work','/team','/settings','/settings?tab=workspace','/settings?tab=profile']
 for(const width of [1688,1510,1280,1024,900,768,620,540,390,320]){await page.setViewportSize({width,height:900});for(const path of routes){await page.goto((path==='/'?base.replace('app.butterfly.localhost','127.0.0.1'):base)+path);await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} at ${width}`)}}
 assert.deepEqual(consoleErrors,[])
})

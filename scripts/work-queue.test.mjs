import assert from 'node:assert/strict'
import {before,after,test} from 'node:test'
import {createServer} from 'vite'
import {chromium} from 'playwright'
let server,browser,base
before(async()=>{server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();base=`http://app.butterfly.localhost:${server.httpServer.address().port}`;browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})})
after(async()=>{await browser?.close();await server?.close()})
async function pageFor(t,path='/work',connected=true){const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(3000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(connected=>{localStorage.setItem('butterfly-fixture-authenticated','true');if(connected)localStorage.setItem('butterfly-meta-connected','true')},connected);t.after(async()=>{await context.close();assert.deepEqual(errors,[])});await page.goto(base+path);await page.locator('main').waitFor();return page}
async function openFilters(page){if(!await page.getByLabel('Filter by Owner',{exact:true}).isVisible())await page.getByRole('button',{name:'Filters',exact:true}).click()}
async function chooseRowAction(page,row,label){await row.getByRole('button',{name:/^More actions for /}).click();await page.getByRole('menuitem',{name:label,exact:true}).click()}
test('queue consumes the shared responsive filter task on desktop and mobile',async t=>{
 const page=await pageFor(t)
 for(const [width,presentation] of [[1440,'popover'],[390,'sheet']]){
  await page.setViewportSize({width,height:850})
  const trigger=page.getByRole('button',{name:'Filters',exact:true})
  await trigger.click()
  const surface=page.locator('.bf-responsive-filter')
  await surface.waitFor()
  assert.equal(await surface.getAttribute('data-presentation'),presentation)
  await page.keyboard.press('Escape');await surface.waitFor({state:'hidden'})
  assert.equal(await trigger.evaluate(node=>node===document.activeElement),true)
 }
})
test('queue search and filter tools use the working width without overflowing mobile',async t=>{
 const page=await pageFor(t)
 await page.setViewportSize({width:1440,height:850})
 const desktop=await page.locator('.bf-filter-bar__controls').evaluate(node=>{const field=node.querySelector('.bf-field').getBoundingClientRect(),trigger=node.querySelector('.bf-button').getBoundingClientRect();return {field:field.width,triggerRight:trigger.right,barRight:node.getBoundingClientRect().right}})
 assert.ok(desktop.field>=320,JSON.stringify(desktop));assert.ok(desktop.triggerRight<=desktop.barRight)
 await page.setViewportSize({width:320,height:850})
 const mobile=await page.locator('.bf-filter-bar__controls').evaluate(node=>{const box=node.getBoundingClientRect();return {left:box.left,right:box.right,width:box.width,viewport:innerWidth}})
 assert.ok(mobile.left>=0&&mobile.right<=mobile.viewport,JSON.stringify(mobile))
})
test('queue identity remains one media object before compact owner and actions at every width',async t=>{
 const page=await pageFor(t)
 for(const width of [1688,1510,1280,1024,900,768,620,540,390,320]){
  await page.setViewportSize({width,height:900})
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const row=page.getByRole('article').first();const identity=row.locator('.work-queue-identity');const controls=row.locator('.work-queue-controls')
  const [identityBox,controlsBox,thumbBox,copyBox]=await Promise.all([identity.boundingBox(),controls.boundingBox(),row.locator('.work-queue-thumb').boundingBox(),row.locator('.work-queue-copy').boundingBox()])
  assert.ok(identityBox&&controlsBox&&thumbBox&&copyBox,`queue regions are measurable at ${width}px`)
  if(width>1100)assert.ok(identityBox.x+identityBox.width<=controlsBox.x+1,`identity precedes controls horizontally at ${width}px`)
  else {
   assert.ok(identityBox.y+identityBox.height<=controlsBox.y+1,`identity precedes controls vertically at ${width}px`)
   const thumbCenter=thumbBox.y+(thumbBox.height/2)
   assert.ok(thumbCenter>=copyBox.y&&thumbCenter<=copyBox.y+copyBox.height,`thumbnail stays centered on title/source copy at ${width}px`)
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`no page overflow at ${width}px`)
  await page.screenshot({path:`/tmp/task5-review-${width}.png`,fullPage:true})
 }
})
test('all queue views and fixture states stay composed across the complete width matrix',async t=>{
 const page=await pageFor(t)
 for(const width of [1688,1510,1280,1024,900,768,620,540,390,320]){
  await page.setViewportSize({width,height:900})
  for(const view of ['review','drafts','completed']){
   await page.goto(`${base}/work?view=${view}`);await page.locator('main').waitFor();assert.ok(await page.getByRole('article').count()>0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:`/tmp/task5-${view}-${width}.png`,fullPage:true})
  }
  for(const state of ['loading','empty','partial','error','readonly','missing']){
   await page.goto(`${base}/work?view=review&state=${state}`);await page.locator('main').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:`/tmp/task5-${state}-${width}.png`,fullPage:true})
  }
 }
})
test('review retry and confirmation mutate persisted shared findings and completed exact links',async t=>{
 const page=await pageFor(t);const failed=page.getByRole('article').filter({hasText:'Spoken Call to Action'})
 await chooseRowAction(page,failed,'Retry Check');await failed.getByText('Needs Review',{exact:true}).waitFor()
 await page.reload();await failed.getByRole('button',{name:/^More actions for /}).click();assert.equal(await page.getByRole('menuitem',{name:'Retry Check'}).count(),0)
 const href=await failed.getByRole('link',{name:/^Review Finding /}).getAttribute('href');assert.match(href,/^\/ads\/1277290320948697\?/);assert.equal(new URL(href,base).searchParams.get('property'),'offer-and-action-3');assert.equal(new URL(href,base).searchParams.get('finding'),'finding-audio')
 await page.getByRole('menuitem',{name:'Mark Reviewed',exact:true}).click();assert.equal(await failed.count(),0)
 await page.getByRole('link',{name:/^Completed/}).click();await page.reload()
 const completed=page.getByRole('article').filter({hasText:'Spoken Call to Action'});await completed.waitFor();assert.equal(new URL(await completed.getByRole('link',{name:/^Open Finding /}).getAttribute('href'),base).searchParams.get('property'),'offer-and-action-3')
})
test('draft assignment and completion create an unmeasured version and retain exact draft deep links',async t=>{
 const page=await pageFor(t,'/work?view=drafts');const draft=page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'})
 const href=new URL(await draft.getByRole('link',{name:/^Resume Draft /}).getAttribute('href'),base);assert.equal(href.pathname,'/ads/2529793287483755');assert.equal(href.searchParams.get('draft'),'sample-draft-hook');assert.equal(href.searchParams.get('property'),'opening-1')
 await draft.getByRole('combobox',{name:/^Owner for /}).selectOption('Demo Editor');await page.reload();assert.equal(await draft.getByRole('combobox',{name:/^Owner for /}).inputValue(),'Demo Editor')
 await chooseRowAction(page,draft,'Mark Complete');assert.equal(await draft.count(),0)
 await page.getByRole('link',{name:/^Completed/}).click();const version=page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'});await version.waitFor()
 assert.ok(await version.getByText(/No delivery data/).isVisible());const versionHref=new URL(await version.getByRole('link',{name:/^Open Version /}).getAttribute('href'),base);assert.equal(versionHref.searchParams.get('version'),'version-sample-draft-hook');assert.equal(versionHref.searchParams.get('panel'),'notes')
})
test('owner date and search filters persist in tab URLs and filter actual queue rows',async t=>{
 const page=await pageFor(t);await openFilters(page);await page.getByLabel('Filter by owner').selectOption('Demo Editor');await page.waitForURL(url=>url.searchParams.get('owner')==='Demo Editor');await page.waitForFunction(()=>document.querySelectorAll('.work-queue-row').length===1);assert.equal(await page.getByRole('article').count(),1)
 await page.getByRole('button',{name:/^Updated From/}).click();const calendar=page.getByRole('dialog',{name:'Updated From calendar'});await calendar.getByRole('button',{name:'Previous month'}).click();await calendar.getByRole('gridcell',{name:'September 20, 2026'}).click();await page.getByRole('heading',{name:'No needs review items'}).waitFor();assert.equal(await page.getByRole('article').count(),0)
 await page.getByRole('link',{name:/^Drafts/}).click();assert.equal(new URL(page.url()).searchParams.get('owner'),'Demo Editor');assert.match(page.url(),/from=2026-09-20/)
 await openFilters(page);await page.getByRole('button',{name:'Clear filters'}).click();await page.keyboard.press('Escape');await page.waitForURL(base+'/work?view=drafts');await page.waitForFunction(()=>document.querySelectorAll('.work-queue-row').length===2);assert.equal(await page.getByRole('article').count(),2)
 await page.getByLabel('Search work').fill('routine');await page.waitForURL(url=>url.searchParams.get('q')==='routine');await page.reload();await page.getByRole('article').first().waitFor();assert.equal(await page.getByRole('article').count(),1)
})
test('type status and visible sort controls persist in URLs and filter and order queue rows',async t=>{
 const page=await pageFor(t)
 await openFilters(page);await page.getByLabel('Filter by Type',{exact:true}).selectOption('finding');await page.getByLabel('Filter by Status',{exact:true}).selectOption('failed');await page.getByLabel('Sort Work',{exact:true}).selectOption('oldest')
 await page.waitForURL(url=>url.searchParams.get('type')==='finding'&&url.searchParams.get('status')==='failed'&&url.searchParams.get('sort')==='oldest')
 const rows=page.getByRole('article');assert.equal(await rows.count(),1);await rows.first().getByText('Analysis Failed',{exact:true}).waitFor()
 await page.getByRole('link',{name:/^Completed/}).click();await page.getByText('Approved for the next creative test.',{exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('sort'),'oldest');assert.equal(new URL(page.url()).searchParams.has('status'),false);assert.equal(new URL(page.url()).searchParams.has('type'),false);await openFilters(page);assert.equal(await page.getByLabel('Filter by Type',{exact:true}).inputValue(),'');assert.equal(await page.getByLabel('Filter by Status',{exact:true}).inputValue(),'');assert.ok(await page.getByRole('article').count()>0)
 await page.goBack();await page.waitForURL(url=>url.searchParams.get('view')!=='completed'&&url.searchParams.get('type')==='finding'&&url.searchParams.get('status')==='failed');await openFilters(page);assert.equal(await page.getByLabel('Filter by Type',{exact:true}).inputValue(),'finding');assert.equal(await page.getByLabel('Filter by Status',{exact:true}).inputValue(),'failed');assert.equal(await page.getByRole('article').count(),1)
 await page.goForward();await page.waitForURL(url=>url.searchParams.get('view')==='completed');assert.equal(new URL(page.url()).searchParams.has('type'),false);assert.equal(new URL(page.url()).searchParams.has('status'),false);assert.ok(await page.getByRole('article').count()>0)
 await openFilters(page);await page.getByRole('button',{name:'Clear Filters'}).click();assert.equal(new URL(page.url()).searchParams.has('sort'),false)
})
test('destination tabs remove analogous type filters that do not apply there',async t=>{
 const page=await pageFor(t,'/work?view=review&type=finding&sort=title')
 await page.getByRole('link',{name:/^Drafts/}).click();await page.waitForURL(url=>url.searchParams.get('view')==='drafts');await page.getByText('Saved change proposal.',{exact:true}).first().waitFor();assert.equal(new URL(page.url()).searchParams.has('type'),false);assert.equal(new URL(page.url()).searchParams.get('sort'),'title');await openFilters(page);assert.equal(await page.getByLabel('Filter by Type',{exact:true}).inputValue(),'');assert.equal(await page.getByRole('article').count(),2)
 await page.goBack();await page.waitForURL(url=>url.searchParams.get('view')==='review'||!url.searchParams.has('view'));assert.equal(new URL(page.url()).searchParams.get('type'),'finding');assert.ok(await page.getByRole('article').count()>0)
 await page.goForward();await page.waitForURL(url=>url.searchParams.get('view')==='drafts');assert.equal(new URL(page.url()).searchParams.has('type'),false);assert.equal(await page.getByRole('article').count(),2)
})
test('needs review exposes value confidence reason and separate exact evidence and ad links',async t=>{
 const page=await pageFor(t);const row=page.getByRole('article').filter({hasText:'Opening Structure'})
 await row.getByText('Finding Details',{exact:true}).click();await row.getByText('Value',{exact:true}).waitFor();await row.getByText(/%$/).waitFor();await row.getByText('Reason',{exact:true}).waitFor()
 const evidence=new URL(await row.getByRole('link',{name:'Evidence',exact:true}).getAttribute('href'),base);assert.equal(evidence.searchParams.get('finding'),'finding-hook');assert.equal(evidence.searchParams.get('property'),'opening-1')
 const ad=new URL(await row.getByRole('link',{name:'Ad',exact:true}).getAttribute('href'),base);assert.equal(ad.pathname,'/ads/2529793287483755');assert.equal(ad.searchParams.get('panel'),'jev');assert.equal(ad.searchParams.has('finding'),false)
})
test('unconnected library preserves stale work with source IDs and failures do not advance records',async t=>{
 const page=await pageFor(t,'/work',false);assert.equal(await page.getByRole('article').count(),3);await page.getByText('Some Sources Are Unavailable',{exact:true}).waitFor();await page.getByText('Preserved source ID:',{exact:false}).first().waitFor();assert.equal(await page.getByRole('link',{name:'Repair Source'}).count(),3)
 await page.evaluate(()=>localStorage.setItem('butterfly-meta-connected','true'));await page.reload()
 await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='butterfly:workflow:v1')throw new Error('quota');return write.call(this,key,value)}})
 await chooseRowAction(page,page.getByRole('article').first(),'Mark Reviewed');await page.getByText('Work was not saved. Your queue is unchanged.').waitFor();assert.equal(await page.getByRole('article').count(),3)
})
test('draft removal requires confirmation, supports escape and cancel, restores focus, and persists only after confirm',async t=>{
 const page=await pageFor(t,'/work?view=drafts');const title='Keep the call to action visible beside the product close-up.';const draft=page.locator('.work-queue-row').filter({hasText:title});const more=draft.getByRole('button',{name:/^More actions for /})
 await page.setViewportSize({width:1440,height:900});await chooseRowAction(page,draft,'Remove Draft');let dialog=page.getByRole('alertdialog');await dialog.waitFor();assert.equal(await draft.count(),1);await page.screenshot({path:'/tmp/task5-remove-dialog-1440.png',fullPage:true});await dialog.getByRole('button',{name:'Keep Draft'}).click();await dialog.waitFor({state:'hidden'});assert.equal(await draft.count(),1);await more.waitFor();assert.equal(await more.evaluate(node=>node===document.activeElement),true)
 await page.setViewportSize({width:390,height:850});await chooseRowAction(page,draft,'Remove Draft');dialog=page.getByRole('alertdialog');await dialog.waitFor();await page.screenshot({path:'/tmp/task5-remove-dialog-390.png',fullPage:true});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await draft.count(),1);assert.equal(await more.evaluate(node=>node===document.activeElement),true)
 await page.setViewportSize({width:320,height:800});await chooseRowAction(page,draft,'Remove Draft');dialog=page.getByRole('alertdialog');await dialog.waitFor();for(const button of await dialog.getByRole('button').all()){const box=await button.boundingBox();assert.ok(box&&box.height>=44,`dialog button is ${box?.height}px tall`)}await page.screenshot({path:'/tmp/task5-remove-dialog-320.png',fullPage:true});await dialog.getByRole('button',{name:'Remove Draft',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(await draft.count(),0);assert.equal(await page.getByRole('region',{name:'Work Queue views'}).evaluate(node=>node===document.activeElement),true)
 await page.reload();assert.equal(await page.getByRole('article').filter({hasText:title}).count(),0)
})
test('each tab exposes loading empty partial error retry and read-only without hidden mutation paths',async t=>{
 const page=await pageFor(t)
 for(const view of ['review','drafts','completed'])for(const state of ['loading','empty','partial','error','readonly']){
  await page.goto(base+`/work?view=${view}&state=${state}`)
  await page.getByRole('heading',{name:'Work Queue',exact:true}).waitFor()
  if(state==='partial'){await page.getByText('Some Work Is Unavailable',{exact:true}).waitFor();assert.ok(await page.getByRole('article').count()>0)}
  if(state==='readonly'){assert.ok(await page.getByRole('article').count()>0);assert.ok(await page.getByRole('combobox',{name:/^Owner for /}).first().isDisabled());const href=await page.getByRole('article').first().getByRole('link').first().getAttribute('href');assert.equal(new URL(href,base).searchParams.get('state'),'readonly')}
  if(state==='error'){await page.getByRole('button',{name:'Retry Queue'}).click();assert.equal(new URL(page.url()).searchParams.get('view'),view);assert.equal(new URL(page.url()).searchParams.get('state'),null)}
  if(state==='loading'||state==='empty')assert.equal(await page.getByRole('article').count(),0)
 }
})
test('mobile rows retain visible creative thumbnails and reachable 44px secondary actions without overflow',async t=>{
 const page=await pageFor(t,'/work?view=completed');await page.setViewportSize({width:320,height:700})
 const media=page.getByRole('article').first().getByRole('img').first();const box=await media.boundingBox();assert.ok(box&&box.width>0&&box.height>0)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320)
 await page.getByRole('link',{name:/^Open Version /,exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('link',{name:/^Open Version /,exact:true}).isVisible())
 await page.goto(base+'/work?view=drafts');const draft=page.getByRole('article').first();await draft.getByRole('button',{name:/^More actions for /}).click();for(const item of await page.getByRole('menuitem').all()){const box=await item.boundingBox();assert.ok(box&&box.height>=44,`menu item is ${box?.height}px tall`)}
})
test('fresh completed work keeps its recorded outcome and provenance concise',async t=>{
 const page=await pageFor(t,'/work?view=completed')
 await page.getByText('Approved for the next creative test.',{exact:true}).waitFor()
 await page.getByText('Recorded outcome · Kindred review · 18 September 2026',{exact:true}).waitFor()
})
test('mobile queue actions persist retry review and completion and open exact records for correction and outcome',async t=>{
 const page=await pageFor(t);await page.setViewportSize({width:390,height:850})
 const audio=page.getByRole('article').filter({hasText:'Spoken Call to Action'});await chooseRowAction(page,audio,'Retry Check');await chooseRowAction(page,audio,'Mark Reviewed')
 const hook=page.getByRole('article').filter({hasText:'Opening Structure'});await hook.getByRole('link',{name:/^Review Finding /}).click()
 await page.getByRole('button',{name:'Correct',exact:true}).click();const correction=page.getByRole('dialog');await correction.getByLabel('Corrected value').fill('Manual queue correction');await correction.getByLabel('Reason',{exact:true}).fill('Checked the supplied creative');await correction.getByRole('button',{name:'Save correction'}).click()
 await page.goto(base+'/work?view=completed');await page.getByRole('article').filter({hasText:'Opening Structure'}).getByText('Corrected',{exact:true}).waitFor()
 await page.goto(base+'/work?view=drafts');const draft=page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'});await chooseRowAction(page,draft,'Mark Complete')
 await page.getByRole('link',{name:/^Completed/}).click();await page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'}).getByRole('link',{name:/^Open Version /}).click()
 const version=page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'});await version.getByRole('button',{name:'Record outcome'}).click()
 const dialog=page.getByRole('dialog',{name:'Record version outcome'});await dialog.getByLabel('Result after change').fill('Reviewed internally; no delivery test yet.');await dialog.getByLabel('Result source').fill('Creative-team review');await dialog.getByLabel('Result window').fill('3 October 2026');await dialog.getByRole('button',{name:'Save outcome'}).click()
 await page.goto(base+'/work?view=completed');const completed=page.getByRole('article').filter({hasText:'Show the result before the routine demonstration.'});await completed.getByText('Reviewed internally; no delivery test yet.',{exact:true}).waitFor();assert.ok(await completed.getByText('User-entered observation · Creative-team review · 3 October 2026',{exact:true}).isVisible())
})

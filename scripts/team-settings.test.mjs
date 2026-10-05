import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createServer } from 'vite'
import { chromium } from 'playwright'

let server, browser, base
before(async()=>{
  server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen()
  base=`http://app.butterfly.localhost:${server.httpServer.address().port}`
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
})
after(async()=>{await browser?.close();await server?.close()})
async function pageFor(t,path,storage={}) {
  const context=await browser.newContext();const page=await context.newPage();const errors=[]
  page.setDefaultTimeout(2500);page.on('pageerror',error=>errors.push(error.message))
  await context.addInitScript(entries=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('butterfly-fixture-authenticated','true');Object.entries(entries).forEach(([key,value])=>localStorage.setItem(key,value));sessionStorage.setItem('seeded','true')}},storage)
  t.after(async()=>{await context.close();assert.deepEqual(errors,[])})
  await page.goto(base+path);await page.locator('main').waitFor();return page
}
const owner={name:'Demo Owner',email:'owner@kindred.example',role:'Owner'}
async function openInvite(page){await page.getByRole('button',{name:'Invite Member',exact:true}).click();await page.getByRole('dialog',{name:'Invite Someone',exact:true}).waitFor()}
async function openPersonMenu(page,name){await page.getByRole('button',{name:`More actions for ${name}`,exact:true}).click()}
async function openInvitationMenu(page,email){await page.getByRole('button',{name:`More actions for invitation to ${email}`,exact:true}).click()}

test('team migrates unversioned records and persists roles, resend, cancel and confirmed removal',async t=>{
  const page=await pageFor(t,'/team',{'butterfly-team':JSON.stringify({people:[owner,{name:'Alex',email:'alex@example.com',role:'Editor'}],invites:[{email:'mia@example.com',role:'Viewer',status:'failed'}]})})
  await page.getByLabel('Role for Alex').selectOption('Viewer');await page.reload()
  assert.equal(await page.getByLabel('Role for Alex').inputValue(),'Viewer')
  await openInvitationMenu(page,'mia@example.com');await page.getByRole('menuitem',{name:'Resend Invitation',exact:true}).click();await page.reload()
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('butterfly-team')))).invites[0].status,'pending')
  await openInvitationMenu(page,'mia@example.com');await page.getByRole('menuitem',{name:'Cancel Invitation',exact:true}).click();await page.reload()
  assert.equal(await page.getByText('mia@example.com',{exact:true}).count(),0)
  const remove=page.getByRole('button',{name:'More actions for Alex',exact:true});await remove.click();await page.getByRole('menuitem',{name:'Remove Alex',exact:true}).click()
  await page.getByRole('alertdialog',{name:'Remove Alex?'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('alertdialog').waitFor({state:'hidden'})
  await page.waitForFunction(el=>el===document.activeElement,await remove.elementHandle())
  await remove.click();await page.getByRole('menuitem',{name:'Remove Alex',exact:true}).click();await page.getByRole('button',{name:'Remove Member',exact:true}).click();await page.reload()
  await page.getByRole('heading',{name:'Members',exact:true}).waitFor()
  assert.equal(await page.getByText('Alex',{exact:true}).count(),0)
  assert.equal(await page.getByRole('button',{name:/^Remove /}).count(),0)
})
test('team invite validates membership and persists a local invitation without delivery claims',async t=>{
  const page=await pageFor(t,'/team')
  await openInvite(page);await page.getByLabel('Email Address',{exact:true}).fill('owner@kindred.example');await page.getByRole('button',{name:'Add Invitation'}).click()
  await page.getByText('That address is already a member.').waitFor()
  await page.getByLabel('Email Address',{exact:true}).fill(' New@Example.com ');await page.getByRole('button',{name:'Add Invitation'}).click()
  await page.getByText('new@example.com',{exact:true}).waitFor();await page.reload()
  await page.getByText('new@example.com',{exact:true}).waitFor()
  assert.equal(await page.getByText(/Sent today/).count(),0)
  await openInvite(page);await page.getByLabel('Email Address',{exact:true}).fill('new@example.com');await page.getByRole('button',{name:'Add Invitation'}).click()
  await page.getByText('That address already has a pending invitation.').waitFor()
})
test('invite dialog uses the shared anatomy and focuses invalid email',async t=>{
  const page=await pageFor(t,'/team')
  await page.setViewportSize({width:390,height:850})
  await openInvite(page)
  const dialog=page.getByRole('dialog',{name:'Invite Someone',exact:true})
  assert.equal(await dialog.getAttribute('data-slot'),'dialog-content')
  const email=page.getByLabel('Email Address',{exact:true})
  await email.fill('not-an-email')
  await page.getByRole('button',{name:'Add Invitation',exact:true}).click()
  await page.getByText('Enter a valid email address.',{exact:true}).waitFor()
  assert.equal(await email.evaluate(element=>document.activeElement===element),true)
})
test('team mutation failure is visible and permissions block all mutations',async t=>{
  const page=await pageFor(t,'/team')
  await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='butterfly-team')throw new DOMException('Quota exceeded','QuotaExceededError');return write.call(this,key,value)}})
  await page.getByLabel('Role for Demo Editor').selectOption('Viewer')
  await page.getByText('Team changes were not saved. Existing records are unchanged.').waitFor()
  assert.equal(await page.getByLabel('Role for Demo Editor').inputValue(),'Editor')
  for(const state of ['readonly','permission']){
    await page.goto(base+'/team?state='+state)
    assert.ok(await page.getByRole('button',{name:'Invite Member'}).isDisabled())
    assert.ok(await page.getByLabel('Role for Demo Editor').isDisabled())
    assert.equal(await page.getByRole('button',{name:/Resend invite/}).count(),0)
  }
})
test('workspace migrates legacy values, rejects invalid input, saves and resets without partial failures',async t=>{
  const page=await pageFor(t,'/settings?tab=workspace',{'butterfly-workspace-name':'Legacy Brand','butterfly-default-range':'7','butterfly-default-metric':'Spend'})
  assert.equal(await page.getByLabel('Workspace name').inputValue(),'Legacy Brand')
  await page.getByLabel('Workspace name').fill(' ');assert.ok(await page.getByRole('button',{name:'Save Workspace'}).isDisabled())
  await page.getByLabel('Workspace name').fill('New Brand');await page.getByLabel('Card metric').selectOption('ROAS')
  await page.getByRole('button',{name:'Save Workspace'}).click();await page.getByText('Workspace settings saved in this browser.',{exact:true}).waitFor();await page.reload()
  assert.equal(await page.getByLabel('Workspace name').inputValue(),'New Brand')
  await page.getByLabel('Workspace name').fill('Discard me');await page.getByRole('button',{name:'Reset Changes'}).click()
  assert.equal(await page.getByLabel('Workspace name').inputValue(),'New Brand')
  await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='butterfly-default-range'&&value==='90')throw new DOMException('Quota exceeded','QuotaExceededError');return write.call(this,key,value)}})
  await page.getByLabel('Workspace name').fill('Must not commit');await page.getByLabel('Default date range').selectOption('90');await page.getByRole('button',{name:'Save Workspace'}).click()
  await page.getByText('Settings Were Not Saved',{exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-workspace-name')),'New Brand')
})
test('workspace summary stays saved while route navigation preserves unsaved draft values',async t=>{
  const page=await pageFor(t,'/settings?tab=workspace',{'butterfly-workspace-name':'Kindred','butterfly-default-range':'30','butterfly-default-metric':'CPA'})
  await page.getByLabel('Workspace name').fill('Unsaved Brand')
  await page.getByLabel('Default date range').selectOption('90')
  await page.getByLabel('Card metric').selectOption('ROAS')
  const summary=page.getByRole('complementary',{name:'Workspace default summary'})
  await summary.getByText('Last 30 days',{exact:true}).waitFor()
  await summary.getByText('CPA',{exact:true}).waitFor()
  assert.equal(await summary.getByText('Last 90 days',{exact:true}).count(),0)
  await page.goto(base+'/team')
  await page.goto(base+'/settings?tab=workspace')
  assert.equal(await page.getByLabel('Workspace name').inputValue(),'Unsaved Brand')
  assert.equal(await page.getByLabel('Default date range').inputValue(),'90')
  assert.equal(await page.getByLabel('Card metric').inputValue(),'ROAS')
  await summary.getByText('Last 30 days',{exact:true}).waitFor()
  await summary.getByText('CPA',{exact:true}).waitFor()
})
test('settings tab URLs preserve state and invalid stored preferences fall back safely',async t=>{
  const page=await pageFor(t,'/settings?tab=workspace&state=readonly',{'butterfly-default-range':'wrong','butterfly-default-metric':'fake'})
  assert.equal(await page.getByLabel('Default date range').inputValue(),'30')
  assert.equal(await page.getByLabel('Card metric').inputValue(),'CPA')
  assert.ok(await page.getByRole('button',{name:'Save Workspace'}).isDisabled())
  await page.getByRole('link',{name:'Profile',exact:true}).click();assert.match(page.url(),/tab=profile/);assert.match(page.url(),/state=readonly/)
  await page.reload();await page.getByRole('heading',{name:'Your Profile'}).waitFor()
  await page.goBack();await page.getByLabel('Workspace name').waitFor()
})
test('source disconnect confirmation restores focus, persists and reconnect uses app-host routes',async t=>{
  const page=await pageFor(t,'/settings',{'butterfly-meta-connected':'true'})
  const disconnect=page.getByRole('button',{name:'Disconnect',exact:true});await disconnect.click()
  await page.getByRole('alertdialog',{name:'Disconnect Kindred?'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('alertdialog').waitFor({state:'hidden'})
  assert.ok(await disconnect.evaluate(el=>el===document.activeElement))
  await disconnect.click();await page.getByRole('alertdialog').getByRole('button',{name:'Disconnect',exact:true}).click();await page.reload()
  await page.getByText('Not Connected',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Reconnect',exact:true}).count(),1)
  await page.goto(base+'/settings?state=error');assert.equal(await page.getByRole('link',{name:'Retry',exact:true}).getAttribute('href'),'/settings?tab=sources')
  for(const state of ['loading','permission','connecting','importing','partial','readonly']){await page.goto(base+'/settings?state='+state);await page.getByRole('heading',{name:'Kindred',exact:true}).waitFor();const reconnect=page.getByRole('button',{name:'Reconnect',exact:true});assert.equal(await reconnect.count(),1);assert.equal(await reconnect.isDisabled(),state!=='partial')}
})
test('source state banners preserve known rows and account changes have searchable local outcomes',async t=>{
 const page=await pageFor(t,'/settings?state=permission',{'butterfly-meta-connected':'true'})
 await page.getByRole('heading',{name:'Creative Sources',exact:true}).waitFor();await page.getByRole('heading',{name:'Kindred',exact:true}).waitFor()
 assert.ok(await page.getByRole('button',{name:'Disconnect',exact:true}).isDisabled())
 for(const state of ['loading','error','connecting','importing','partial','readonly']){await page.goto(base+`/settings?state=${state}`);await page.getByRole('heading',{name:'Kindred',exact:true}).waitFor();await page.getByRole('heading',{name:'Local Uploads',exact:true}).waitFor()}
 await page.goto(base+'/settings');await page.getByRole('button',{name:'Choose Another Account',exact:true}).click()
 await page.getByRole('combobox',{name:/^Meta Ad Account/}).click();await page.getByRole('combobox',{name:'Search Meta Ad Account',exact:true}).fill('archive');await page.getByRole('option',{name:'Kindred Archive · 0 ads',exact:true}).click()
 await page.getByRole('button',{name:'Apply Account',exact:true}).click();await page.getByRole('heading',{name:'Kindred Archive',exact:true}).waitFor();await page.getByText('Kindred Archive selected locally.',{exact:true}).waitFor()
 await page.getByText('No Ads Available',{exact:true}).waitFor();await page.getByText('0 sample ads',{exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'View Ads',exact:true}).count(),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-meta-account')),'archive')
 await page.reload();await page.getByRole('heading',{name:'Kindred Archive',exact:true}).waitFor();await page.getByText('0 sample ads',{exact:true}).waitFor()
 await page.goto(base+'/ads');assert.equal(await page.getByRole('article').count(),0)
 await page.goto(base+'/settings');await page.getByRole('button',{name:'Choose Another Account',exact:true}).click()
 await page.getByRole('combobox',{name:/^Meta Ad Account/}).click();await page.getByRole('option',{name:'Kindred Europe · permission required',exact:true}).click();await page.getByRole('button',{name:'Apply Account',exact:true}).click()
 await page.getByRole('heading',{name:'Kindred Europe',exact:true}).waitFor();await page.getByText('Permission Required',{exact:true}).waitFor();await page.getByText('Sample ads unavailable',{exact:true}).waitFor();await page.getByText('Account Permission Needed',{exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'View Ads',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Sync Now',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Choose Another Account',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Disconnect',exact:true}).count(),1)
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:`/tmp/task6-closure-settings-${width}.png`,fullPage:true})}
 await page.reload();await page.getByRole('heading',{name:'Kindred Europe',exact:true}).waitFor();await page.getByText('Permission Required',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-meta-account')),'europe')
})

test('team explains roles and exposes credible row menus',async t=>{
 const page=await pageFor(t,'/team')
 await page.getByRole('button',{name:'About Team Roles',exact:true}).click();await page.getByText('Controls workspace access and settings.',{exact:true}).waitFor();await page.screenshot({path:'/tmp/task6-fix-role-popover.png',fullPage:true});await page.keyboard.press('Escape')
 await openPersonMenu(page,'Demo Editor');await page.getByRole('menuitem',{name:'Remove Demo Editor',exact:true}).waitFor();await page.screenshot({path:'/tmp/task6-fix-member-menu.png',fullPage:true});await page.keyboard.press('Escape')
 await openInvitationMenu(page,'mia@kindred.example');await page.getByRole('menuitem',{name:'Resend Invitation',exact:true}).waitFor();await page.getByRole('menuitem',{name:'Cancel Invitation',exact:true}).waitFor();await page.screenshot({path:'/tmp/task6-fix-invite-menu.png',fullPage:true})
})
test('disconnect truthfully hides sample ads after reload without removing local uploads',async t=>{
 const page=await pageFor(t,'/settings',{'butterfly-meta-connected':'true'})
 await page.evaluate(async()=>{const {addLocalAd}=await import('/src/data/ads.ts');const blob=await fetch('/brand/kindred-campaign-hands.png').then(r=>r.blob());addLocalAd(new File([blob],'Preserved local creative.png',{type:blob.type}))})
 await page.goto(base+'/ads');await page.getByRole('article',{name:'Preserved local creative.png',exact:true}).waitFor();assert.equal(await page.getByRole('article').count(),4)
 await page.goto(base+'/settings');await page.getByRole('button',{name:'Disconnect',exact:true}).click()
 await page.getByRole('alertdialog').getByText(/hides sample Meta ads.*Local uploads remain/).waitFor()
 await page.getByRole('alertdialog').getByRole('button',{name:'Disconnect',exact:true}).click()
 await page.goto(base+'/ads');await page.reload()
 await page.getByRole('article',{name:'Preserved local creative.png',exact:true}).waitFor()
 assert.equal(await page.getByRole('article').count(),1)
 await page.goto(base+'/settings');await page.getByRole('button',{name:'Reconnect',exact:true}).click()
 await page.getByRole('link',{name:'View Ads',exact:true}).click()
 await page.getByRole('article',{name:'Evening Routine — Cut 02',exact:true}).waitFor()
 assert.equal(await page.getByRole('article').count(),4)
})
test('profile explicitly identifies a local fixture and signing out clears persisted session',async t=>{
  const page=await pageFor(t,'/settings?tab=profile',{'butterfly-fixture-authenticated':'true'})
  await page.setViewportSize({width:390,height:850})
  await page.getByText('Local fixture identity · display only',{exact:true}).waitFor()
  const avatar=page.locator('.support-profile-avatar')
  assert.ok(await avatar.evaluate(element=>parseFloat(getComputedStyle(element).borderRadius)>=element.getBoundingClientRect().width/2))
  await page.getByRole('button',{name:'Sign Out',exact:true}).click();await page.waitForURL(base+'/login')
  assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-fixture-authenticated')),null)
  await page.goto(base+'/');await page.waitForURL(base+'/login')
})
test('empty-team preview cannot discard existing members when recovering to invite',async t=>{
  const page=await pageFor(t,'/team?state=empty',{'butterfly-team':JSON.stringify({people:[owner,{name:'Retained',email:'retained@example.com',role:'Viewer'}],invites:[]})})
  await page.getByRole('button',{name:'Invite Someone',exact:true}).click()
  await page.getByLabel('Email Address',{exact:true}).fill('another@example.com');await page.getByRole('button',{name:'Add Invitation'}).click();await page.reload()
  await page.getByText('Retained',{exact:true}).waitFor()
})
test('workspace reset cancels an in-flight save and settings failures can recover',async t=>{
  const page=await pageFor(t,'/settings?tab=workspace&state=save-failure')
  await page.getByText('Settings Were Not Saved',{exact:true}).waitFor()
  await page.getByLabel('Workspace name').fill('Cancelled update');await page.getByRole('button',{name:'Save Workspace'}).click()
  await page.getByRole('button',{name:'Reset Changes'}).click();await page.waitForTimeout(450)
  assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-workspace-name')),null)
  assert.equal(await page.getByLabel('Workspace name').inputValue(),'Kindred')
  await page.getByLabel('Workspace name').fill('Recovered');await page.getByRole('button',{name:'Save Workspace'}).click();await page.getByText('Workspace settings saved in this browser.',{exact:true}).waitFor()
})
test('corrupt team storage falls back without crashing and fixture load failures retry',async t=>{
  const page=await pageFor(t,'/team?state=error',{'butterfly-team':'{broken'})
  await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByLabel('Role for Demo Editor').waitFor()
  await page.goto(base+'/team?state=loading');await page.getByRole('heading',{name:'Loading Team'}).waitFor()
  await page.goto(base+'/team?state=invite-failure');await page.getByText('Delivery failed',{exact:true}).waitFor()
})
test('migration canonicalizes duplicate identities and repairs a single protected owner before removal',async t=>{
 const page=await pageFor(t,'/team',{'butterfly-team':JSON.stringify({people:[{name:'Demo Owner legacy',email:'OWNER@kindred.example',role:'Viewer'},{name:'Demo Owner duplicate',email:'owner@kindred.example',role:'Editor'},{name:'Alex',email:' Alex@Example.com ',role:'Editor'},{name:'Alex duplicate',email:'alex@example.com',role:'Viewer'}],invites:[]})})
 const state=await page.evaluate(async()=>{const {readTeam}=await import('/src/lib/support-storage.ts');return readTeam()})
 assert.equal(state.people.length,2);assert.equal(state.people.filter(p=>p.role==='Owner').length,1);assert.equal(state.people.find(p=>p.role==='Owner').email,'owner@kindred.example')
 assert.equal(await page.getByRole('button',{name:/Remove Demo Owner/}).count(),0)
 const remove=page.getByRole('button',{name:'More actions for Alex',exact:true});await remove.click();await page.getByRole('menuitem',{name:'Remove Alex',exact:true}).click();await page.getByRole('button',{name:'Remove Member',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'})
 assert.ok(await page.getByRole('heading',{name:'Members',exact:true}).evaluate(el=>el===document.activeElement))
 const protectedWrite=await page.evaluate(async()=>{const {readTeam,saveTeam}=await import('/src/lib/support-storage.ts');const team=readTeam();return saveTeam({...team,people:team.people.filter(p=>p.role!=='Owner')})})
 assert.equal(protectedWrite,false);await page.reload();await page.getByRole('heading',{name:'Members',exact:true}).waitFor();assert.equal(await page.getByText('Owner',{exact:true}).count(),1)
})
test('multiple owners normalize deterministically and unsupported versions stay preserved and read-only',async t=>{
 const page=await pageFor(t,'/team',{'butterfly-team':JSON.stringify({version:1,people:[owner,{name:'Other owner',email:'other@example.com',role:'Owner'}],invites:[]})})
 assert.equal(await page.getByText('Owner',{exact:true}).count(),1)
 const future=JSON.stringify({version:2,futureData:'preserve'})
 await page.evaluate(value=>localStorage.setItem('butterfly-team',value),future);await page.reload()
 await page.getByText('This team record uses a newer format. Changes are disabled to preserve it.').waitFor()
 assert.ok(await page.getByRole('button',{name:'Invite Member'}).isDisabled())
 assert.equal(await page.evaluate(()=>localStorage.getItem('butterfly-team')),future)
})
test('invite cancellation restores focus and 390/320 rows retain named actions without overflow',async t=>{
 const page=await pageFor(t,'/team',{'butterfly-team':JSON.stringify({version:1,people:[owner,{name:'Alex',email:'alex@example.com',role:'Viewer'},{name:'Demo Editor',email:'editor@kindred.example',role:'Editor'}],invites:[{email:'pending@example.com',role:'Viewer',status:'pending'}]})})
 const cancel=page.getByRole('button',{name:'More actions for invitation to pending@example.com'});await cancel.click();await page.getByRole('menuitem',{name:'Cancel Invitation',exact:true}).click()
 assert.ok(await page.getByRole('heading',{name:'Pending Invitations',exact:true}).evaluate(el=>el===document.activeElement))
 for(const width of [390,320]){await page.setViewportSize({width,height:850});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);for(const name of ['Alex','Demo Editor']){const button=page.getByRole('button',{name:`More actions for ${name}`,exact:true});assert.ok(await button.isVisible());assert.ok((await button.boundingBox()).width>=44)}}
})
test('disconnect retry clears stale failure and successful close focuses the surviving source heading',async t=>{
 const page=await pageFor(t,'/settings',{'butterfly-meta-connected':'true'})
 await page.evaluate(()=>{window.originalRemove=Storage.prototype.removeItem;Storage.prototype.removeItem=function(key){if(key==='butterfly-meta-connected')throw new Error('blocked');return window.originalRemove.call(this,key)}})
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Disconnect',exact:true}).click();await page.getByText('Could not disconnect. Browser storage is unavailable.').waitFor()
 await page.getByRole('button',{name:'Keep Connected'}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'});await page.evaluate(()=>{Storage.prototype.removeItem=window.originalRemove})
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();assert.equal(await page.getByText('Could not disconnect. Browser storage is unavailable.').count(),0)
 await page.getByRole('alertdialog').getByRole('button',{name:'Disconnect',exact:true}).click();await page.getByRole('alertdialog').waitFor({state:'hidden'})
 // Radix restores focus in its unmount callback, after the dialog is already hidden.
 await page.waitForFunction(el=>el===document.activeElement,await page.getByRole('heading',{name:'Creative Sources',exact:true}).elementHandle())
})
test('member row menus identify the person in their accessible name',async t=>{
 const page=await pageFor(t,'/team')
 assert.equal(await page.getByRole('button',{name:'More actions for Demo Editor',exact:true}).count(),1)
})

test('support routes use exact structural casing and deliberate responsive measures',async t=>{
 const widths=[1688,1510,1440,1280,1024,900,768,620,540,390,320]
 const page=await pageFor(t,'/team',{'butterfly-meta-connected':'true'})
 await page.getByRole('heading',{name:'Team',exact:true}).waitFor();await openInvite(page);await page.getByRole('heading',{name:'Invite Someone',exact:true}).waitFor();await page.getByRole('button',{name:'Add Invitation',exact:true}).waitFor();await page.keyboard.press('Escape')
 for(const width of widths){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:`/tmp/task6-fix-team-${width}.png`,fullPage:true})}
 const settingsTabs=[
  {path:'/settings',ready:()=>page.getByText('Sample Source Ready',{exact:true}),slug:'sources'},
  {path:'/settings?tab=analysis-properties',ready:()=>page.getByRole('heading',{name:'Analysis Properties',exact:true}),slug:'analysis-properties'},
  {path:'/settings?tab=workspace',ready:()=>page.getByRole('button',{name:'Save Workspace',exact:true}),slug:'workspace'},
  {path:'/settings?tab=profile',ready:()=>page.getByRole('heading',{name:'Your Profile',exact:true}),slug:'profile'},
 ]
 for(const tab of settingsTabs){
  await page.goto(base+tab.path);await page.getByRole('heading',{name:'Settings',exact:true}).waitFor();await tab.ready().waitFor()
  for(const width of widths){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);const body=await page.locator('.support-tab-body').boundingBox();assert.ok(body.width<=width);assert.ok(body.x>=0);if(width===1688)assert.ok(body.width>760);await page.screenshot({path:`/tmp/task6-fix-settings-${tab.slug}-${width}.png`,fullPage:true})}
 }
 await page.goto(base+'/settings');await page.getByRole('link',{name:'View Ads',exact:true}).waitFor()
 await page.goto(base+'/settings?tab=profile');await page.getByRole('button',{name:'Sign Out',exact:true}).waitFor()
})

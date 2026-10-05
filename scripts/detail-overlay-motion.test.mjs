import assert from 'node:assert/strict'
import {before,after,test} from 'node:test'
import {createServer} from 'vite'
import {chromium} from 'playwright'
let server,browser,base
before(async()=>{server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();base=`http://127.0.0.1:${server.httpServer.address().port}`;browser=await chromium.launch({headless:true})})
after(async()=>{await browser?.close();await server?.close()})
for(const width of [1280,390])test(`reduced motion preserves real dialog centering and reachable save/close at ${width}`,async t=>{
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});t.after(()=>page.close());page.setDefaultTimeout(2500)
 await page.addInitScript(()=>localStorage.setItem('butterfly-meta-connected','true'))
 await page.goto(`${base}/app/ads/1235086835413596?panel=notes`)
 await page.getByRole('button',{name:'Record Outcome',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'Record Version Outcome',exact:true})
 const rect=await dialog.boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width&&rect.y+rect.height<=844,JSON.stringify(rect))
 await dialog.getByLabel('Result after change',{exact:true}).fill('Manual observation')
 await dialog.getByLabel('Result source',{exact:true}).fill('Creative review')
 await dialog.getByLabel('Result window',{exact:true}).fill('Today')
 await dialog.getByRole('button',{name:'Save Outcome',exact:true}).click()
 await page.getByRole('button',{name:'Record Outcome',exact:true}).click()
 await dialog.getByRole('button',{name:'Close',exact:true}).click()
 await page.goto(`${base}/app/ads/1235086835413596?property=opening-1`)
 const sheet=page.getByRole('dialog',{name:'Evidence: Hook type',exact:true});await sheet.waitFor()
 const bounds=await sheet.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=845,JSON.stringify(bounds))
 await page.keyboard.press('Escape')
})

import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createServer } from "vite"
import { chromium } from "playwright"

let server, browser, base
before(async () => {
  server = await createServer({ server: { port: 0, host: "127.0.0.1" }, plugins: [{name:"shared-contract-fixture", configureServer(vite) { vite.middlewares.use("/__contracts", (_request, response) => {
    response.setHeader("Content-Type", "text/html")
    response.end('<html><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module" src="/scripts/shared-contracts.fixture.tsx"></script></body></html>')
  }) }}] })
  await server.listen()
  base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
})
after(async () => { await browser?.close(); await server?.close() })

async function fixture(t, names) {
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  t.after(async () => { await page.close(); assert.deepEqual(errors, [], "browser must not report runtime errors") })
  await page.goto(`${base}/__contracts?account=kindred#selection`)
  await page.waitForFunction(() => Array.isArray(window.availableContracts))
  const available = await page.evaluate(() => window.availableContracts)
  for (const name of names) assert.ok(available.includes(name), `${name} public contract is missing`)
  return page
}

test("semantic headings, actions and tabs use the uppercase structural treatment", async t => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${base}/app/ads`)
  await page.locator(".bf-page-header h1").waitFor()
  assert.equal(await page.locator(".bf-page-header h1").evaluate(element => getComputedStyle(element).textTransform), "uppercase")
  assert.equal(await page.locator(".bf-button").first().evaluate(element => getComputedStyle(element).textTransform), "uppercase")
  assert.equal(await page.locator(".bf-page-tabs__link").first().evaluate(element => getComputedStyle(element).textTransform), "uppercase")
  await page.goto(`${base}/app/demo/design-system#navigation`)
  await page.locator(".bf-tabs__tab").first().waitFor()
  assert.equal(await page.locator(".bf-tabs__tab").first().evaluate(element => getComputedStyle(element).textTransform), "uppercase")
})

test("upload/account contracts expose named inputs, selected files, progress and honest document preview", async t => {
  const page = await fixture(t, ["Dropzone", "FilePreview", "UploadProgress", "AccountSwitcher"])
  await page.getByLabel("Choose creative", {exact:true}).setInputFiles({name:"creative.png",mimeType:"image/png",buffer:Buffer.from("fixture")})
  assert.equal(await page.getByLabel("Chosen files").textContent(), "creative.png")
  assert.equal(await page.getByLabel("Disabled upload", {exact:true}).isDisabled(), true)
  assert.equal(await page.getByRole("progressbar", {name:"Creative.png upload"}).getAttribute("aria-valuenow"), "40")
  assert.ok(await page.getByText("Document preview unavailable").isVisible())
  await page.getByRole("combobox", {name:"Account"}).selectOption("upload")
  assert.equal(await page.getByLabel("Selected account").textContent(), "upload")
})

test("dataset controls support keyboard overlay dismissal, sorting and independent selection", async t => {
  const page = await fixture(t, ["FilterBar", "FilterPopover", "SortSelect", "DataTable", "CreativeCard", "MetricCell"])
  const trigger = page.getByRole("button", {name:"Filter ads"})
  await trigger.focus(); await page.keyboard.press("Enter")
  await page.getByRole("dialog", {name:"Filter ads"}).waitFor()
  await page.getByRole("checkbox", {name:"Active only"}).check()
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => document.activeElement?.textContent === "Filter ads")
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true)
  assert.equal(await trigger.getAttribute("aria-expanded"), "false")
  await page.getByRole("combobox", {name:"Sort by"}).selectOption("recent")
  assert.equal(await page.getByLabel("Sort value").textContent(), "recent")
  const table = page.getByRole("table", {name:"Creative records"})
  await table.getByRole("button", {name:"Sort by Ad"}).click()
  assert.equal(await table.getByRole("columnheader", {name:"Sort by Ad"}).getAttribute("aria-sort"), "descending")
  await table.getByRole("checkbox", {name:"Select Evening reset"}).check()
  assert.equal(await page.getByLabel("Selected rows").textContent(), "one")
  assert.ok(await page.getByRole("link", {name:"Evening reset"}).isVisible())
  assert.ok(await page.getByText("No delivery data").isVisible())
  const media = await page.locator(".bf-creative-card__media").boundingBox()
  assert.ok(Math.abs(media.width - media.height) < 1, "square creative stage must retain its source ratio")
})

test("responsive filter task and comparison matrix are shared customer-facing contracts", async t => {
  const wide = await fixture(t, ["ResponsiveFilterTask", "ComparisonMatrix"])
  await wide.setViewportSize({ width: 1440, height: 900 })
  const wideTrigger = wide.getByRole("button", { name: "More filters" })
  await wideTrigger.focus()
  await wide.keyboard.press("Enter")
  await wide.getByRole("dialog", { name: "Filter creative" }).waitFor()
  assert.equal(await wide.getByRole("dialog", { name: "Filter creative" }).getAttribute("data-presentation"), "popover")
  await wide.keyboard.press("Escape")
  await wide.waitForFunction(() => document.activeElement?.textContent === "More filters")
  assert.equal(await wideTrigger.evaluate(element => element === document.activeElement), true)
  const matrix = wide.getByRole("table", { name: "Creative comparison" })
  assert.equal(await matrix.getByRole("columnheader").count(), 3)
  assert.equal(await matrix.getByRole("rowheader").count(), 2)

  const narrow = await browser.newPage({ viewport: { width: 390, height: 844 } })
  t.after(() => narrow.close())
  await narrow.goto(`${base}/__contracts`)
  const narrowTrigger = narrow.getByRole("button", { name: "More filters" })
  await narrowTrigger.click()
  const sheet = narrow.getByRole("dialog", { name: "Filter creative" })
  await sheet.waitFor()
  assert.equal(await sheet.getAttribute("data-presentation"), "sheet")
  await narrow.keyboard.press("Escape")
  await narrow.waitForFunction(() => document.activeElement?.textContent === "More filters")
  assert.equal(await narrowTrigger.evaluate(element => element === document.activeElement), true)
})

test("governed calendar pickers expose real overlays, keyboard dismissal and range state", async t => {
  const page = await fixture(t, ["CalendarDatePicker", "CalendarDateRangePicker"])
  const schedule = page.getByRole("button", { name: "Schedule for" })
  await schedule.focus(); await page.keyboard.press("Enter")
  const calendar = page.getByRole("dialog", { name: "Schedule for calendar" })
  await calendar.waitFor()
  await calendar.getByRole("gridcell", { name: "October 15, 2026" }).click()
  assert.equal(await page.getByLabel("Selected date").textContent(), "2026-10-15")
  await page.waitForFunction(element => element === document.activeElement, await schedule.elementHandle())
  assert.equal(await schedule.evaluate(node => node === document.activeElement), true)

  const range = page.getByRole("button", { name: "Performance window" })
  await range.focus(); await page.keyboard.press("Enter")
  const rangeCalendar = page.getByRole("dialog", { name: "Performance window calendar" })
  await rangeCalendar.waitFor()
  assert.equal(await rangeCalendar.getByRole("grid").count(), 1)
  await page.keyboard.press("Escape")
  await page.waitForFunction(element => element === document.activeElement, await range.elementHandle())
  assert.equal(await range.evaluate(node => node === document.activeElement), true)
})

test("review contracts expose keyboard shot selection, transcript seeking and linked timeline provenance", async t => {
  const page = await fixture(t, ["ShotStrip", "Transcript", "ActivityTimeline"])
  await page.getByRole("button", {name:"0:07 Product proof"}).focus()
  await page.keyboard.press("Enter")
  assert.equal(await page.getByLabel("Selected time").textContent(), "7")
  assert.equal(await page.getByRole("button", {name:"0:07 Product proof"}).getAttribute("aria-pressed"), "true")
  await page.getByRole("button", {name:"0:00 Opening"}).click()
  await page.getByRole("button", {name:"0:07 A calmer evening routine"}).click()
  assert.equal(await page.getByLabel("Selected time").textContent(), "7")
  assert.equal(await page.getByRole("link", {name:"Version saved"}).getAttribute("href"), "/ads/one#version")
  await page.getByRole("link", {name:"Groups",exact:true}).click()
  await page.waitForSelector('a[aria-current="page"][href*="view=groups"]')
  assert.ok(page.url().endsWith("?account=kindred&view=groups#selection"))
  assert.equal(await page.getByRole("link", {name:"Groups",exact:true}).getAttribute("aria-current"), "page")
})

test("catalogue upload retry changes the demonstrated error state", async t => {
  const page = await browser.newPage()
  t.after(() => page.close())
  await page.goto(`${base}/app/demo/design-system#workflows`)
  await page.getByRole("button", {name:"Retry Product proof.mp4"}).click()
  await page.getByText("Sample upload interrupted", {exact:true}).waitFor({state:"hidden",timeout:1500})
})

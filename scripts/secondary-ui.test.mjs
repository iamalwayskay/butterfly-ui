import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { chromium } from "playwright"
import { createServer } from "vite"

let server, browser, base
before(async () => {
  server = await createServer({ server: { port: 0, host: "127.0.0.1" } })
  await server.listen()
  base = `http://127.0.0.1:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
})
after(async () => { await browser?.close(); await server?.close() })

async function pageFor(t, path, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } })
  page.setDefaultTimeout(6000)
  t.after(() => page.close())
  await page.addInitScript(() => localStorage.setItem("butterfly-meta-connected", "true"))
  await page.goto(base + path)
  return page
}

test("desktop library filters use a popover and mobile filters use a sheet", async t => {
  const desktop = await pageFor(t, "/app/ads", 1440)
  const desktopTrigger = desktop.getByRole("button", { name: "Filters", exact: true })
  await desktopTrigger.click()
  assert.equal(await desktop.locator('[data-slot="sheet-content"]').count(), 0)
  await desktop.locator(".bf-responsive-filter--popover").waitFor()
  await desktop.screenshot({ path: "/tmp/butterfly-secondary/library-filter-1440.png", fullPage: true })
  await desktop.keyboard.press("Escape")
  await desktop.waitForFunction(element => document.activeElement === element, await desktopTrigger.elementHandle(), { timeout: 10000 })

  const mobile = await pageFor(t, "/app/ads", 390)
  await mobile.getByRole("button", { name: "Filters", exact: true }).click()
  await mobile.getByRole("dialog", { name: "Filter Ads" }).waitFor()
  await mobile.screenshot({ path: "/tmp/butterfly-secondary/library-filter-390.png", fullPage: true })
})

test("comparison is a modal overlay and Escape restores the trigger", async t => {
  const page = await pageFor(t, "/app/ads", 1440)
  await page.getByRole("checkbox", { name: /Select Evening Routine/ }).check()
  await page.getByRole("checkbox", { name: /Select Serum Still Life/ }).check()
  const trigger = page.getByRole("button", { name: "Compare", exact: true })
  await trigger.click()
  await page.getByRole("dialog", { name: "Compare Selected Ads" }).waitFor()
  await page.waitForTimeout(260)
  const compareBox = await page.getByRole("dialog", { name: "Compare Selected Ads" }).boundingBox()
  assert.ok(compareBox && compareBox.x >= 16 && compareBox.x + compareBox.width <= 1424, JSON.stringify(compareBox))
  await page.screenshot({ path: "/tmp/butterfly-secondary/compare-1440.png", fullPage: true })
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Compare")
})

test("comparison keeps 2–4 selected creatives, ratios and active context visible", async t => {
  for (const width of [1440, 390, 320]) {
    const page = await pageFor(t, "/app/ads?campaign=Daily+ritual&status=live&range=7", width)
    await page.getByRole("checkbox", { name: /Select Evening Routine/ }).check()
    await page.getByRole("checkbox", { name: /Select Serum Still Life/ }).check()
    await page.getByRole("button", { name: "Compare", exact: true }).click()
    const dialog = page.getByRole("dialog", { name: "Compare Selected Ads" })
    await dialog.waitFor()
    assert.equal(await dialog.getByRole("img").count(), 2)
    assert.match(await dialog.getByText(/Campaign: Daily ritual/).first().textContent(), /Daily ritual/)
    assert.match(await dialog.getByText(/Status: Live/).first().textContent(), /Status: Live/)
    assert.match(await dialog.getByText(/7 days ending 22 Sep 2026/).first().textContent(), /7 days/)
    for (const image of await dialog.getByRole("img").all()) {
      assert.equal(await image.evaluate(node => getComputedStyle(node).objectFit), "contain")
    }
    const containment = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }))
    assert.ok(containment.documentWidth <= containment.viewportWidth + 1, `comparison escaped the ${width}px document`)
    const scroller = dialog.getByRole("region", { name: "Comparison Columns" })
    assert.equal(await scroller.evaluate(node => node.scrollWidth > node.clientWidth), width < 640)
    if (width < 640) assert.ok(await dialog.getByText("2 creatives · Scroll horizontally to compare →", { exact: true }).isVisible())
    await page.screenshot({ path: `/tmp/butterfly-secondary/compare-${width}.png`, fullPage: true })
  }
})

test("saved group creation and deletion use governed dialogs", async t => {
  const page = await pageFor(t, "/app/ads?view=groups", 1440)
  const create = page.getByRole("button", { name: "New Group", exact: true })
  await create.click()
  await page.getByRole("dialog", { name: "New Group" }).waitFor()
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "New Group")
  await page.getByRole("button", { name: "Delete Group", exact: true }).click()
  await page.getByRole("alertdialog", { name: /Delete .* Group/ }).waitFor()
})

test("ad evidence opens in a supporting sheet and restores the finding trigger", async t => {
  const page = await pageFor(t, "/app/ads/1235086835413596?panel=jev", 1440)
  await page.getByRole("heading", { level: 1 }).waitFor()
  const finding = page.getByRole("button", { name: /Hook line/i }).first()
  await finding.click()
  await page.getByRole("dialog", { name: /Evidence: Hook line/i }).waitFor()
  await page.waitForTimeout(260)
  await page.screenshot({ path: "/tmp/butterfly-secondary/evidence-1440.png", fullPage: true })
  await page.keyboard.press("Escape")
  await page.waitForTimeout(500)
  assert.match(await page.evaluate(() => document.activeElement?.textContent || document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName || ""), /Hook line/i)
})

test("Neural Ideation restores the production opener on Escape", async t => {
  const page = await pageFor(t, "/app/ads/1235086835413596?panel=jev", 1440)
  const trigger = page.getByRole("button", { name: "Run JEV Neural Ideation", exact: true })
  await trigger.click()
  await page.getByRole("dialog", { name: "JEV Neural Ideation", exact: true }).waitFor()
  await page.waitForTimeout(200)
  await page.screenshot({ path: "/tmp/butterfly-secondary/ideation-1440.png", fullPage: true })
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Run JEV Neural Ideation")
})

test("Neural Ideation preserves exact provenance through Create Ads", async t => {
  for (const width of [1440, 390, 320]) {
    const page = await pageFor(t, "/app/ads/1235086835413596?panel=jev&property=opening-1&ideate=1", width)
    const dialog = page.getByRole("dialog", { name: "JEV Neural Ideation" })
    await dialog.waitFor()
    await dialog.getByRole("combobox", { name: "Output Type" }).selectOption("script")
    assert.match(await dialog.getByText("Ad 1235086835413596", { exact: true }).textContent(), /1235086835413596/)
    assert.match(await dialog.getByText("Property opening-1", { exact: true }).textContent(), /opening-1/)
    await dialog.getByLabel("Generated Output").fill("Open on the finished skin result, then show the routine.")
    const create = dialog.getByRole("button", { name: "Continue to Create Ads", exact: true })
    await create.focus()
    assert.equal(await create.evaluate(node => node === document.activeElement), true)
    const bounds = await dialog.boundingBox()
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `ideation dialog escaped ${width}px viewport: ${JSON.stringify(bounds)}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    await page.screenshot({ path: `/tmp/butterfly-secondary/ideation-${width}.png`, fullPage: true })
    await create.click()
    await page.waitForURL(url => url.pathname.endsWith("/create"))
    const url = new URL(page.url())
    assert.equal(url.searchParams.get("ad"), "1235086835413596")
    assert.equal(url.searchParams.get("property"), "opening-1")
    assert.equal(url.searchParams.get("sourceAds"), "1235086835413596")
    const draftId = url.searchParams.get("draft")
    assert.ok(draftId)
    const stored = await page.evaluate(id => JSON.parse(localStorage.getItem("butterfly:workflow:v1")).drafts.find(draft => draft.id === id), draftId)
    assert.equal(stored.adId, "1235086835413596")
    assert.equal(stored.propertyId, "opening-1")
    assert.equal(stored.change, "Open on the finished skin result, then show the routine.")
    assert.match(await page.getByText("Open on the finished skin result, then show the routine.", { exact: true }).first().textContent(), /finished skin result/)
    const sourceHref = new URL(await page.getByRole("link", { name: "Open Source Ad", exact: true }).getAttribute("href"), base)
    assert.equal(sourceHref.searchParams.get("property"), "opening-1")
    assert.equal(sourceHref.searchParams.get("draft"), draftId)
  }
})

test("mobile Clear All Filters remains a 44px action", async t => {
  for (const width of [390, 320]) {
    const page = await pageFor(t, "/app/ads", width)
    await page.getByRole("button", { name: "Filters", exact: true }).click()
    const action = page.getByRole("dialog", { name: "Filter Ads" }).getByRole("button", { name: "Clear All Filters", exact: true })
    const box = await action.boundingBox()
    assert.ok(box && box.height >= 44, `Clear All Filters was ${box?.height}px at ${width}px`)
    await page.screenshot({ path: `/tmp/butterfly-secondary/filters-${width}.png`, fullPage: true })
  }
})

test("review issues and paused receipts expose bounded detail surfaces", async t => {
  const page = await pageFor(t, "/app/create", 1440)
  await page.getByRole("button", { name: "Load Sample Batch", exact: true }).click()
  await page.getByRole("link", { name: "Review & Send", exact: true }).click()
  await page.getByRole("button", { name: /^View Issues for / }).first().click()
  await page.getByRole("dialog", { name: /Issues for / }).waitFor()
  await page.waitForTimeout(260)
  await page.screenshot({ path: "/tmp/butterfly-secondary/issues-1440.png", fullPage: true })
  await page.keyboard.press("Escape")
  await page.getByLabel("I reviewed this paused batch").check()
  await page.getByRole("button", { name: "Send to Meta as Paused Ad", exact: true }).click()
  await page.getByText("3 Paused Receipts", { exact: true }).waitFor()
  await page.getByRole("button", { name: /^View Receipt for / }).first().click()
  const receipt = page.getByRole("dialog", { name: /Paused Receipt:/ })
  await receipt.waitFor()
  assert.match(await receipt.textContent(), /Source Ad ID|User-supplied creative/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(260)
  await page.screenshot({ path: "/tmp/butterfly-secondary/receipt-390.png", fullPage: true })
})

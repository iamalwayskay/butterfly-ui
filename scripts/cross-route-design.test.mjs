import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { chromium } from "playwright"
import { createServer } from "vite"

let server, browser, base

before(async () => {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 } })
  await server.listen()
  base = `http://app.butterfly.localhost:${server.httpServer.address().port}`
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
  })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

async function pageFor(t, path, width = 1440, waitForHeading = true) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  // A cold Vite transform of the detail workspace can exceed five seconds on
  // the supported CI/dev machines even though the route renders correctly.
  page.setDefaultTimeout(10000)
  page.on("pageerror", error => errors.push(error.message))
  await context.addInitScript(() => {
    localStorage.setItem("butterfly-fixture-authenticated", "true")
    localStorage.setItem("butterfly-meta-connected", "true")
  })
  t.after(async () => {
    await context.close()
    assert.deepEqual(errors, [])
  })
  await page.goto(base + path)
  // Property deep links intentionally open a modal evidence sheet, which
  // makes the background h1 inaccessible while the sheet owns focus.
  if (waitForHeading) await page.getByRole("heading", { level: 1 }).waitFor()
  return page
}

test("SelectField and RoleSelect share the 14/20 custom-chevron control anatomy", async t => {
  const page = await pageFor(t, "/team")
  const member = page.getByLabel("Role for Demo Editor")
  await page.getByRole("button", { name: "Invite Member", exact: true }).click()
  const invite = page.getByLabel("Role", { exact: true })
  for (const select of [member, invite]) {
    const style = await select.evaluate(element => {
      const computed = getComputedStyle(element)
      return { appearance: computed.appearance, fontSize: computed.fontSize, lineHeight: computed.lineHeight, height: computed.height }
    })
    assert.deepEqual(style, { appearance: "none", fontSize: "14px", lineHeight: "20px", height: "44px" })
  }
  assert.equal(await member.locator("xpath=..").locator(".bf-field__select-icon").count(), 1)
})

test("workspace routes use one token-backed title edge on desktop and mobile", async t => {
  const page = await pageFor(t, "/ads")
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(base + "/ads")
    const libraryX = (await page.getByRole("heading", { level: 1 }).boundingBox()).x
    await page.goto(base + "/ads/1235086835413596")
    const detailX = (await page.getByRole("heading", { level: 1 }).boundingBox()).x
    assert.equal(detailX, libraryX)
  }
})

test("JEV opens only the selected group on entry and keeps the selected property visible", async t => {
  const page = await pageFor(t, "/ads/1235086835413596?property=offer-and-action-3", 1440, false)
  await page.locator('.bf-property-list__row[aria-pressed="true"]').waitFor()
  const expanded = page.locator('.bf-property-list__group-trigger[aria-expanded="true"]')
  assert.equal(await expanded.count(), 1)
  assert.ok(await page.locator('.bf-property-list__row[aria-pressed="true"]').isVisible())
})

test("Team remains within the viewport at the exact tablet breakpoint", async t => {
  const page = await pageFor(t, "/team", 768)
  assert.ok(await page.getByLabel("Role for Demo Editor").isVisible())
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
})

test("sample identity stays visible without repeated narration", async t => {
  const page = await pageFor(t, "/ads")
  await page.evaluate(async () => {
    const { saveIterationDraft } = await import("/src/lib/iterations.ts")
    saveIterationDraft({ id: "local-provenance", adId: "1235086835413596", kind: "variant", change: "Local provenance check", createdAt: "2026-10-04T10:00:00.000Z", owner: "Demo Owner", status: "draft", sample: false })
  })
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(base + "/ads")
    await page.getByText("Sample account · Kindred", { exact: true }).waitFor()
    assert.equal(await page.getByText("Sample account · Kindred", { exact: true }).count(), 1)
    let text = await page.locator("main").innerText()
    // Per-card source and metric provenance is intentional; reject only the
    // superseded explanatory narration around that compact context.
    assert.equal(text.includes("Sample delivery:"), false)
    assert.ok(text.includes("days ending 22 Sep 2026"))

    await page.goto(base + "/ads/1235086835413596")
    await page.getByText(/Sample JEV analysis/, { exact: true }).waitFor()
    assert.equal(await page.getByText(/Sample JEV analysis/, { exact: true }).count(), 1)
    text = await page.locator("main").innerText()
    for (const phrase of ["sample concept-cut timing", "Sample shot"]) assert.equal(text.includes(phrase), false)

    await page.goto(base + "/ads/1235086835413596?panel=performance")
    await page.getByText(/Sample Meta delivery/, { exact: true }).waitFor()
    assert.equal(await page.getByText(/Sample Meta delivery/, { exact: true }).count(), 1)
    assert.equal(await page.getByText(/Sample JEV analysis/, { exact: true }).count(), 0)

    await page.goto(base + "/work?view=drafts")
    const sampleRow = page.locator(".work-queue-row").filter({ has: page.getByRole("heading", { name: "Show the result before the routine demonstration.", exact: true }) })
    const localRow = page.locator(".work-queue-row").filter({ has: page.getByRole("heading", { name: "Local provenance check", exact: true }) })
    await sampleRow.waitFor()
    await localRow.waitFor()
    assert.equal(await sampleRow.getByText("Sample", { exact: true }).count(), 1)
    assert.equal(await localRow.getByText("Local", { exact: true }).count(), 1)
    text = await page.locator("main").innerText()
    for (const phrase of ["Sample records are labelled", "not a new extracted observation", "not a service call"]) assert.equal(text.includes(phrase), false)
  }
})

test("affected routes stay aligned and overflow-free at all required widths", async t => {
  const page = await pageFor(t, "/ads")
  for (const width of [1688, 1510, 1280, 1024, 900, 768, 620, 540, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ["/ads", "/ads/1235086835413596", "/work", "/team"]) {
      await page.goto(base + path)
      await page.getByRole("heading", { level: 1 }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} overflows at ${width}px`)
    }
  }
})

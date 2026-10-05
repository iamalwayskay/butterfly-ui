import assert from "node:assert/strict"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, test } from "node:test"
import { chromium } from "playwright"
import { createServer } from "vite"

const widths = [1688, 1510, 1280, 1024, 900, 768, 620, 540, 390, 320]
const canonical = [
  { id: "marketing", path: "/", heading: /Your Ads/ , public: true },
  { id: "sign-in", path: "/login", heading: "Sign In to Butterfly" },
  { id: "add-meta", path: "/add?tab=meta", heading: "Add Ads", active: "Connect Meta" },
  { id: "add-upload", path: "/add?tab=upload", heading: "Add Ads", active: "Upload" },
  { id: "ads-all", path: "/ads?view=all", heading: "My Ads", active: "All Ads" },
  { id: "ads-groups", path: "/ads?view=groups&group=barrier-cream-tests", heading: "My Ads", active: "Saved Groups" },
  { id: "detail-jev", path: "/ads/2529793287483755?panel=jev", heading: "Serum Still Life — Cut 01", active: "JEV Review" },
  { id: "detail-performance", path: "/ads/2529793287483755?panel=performance", heading: "Serum Still Life — Cut 01", active: "Performance" },
  { id: "detail-notes", path: "/ads/2529793287483755?panel=notes", heading: "Serum Still Life — Cut 01", active: "Notes & Versions" },
  { id: "create-copy", path: "/create?step=copy", heading: "Create Ads", active: "Assets & Copy", create: true },
  { id: "create-creative", path: "/create?step=creative", heading: "Create Ads", active: "Creative Preview", create: true },
  { id: "create-setup", path: "/create?step=setup", heading: "Create Ads", active: "Meta Setup", create: true },
  { id: "create-review", path: "/create?step=review", heading: "Create Ads", active: "Review & Send", create: true },
  { id: "creative-canvas", path: "/canvas", heading: "Creative Canvas" },
  { id: "work-review", path: "/work?view=review", heading: "Work Queue", active: /^Needs Review/ },
  { id: "work-drafts", path: "/work?view=drafts", heading: "Work Queue", active: /^Drafts/ },
  { id: "work-completed", path: "/work?view=completed", heading: "Work Queue", active: /^Completed/ },
  { id: "team", path: "/team", heading: "Team" },
  { id: "settings-sources", path: "/settings?tab=sources", heading: "Settings", active: "Sources" },
  { id: "settings-analysis-properties", path: "/settings?tab=analysis-properties", heading: "Settings", active: "Analysis Properties" },
  { id: "settings-workspace", path: "/settings?tab=workspace", heading: "Settings", active: "Workspace" },
  { id: "settings-profile", path: "/settings?tab=profile", heading: "Settings", active: "Profile" },
]

let server, browser, appBase, publicBase, output
const manifest = { generatedAt: "", output: "", widths, canonical: [], shell: [], secondary: [], states: [] }

before(async () => {
  output = process.env.MATRIX_OUTPUT_DIR || await mkdtemp(join(tmpdir(), "butterfly-final-ui-matrix-"))
  for (const directory of ["base", "shell", "secondary", "states"]) await mkdir(join(output, directory), { recursive: true })
  server = await createServer({ server: { host: "127.0.0.1", port: 0 } })
  await server.listen()
  const port = server.httpServer.address().port
  appBase = `http://app.butterfly.localhost:${port}`
  publicBase = `http://127.0.0.1:${port}`
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
})

after(async () => {
  manifest.generatedAt = new Date().toISOString()
  manifest.output = output
  await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
  await browser?.close()
  await server?.close()
  process.stdout.write(`\nFinal UI matrix: ${output}\n`)
})

async function openPage(path, width, { publicHost = false, reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion })
  await context.addInitScript(() => {
    localStorage.setItem("butterfly-fixture-authenticated", "true")
    localStorage.setItem("butterfly-meta-connected", "true")
    localStorage.setItem("butterfly-meta-ever-configured", "true")
  })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on("pageerror", error => errors.push(`pageerror: ${error.message}`))
  page.on("response", response => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) errors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto((publicHost ? publicBase : appBase) + path, { waitUntil: "networkidle" })
  return { context, page, errors }
}

async function settleAndAssert(page, label, { links = true, mobileTargets = false } = {}) {
  await page.waitForLoadState("domcontentloaded")
  await page.evaluate(async () => {
    await document.fonts.ready
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(320, innerHeight - 120)) {
      scrollTo(0, y)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(80)
  assert.equal(await page.evaluate(() => document.fonts.status), "loaded", `${label}: fonts did not settle`)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: document overflow ${await page.evaluate(() => `${document.documentElement.scrollWidth}/${innerWidth}`)}`)
  const broken = await page.locator("img:visible").evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.currentSrc || image.src || image.alt))
  assert.deepEqual(broken, [], `${label}: broken visible images`)
  const unnamed = await page.locator("button:visible,[role=button]:visible").evaluateAll(nodes => nodes.filter(node => !(node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent?.trim())).map(node => node.outerHTML.slice(0, 160)))
  assert.deepEqual(unnamed, [], `${label}: unnamed controls`)
  if (links) {
    const hrefs = await page.locator("a:visible").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")).filter(Boolean))
    for (const href of new Set(hrefs)) {
      assert.notEqual(href, "#", `${label}: dead # href`)
      if (href.startsWith("#")) assert.equal(await page.locator(href).count(), 1, `${label}: missing fragment ${href}`)
      else if (href.startsWith("/") && !href.startsWith("//")) {
        const response = await page.request.get(new URL(href, page.url()).href)
        assert.ok(response.status() < 400, `${label}: dead internal href ${href} (${response.status()})`)
      }
    }
  }
  if (mobileTargets) {
    const undersized = await page.locator("button:visible,input:visible,select:visible,[role=button]:visible,.bf-page-tabs__link:visible").evaluateAll(nodes => nodes.filter(node => {
      const box = node.getBoundingClientRect()
      const adoptedInput = node instanceof HTMLInputElement && ["file", "checkbox", "radio"].includes(node.type)
      return !node.disabled && !adoptedInput && (box.width < 44 || box.height < 44)
    }).map(node => ({ name: node.getAttribute("aria-label") || node.textContent?.trim(), box: [node.getBoundingClientRect().width, node.getBoundingClientRect().height] })))
    assert.deepEqual(undersized, [], `${label}: mobile controls below 44px`)
  }
}

async function capture(page, kind, id, width, url) {
  const relative = `${kind}/${String(width)}-${id}.png`
  await page.screenshot({ path: join(output, relative), fullPage: true })
  manifest[kind === "base" ? "canonical" : kind].push({ id, width, url, file: relative })
}

async function assertSurface(page, surface, width) {
  await page.getByRole("heading", { level: 1, name: surface.heading, exact: typeof surface.heading === "string" }).waitFor()
  if (surface.active) {
    const active = page.getByRole("link", { name: surface.active, exact: typeof surface.active === "string" })
    await page.waitForFunction(element => element?.getAttribute("aria-current") === "page", await active.elementHandle())
    assert.equal(await active.getAttribute("aria-current"), "page", `${surface.id}: active item`)
  }
  await settleAndAssert(page, `${surface.id}@${width}`, { mobileTargets: width <= 390 })
}

test("captures exactly 22 canonical surfaces at the ten frozen widths", { timeout: 600000 }, async () => {
  for (const width of widths) {
    for (const surface of canonical.filter(item => !item.create)) {
      const session = await openPage(surface.path, width, { publicHost: surface.public })
      try {
        await assertSurface(session.page, surface, width)
        assert.deepEqual(session.errors, [], `${surface.id}@${width}: browser errors`)
        await capture(session.page, "base", surface.id, width, surface.path)
      } finally { await session.context.close() }
    }
    const stages = canonical.filter(item => item.create)
    const session = await openPage(stages[0].path, width)
    try {
      await session.page.getByRole("heading", { level: 1, name: "Create Ads", exact: true }).waitFor()
      await session.page.getByRole("button", { name: "Load Sample Batch", exact: true }).click()
      await session.page.locator(".creation-asset").nth(2).waitFor()
      for (const surface of stages) {
        await session.page.getByRole("link", { name: surface.active, exact: true }).click()
        await session.page.waitForURL(url => url.searchParams.get("step") === new URLSearchParams(surface.path.split("?")[1]).get("step"))
        await assertSurface(session.page, surface, width)
        await capture(session.page, "base", surface.id, width, surface.path)
      }
      assert.deepEqual(session.errors, [], `create stages@${width}: browser errors`)
    } finally { await session.context.close() }
  }
  assert.equal(manifest.canonical.length, 220)
  assert.equal(new Set(manifest.canonical.map(item => item.file)).size, 220)
})

test("captures shell states and verifies Escape plus focus restoration", { timeout: 60000 }, async () => {
  let session = await openPage("/ads?view=all", 1440)
  try {
    await session.page.getByRole("heading", { name: "My Ads", exact: true }).waitFor()
    await capture(session.page, "shell", "expanded", 1440, "/ads?view=all")
    const collapse = session.page.getByRole("button", { name: "Collapse Sidebar", exact: true })
    await collapse.focus(); await session.page.keyboard.press("Enter")
    await session.page.getByRole("button", { name: "Expand Sidebar", exact: true }).waitFor()
    await capture(session.page, "shell", "collapsed", 1440, "/ads?view=all")
  } finally { await session.context.close() }
  session = await openPage("/ads?view=all", 390)
  try {
    const opener = session.page.getByRole("button", { name: "Open navigation", exact: true })
    await opener.focus(); await session.page.keyboard.press("Enter")
    await session.page.getByRole("dialog").waitFor()
    await capture(session.page, "shell", "mobile-open", 390, "/ads?view=all")
    await session.page.keyboard.press("Escape")
    await session.page.getByRole("dialog").waitFor({ state: "hidden" })
    assert.equal(await opener.evaluate(node => node === document.activeElement), true)
  } finally { await session.context.close() }
  assert.equal(manifest.shell.length, 3)
})

async function secondary(id, path, action, widthsToCapture = [1440, 390], publicHost = false) {
  for (const width of widthsToCapture) {
    const session = await openPage(path, width, { publicHost })
    try {
      await session.page.getByRole("heading", { level: 1 }).waitFor()
      await action(session.page, width)
      await settleAndAssert(session.page, `${id}@${width}`, { links: false })
      assert.deepEqual(session.errors, [], `${id}@${width}: browser errors`)
      await capture(session.page, "secondary", id, width, path)
    } finally { await session.context.close() }
  }
}

test("captures required secondary UI at desktop and mobile", { timeout: 240000 }, async () => {
  const openHookEvidence = async (page, width) => {
    const analysis = page.getByRole("tab", { name: "Analysis", exact: true })
    if (width <= 760 && await analysis.count()) await analysis.click()
    const opening = page.getByRole("button", { name: /^Opening/ }).first()
    if (await opening.getAttribute("aria-expanded") !== "true") await opening.click()
    await page.getByRole("button", { name: /Hook line/i }).first().click()
    await page.getByRole("dialog", { name: /Evidence:/ }).waitFor()
  }
  await secondary("marketing-mobile-header", "/", async page => { await page.getByRole("button", { name: "Open navigation", exact: true }).click(); await page.getByRole("dialog").waitFor() }, [390], true)
  await secondary("workspace-menu", "/ads", async (page, width) => { if (width <= 768) await page.getByRole("button", { name: "Open navigation", exact: true }).click(); await page.getByRole("button", { name: "Switch account or manage sources", exact: true }).click(); await page.getByRole("menu").waitFor() })
  await secondary("library-filters", "/ads", async page => { await page.getByRole("button", { name: "Filters", exact: true }).click(); await page.getByText("Filter Ads", { exact: true }).waitFor() })
  await secondary("compare", "/ads", async page => { await page.getByRole("checkbox", { name: /Select Evening Routine/ }).check(); await page.getByRole("checkbox", { name: /Select Serum Still Life/ }).check(); await page.getByRole("button", { name: "Compare", exact: true }).click(); await page.getByRole("dialog", { name: "Compare Selected Ads", exact: true }).waitFor() })
  await secondary("group-create", "/ads?view=groups&group=barrier-cream-tests", async page => { await page.getByRole("button", { name: "New Group", exact: true }).click(); await page.getByRole("dialog", { name: "New Group", exact: true }).waitFor() })
  await secondary("group-rename", "/ads?view=groups&group=barrier-cream-tests", async page => { await page.getByRole("button", { name: "Rename Group", exact: true }).click(); await page.getByRole("dialog", { name: "Rename Group", exact: true }).waitFor() })
  await secondary("group-delete", "/ads?view=groups&group=barrier-cream-tests", async page => { await page.getByRole("button", { name: "Delete Group", exact: true }).click(); await page.getByRole("alertdialog").waitFor() })
  await secondary("evidence", "/ads/1235086835413596?panel=jev", openHookEvidence)
  await secondary("correction", "/ads/1235086835413596?panel=jev", async (page, width) => { await openHookEvidence(page, width); const dialog = page.getByRole("dialog", { name: /Evidence:/ }); await dialog.getByRole("button", { name: "Correct", exact: true }).click(); await page.getByRole("dialog", { name: /Correct / }).waitFor() })
  await secondary("neural-ideation", "/ads/1235086835413596?panel=jev", async page => { await page.getByRole("button", { name: "Run JEV Neural Ideation", exact: true }).click(); await page.getByRole("dialog", { name: "JEV Neural Ideation", exact: true }).waitFor() })
  await secondary("outcome", "/ads/1235086835413596?panel=notes", async page => { await page.getByRole("button", { name: "Record Outcome", exact: true }).first().click(); await page.getByRole("dialog", { name: "Record Version Outcome", exact: true }).waitFor() })
  await secondary("create-issue", "/create?step=copy", async page => { await page.getByRole("button", { name: "Load Sample Batch", exact: true }).click(); await page.getByRole("link", { name: "Review & Send", exact: true }).click(); await page.getByRole("button", { name: /^View Issues for / }).first().click(); await page.getByRole("dialog", { name: /Issues for / }).waitFor() })
  await secondary("paused-receipt", "/create?step=copy", async page => { await page.getByRole("button", { name: "Load Sample Batch", exact: true }).click(); await page.getByRole("link", { name: "Review & Send", exact: true }).click(); await page.getByLabel("I reviewed this paused batch").check(); await page.getByRole("button", { name: "Send to Meta as Paused Ad", exact: true }).click(); await page.getByText("3 Paused Receipts", { exact: true }).waitFor(); await page.getByRole("button", { name: /^View Receipt for / }).first().click(); await page.getByRole("dialog", { name: /Paused Receipt:/ }).waitFor() })
  await secondary("team-invite", "/team", async page => { await page.getByRole("button", { name: "Invite Member", exact: true }).click(); await page.getByRole("dialog", { name: "Invite Someone", exact: true }).waitFor() })
  await secondary("team-destructive", "/team", async page => { await page.getByRole("button", { name: "More actions for Demo Editor", exact: true }).click(); await page.getByRole("menuitem", { name: "Remove Demo Editor", exact: true }).click(); await page.getByRole("alertdialog", { name: "Remove Demo Editor?", exact: true }).waitFor() })
  await secondary("source-disconnect", "/settings?tab=sources", async page => { await page.getByRole("button", { name: "Disconnect", exact: true }).click(); await page.getByRole("alertdialog", { name: "Disconnect Kindred?", exact: true }).waitFor() })
  assert.equal(manifest.secondary.length, 31)
})

const stateFamilies = [
  { id: "new-empty", path: "/ads?state=empty" },
  { id: "loading-processing", path: "/ads?state=loading" },
  { id: "partial-progressive", path: "/add?tab=meta&state=partial" },
  { id: "ready", path: "/settings?tab=sources" },
  { id: "filtered-empty", path: "/ads?q=does-not-exist" },
  { id: "missing-media-data", path: "/ads?state=missing-media" },
  { id: "permission-auth", path: "/add?tab=meta&state=permission" },
  { id: "failure-retry", path: "/ads?state=error" },
  { id: "read-only", path: "/team?state=readonly" },
  { id: "sample-fixture", path: "/ads?view=all" },
  { id: "destructive-confirmation", path: "/settings?tab=sources", action: async page => { await page.getByRole("button", { name: "Disconnect", exact: true }).click(); await page.getByRole("alertdialog").waitFor() } },
  { id: "success", path: "/add?tab=upload&state=saved" },
]

test("captures each state family at desktop and mobile", { timeout: 120000 }, async () => {
  for (const state of stateFamilies) for (const width of [1440, 390]) {
    const session = await openPage(state.path, width)
    try {
      await session.page.getByRole("heading", { level: 1 }).waitFor()
      if (state.action) await state.action(session.page)
      await settleAndAssert(session.page, `${state.id}@${width}`, { links: false })
      assert.deepEqual(session.errors, [], `${state.id}@${width}: browser errors`)
      await capture(session.page, "states", state.id, width, state.path)
    } finally { await session.context.close() }
  }
  assert.equal(manifest.states.length, 24)
})

test("reduced motion renders settled UI and keyboard focus returns after Escape", { timeout: 30000 }, async () => {
  const session = await openPage("/ads", 390, { reducedMotion: "reduce" })
  try {
    const opener = session.page.getByRole("button", { name: "Open navigation", exact: true })
    await opener.focus(); await session.page.keyboard.press("Enter")
    const dialog = session.page.getByRole("dialog"); await dialog.waitFor()
    const moving = await dialog.locator("*, :scope").evaluateAll(nodes => nodes.filter(node => {
      const style = getComputedStyle(node)
      return style.animationDuration.split(",").some(value => parseFloat(value) > 0.01) || style.transitionDuration.split(",").some(value => parseFloat(value) > 0.01)
    }).map(node => node.className?.toString() || node.tagName))
    assert.deepEqual(moving, [], `reduced motion still animates: ${moving.join(", ")}`)
    await session.page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" })
    await session.page.waitForFunction(node => node === document.activeElement, await opener.elementHandle())
  } finally { await session.context.close() }
})

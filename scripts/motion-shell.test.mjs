import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { readFileSync } from "node:fs"
import { chromium } from "playwright"
import { createServer } from "vite"

let server, browser, base
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

before(async () => {
  server = await createServer({ server: { host: "127.0.0.1", port: 0 } })
  await server.listen()
  base = `http://app.butterfly.localhost:${server.httpServer.address().port}`
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
})

after(async () => {
  await browser?.close()
  await server?.close()
})

async function shellPage(t, width, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport: { width, height: 920 }, reducedMotion })
  await context.addInitScript(() => {
    localStorage.setItem("butterfly-fixture-authenticated", "true")
    localStorage.setItem("butterfly-meta-connected", "true")
    localStorage.setItem("butterfly-sidebar-open", "true")
  })
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  t.after(async () => {
    await context.close()
    assert.deepEqual(errors, [])
  })
  await page.goto(base + "/ads")
  await page.getByRole("heading", { level: 1 }).waitFor()
  return page
}

test("shared overlays use the finite Butterfly motion vocabulary", () => {
  const root = new URL("../", import.meta.url)
  const read = path => readFileSync(new URL(path, root), "utf8")
  const ui = ["dialog", "sheet", "dropdown-menu", "select", "tooltip"].map(name => read(`src/components/ui/${name}.tsx`)).join("\n")
  const motion = read("src/design-system/components/motion.css")
  for (const duration of ["var(--duration-fast)", "var(--duration-base)", "var(--duration-slow)"]) assert.ok(motion.includes(duration))
  assert.doesNotMatch(ui, /zoom-(?:in|out)|duration-(?:300|500)|slide-(?:in|out)-from/)
  assert.doesNotMatch(read("src/components/ui/dialog.tsx") + read("src/components/ui/sheet.tsx"), /transition-opacity/)
  assert.match(ui, /bf-overlay-close/)
  assert.match(motion, /\.bf-overlay-close[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;[\s\S]*transition:\s*opacity var\(--duration-fast\)/)
  assert.match(motion, /--motion-distance-sm/)
  assert.match(motion, /prefers-reduced-motion:\s*reduce/)
})

test("desktop shell animates 240 to 72 without removing labels from layout", async t => {
  const page = await shellPage(t, 1440)
  const shell = page.locator('[data-slot="sidebar-container"]')
  const label = page.locator(".butterfly-wordmark")
  assert.equal(Math.round((await shell.boundingBox()).width), 240)
  await page.getByRole("button", { name: "Collapse Sidebar" }).click()
  await page.waitForTimeout(45)
  const movingWidth = (await shell.boundingBox()).width
  const movingLabel = await label.evaluate(node => ({ display: getComputedStyle(node).display, opacity: Number(getComputedStyle(node).opacity), visibility: getComputedStyle(node).visibility }))
  assert.ok(movingWidth > 72 && movingWidth < 240, `shell should be between endpoints, got ${movingWidth}`)
  assert.notEqual(movingLabel.display, "none")
  assert.equal(movingLabel.visibility, "visible")
  assert.ok(movingLabel.opacity < 1)
  await page.waitForTimeout(190)
  assert.equal(Math.round((await shell.boundingBox()).width), 72)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: "/tmp/task-motion-shell-desktop-collapsed.png", fullPage: true })
  await page.getByRole("button", { name: "Expand Sidebar" }).click()
  await page.waitForTimeout(210)
  assert.equal(Math.round((await shell.boundingBox()).width), 240)
  await page.screenshot({ path: "/tmp/task-motion-shell-desktop-expanded.png", fullPage: true })
})

test("bounded menus settle by five pixels in 120ms", async t => {
  const page = await shellPage(t, 1440)
  const trigger = page.getByRole("button", { name: "Switch account or manage sources" })
  await trigger.click()
  const menu = page.locator('[data-slot="dropdown-menu-content"]')
  await menu.waitFor()
  const style = await menu.evaluate(node => ({ name: getComputedStyle(node).animationName, duration: getComputedStyle(node).animationDuration }))
  assert.equal(style.duration, "0.12s")
  assert.match(style.name, /bf-popover-in/)
  assert.equal(await page.getByRole("menuitem", { name: "Manage Sources" }).getAttribute("href"), "/settings?tab=sources")
  const search = page.getByRole("textbox", { name: "Search workspaces" })
  await search.fill("missing")
  await page.getByText("No workspaces found", { exact: true }).waitFor()
  await page.keyboard.press("Escape")
  await page.waitForFunction(node => node === document.activeElement, await trigger.elementHandle())
})

test("user menu restores focus and signs out to the login destination", async t => {
  const page = await shellPage(t, 1440)
  const trigger = page.getByRole("button", { name: "Open user menu" })
  await trigger.focus()
  await page.keyboard.press("Enter")
  assert.equal(await page.getByRole("menuitem", { name: "Profile" }).getAttribute("href"), "/settings?tab=profile")
  assert.equal(await page.getByRole("menuitem", { name: "Help" }).getAttribute("href"), "mailto:support@butterfly.local")
  await page.keyboard.press("Escape")
  await page.getByRole("menu").waitFor({ state: "hidden" })
  await page.waitForFunction(node => node === document.activeElement, await trigger.elementHandle())
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: "Sign Out" }).waitFor()
  await page.screenshot({ path: "/tmp/task-motion-shell-desktop-user-menu.png" })
  await page.getByRole("menuitem", { name: "Sign Out" }).click()
  await page.waitForURL(/\/login$/)
  assert.equal(await page.evaluate(() => localStorage.getItem("butterfly-fixture-authenticated")), null)
})

test("mobile drawer is 288px, under 240ms, and keeps 44px controls", async t => {
  const page = await shellPage(t, 390)
  await page.getByRole("button", { name: "Open navigation" }).click()
  const drawer = page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
  await drawer.waitFor()
  const drawerStyle = await drawer.evaluate(node => ({ duration: getComputedStyle(node).animationDuration, width: getComputedStyle(node).width }))
  assert.equal(drawerStyle.duration, "0.24s")
  assert.equal(drawerStyle.width, "288px")
  assert.equal(await page.locator(".butterfly-mobile-title").textContent(), "My Ads")
  const close = drawer.getByRole("button", { name: "Close" })
  assert.ok((await close.boundingBox()).width >= 44)
  assert.ok((await drawer.getByRole("link", { name: "My Ads", exact: true }).boundingBox()).height >= 44)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: "/tmp/task-motion-shell-mobile-open.png", fullPage: true })
})

for (const width of [390, 320]) test(`mobile shell menus and default close controls keep 44px targets at ${width}px`, async t => {
  const page = await shellPage(t, width)
  await page.getByRole("button", { name: "Open navigation" }).click()
  const drawer = page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
  await drawer.waitFor()
  const sheetClose = drawer.getByRole("button", { name: "Close" })
  const closeBox = await sheetClose.boundingBox()
  assert.ok(closeBox.width >= 44 && closeBox.height >= 44, `sheet close was ${closeBox.width}x${closeBox.height}`)
  assert.equal(await sheetClose.evaluate(node => getComputedStyle(node).transitionDuration), "0.12s")

  await drawer.getByRole("button", { name: "Switch account or manage sources" }).click()
  for (const name of ["Manage Sources", "Workspace Settings"]) {
    const box = await page.getByRole("menuitem", { name }).boundingBox()
    assert.ok(box.height >= 44, `${name} was ${box.height}px high`)
  }
  await page.keyboard.press("Escape")
  await drawer.getByRole("button", { name: "Open user menu" }).click()
  for (const name of ["Profile", "Help", "Sign Out"]) {
    const box = await page.getByRole("menuitem", { name }).boundingBox()
    assert.ok(box.height >= 44, `${name} was ${box.height}px high`)
  }
  await page.screenshot({ path: `/tmp/task-motion-shell-mobile-menu-${width}.png`, fullPage: true })
})

for (const width of [390, 320]) test(`default dialog close is centered in a 44px target at ${width}px`, async t => {
  const page = await shellPage(t, width)
  await page.goto(base + "/ads?view=groups")
  await page.getByRole("button", { name: "New Group" }).click()
  const dialog = page.getByRole("dialog", { name: "New Group" })
  const close = dialog.getByRole("button", { name: "Close", exact: true })
  const box = await close.boundingBox()
  const iconBox = await close.locator("svg").boundingBox()
  assert.ok(box.width >= 43.99 && box.height >= 43.99, `dialog close was ${box.width}x${box.height}`)
  assert.ok(Math.abs((iconBox.x + iconBox.width / 2) - (box.x + box.width / 2)) < 1)
  assert.ok(Math.abs((iconBox.y + iconBox.height / 2) - (box.y + box.height / 2)) < 1)
  assert.equal(await close.evaluate(node => getComputedStyle(node).transitionDuration), "0.12s")
  await page.screenshot({ path: `/tmp/task-motion-dialog-close-${width}.png`, fullPage: true })
})

for (const width of [390, 320]) test(`reduced motion renders shell and overlays directly at final state at ${width}px`, async t => {
  const page = await shellPage(t, width, "reduce")
  await page.getByRole("button", { name: "Open navigation" }).click()
  const drawer = page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
  await drawer.waitFor()
  assert.equal(await drawer.evaluate(node => getComputedStyle(node).animationName), "none")
  const closeDuration = await drawer.getByRole("button", { name: "Close" }).evaluate(node => getComputedStyle(node).transitionDuration)
  assert.ok(closeDuration === "0s" || closeDuration === "1e-05s", `reduced close duration was ${closeDuration}`)
  await drawer.getByRole("button", { name: "Switch account or manage sources" }).click()
  const menu = page.locator('[data-slot="dropdown-menu-content"]')
  await menu.waitFor()
  assert.equal(await menu.evaluate(node => getComputedStyle(node).animationName), "none")
  await page.screenshot({ path: `/tmp/task-motion-shell-mobile-reduced-${width}.png`, fullPage: true })
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const root = new URL("../", import.meta.url)
const read = (path) => readFileSync(new URL(path, root), "utf8")

test("structural headings are uppercase without coercing content names", () => {
  const library = read("src/pages/my-ads.css")
  const libraryPage = read("src/pages/my-ads.tsx")
  const detail = read("src/pages/ad-detail.css")
  const detailPage = read("src/pages/ad-detail.tsx")
  const landing = read("src/pages/lander.css")
  const workspace = read("src/design-system/components/workspace.css")

  assert.match(library, /\.library-heading--structural\s*\{[^}]*text-transform:uppercase/s)
  assert.match(library, /\.library-heading--content\s*\{[^}]*text-transform:none/s)
  assert.match(libraryPage, /library-heading--structural/)
  assert.match(libraryPage, /library-heading--content/)
  assert.match(detail, /\.ad-detail-page h2[^}]*text-transform:uppercase/s)
  assert.match(workspace, /\.bf-page-header h1[^}]*text-transform:\s*var\(--heading-transform\)/s)
  assert.match(detailPage, /className="detail-page-header"/)
  assert.match(landing, /\.landing-preview-creative strong[^}]*text-transform:none/s)
})

test("route controls reuse shared icon and field primitives", () => {
  const canvas = read("src/pages/creative-canvas.tsx")
  const team = read("src/pages/team.tsx")

  assert.match(canvas, /TextareaField/)
  assert.doesNotMatch(canvas, /<textarea\b/)
  assert.match(team, /<IconButton.*label="About Team Roles"/)
  assert.doesNotMatch(team, />About Roles<\/Button>/)
})

test("canvas note deletion requires the shared confirmation dialog", () => {
  const canvas = read("src/pages/creative-canvas.tsx")
  assert.match(canvas, /<AlertDialog open=\{Boolean\(pendingDelete\)\}/)
  assert.match(canvas, /<AlertDialogCancel asChild>/)
  assert.match(canvas, /Remove Note\?/)
  assert.match(canvas, /removeTrigger/)
})

test("compact route data uses the data role with tabular numerals", () => {
  const canvas = read("src/pages/creative-canvas.css")
  const support = read("src/pages/support.css")
  const queue = read("src/pages/work-queue.css")
  const library = read("src/pages/my-ads.css")

  assert.match(canvas, /\.canvas-toolbar__group output\{[^}]*font:var\(--type-data\)[^}]*font-variant-numeric:tabular-nums/s)
  assert.match(support, /\.team-context__activity strong\{[^}]*font:var\(--type-data\)[^}]*font-variant-numeric:tabular-nums/s)
  assert.match(queue, /\.work-queue-meta time\{[^}]*font:var\(--type-data\)[^}]*font-variant-numeric:tabular-nums/s)
  assert.match(library, /\.bf-metric-cell dd:first-of-type\s*\{[^}]*font:var\(--type-data\)[^}]*font-variant-numeric:tabular-nums/s)
})

test("shell and customizer route typography, spacing, radii and shadows through tokens", () => {
  const shell = read("src/components/app-shell.css")
  const customizer = read("src/design-system/components/design-customizer.css")

  assert.doesNotMatch(shell, /border-radius:\s*(?:8|999)px/)
  assert.doesNotMatch(shell, /box-shadow:[^;]*rgb\(/)
  assert.match(shell, /\.butterfly-nav-item[^}]*font:var\(--type-control\)/s)
  assert.match(shell, /\.butterfly-account-copy > span[^}]*font:var\(--type-control\)/s)
  assert.doesNotMatch(customizer, /\.ds-color-row|ds-contrast-readout/)
  assert.doesNotMatch(customizer, /font-family:\s*var\(--font-(?:interface|display|condensed)\)/)
  assert.doesNotMatch(customizer, /rgb\(/)
})

test("remaining route structural labels use the shared uppercase contract", () => {
  const canvas = read("src/pages/creative-canvas.css")
  const support = read("src/pages/support.css")

  for (const selector of [".canvas-insight span", ".canvas-focus>span"]) {
    assert.match(canvas, new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}[^}]*text-transform:uppercase`))
  }
  for (const selector of [".analysis-property-group h3", ".support-dialog h2", ".settings-context__facts h2", ".team-context__roles h2"]) {
    assert.match(support, new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}[^}]*text-transform:uppercase`))
  }
})

test("analysis properties use master detail and a mobile detail sheet", () => {
  const settings = read("src/pages/settings.tsx")
  const support = read("src/pages/support.css")
  assert.match(settings, /analysis-properties__browser/)
  assert.match(settings, /analysis-property-detail/)
  assert.match(settings, /setInspecting\(true\)/)
  assert.match(settings, /<Sheet open=\{inspecting\}/)
  assert.match(settings, /<SheetContent side="bottom" className="analysis-property-detail analysis-property-sheet"/)
  assert.match(support, /\.analysis-properties__browser\{[^}]*grid-template-columns/s)
  assert.match(support, /\.analysis-property-sheet\{[^}]*position:fixed[^}]*max-height:88svh/s)
})

test("Add Ads, Team and Settings make task-primary actions explicit", () => {
  const add = read("src/pages/add-ads.tsx")
  const team = read("src/pages/team.tsx")
  const settings = read("src/pages/settings.tsx")

  for (const label of ["Open Available Ads", "Open Library", "Continue"]) {
    assert.match(add, new RegExp(`<Button[^>]*variant=["']primary["'][^>]*>[^<]*(?:<[^>]+>)*${label}`), `${label} must use the primary action treatment`)
  }
  assert.match(add, /<Button variant="primary" onClick=\{confirmUpload\}/)
  assert.ok(team.includes('<Button variant="primary" ref={inviteTriggerRef}'))
  assert.ok(team.includes('<Button variant="primary" onClick={()=>{setParams({});setInviteOpen(true)}}>Invite Someone</Button>'))
  assert.ok(team.includes('<Button variant="primary" ref={inviteActionRef} type="submit"'))
  assert.ok(settings.includes('<Button variant="primary" disabled={mutationsDisabled || accountNeedsPermission}'))
  assert.ok(settings.includes('<Button variant="primary" disabled={!pendingAccount || mutationsDisabled}'))
})

test("owned support surfaces use the full task width and governed soft-square panels", () => {
  const add = read("src/pages/add-ads.css")
  const support = read("src/pages/support.css")
  const settings = read("src/pages/settings.tsx")

  assert.doesNotMatch(add, /\.add-ads-content\{[^}]*max-width/s)
  for (const selector of [".support-source-row", ".settings-context>section", ".team-context>section", ".analysis-property-group"]) {
    assert.match(support, new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}[^}]*border-radius:var\\(--radius-8\\)`))
  }
  assert.match(settings, /onCloseAutoFocus=/)
  assert.match(settings, /SheetDescription className="sr-only"/)
})

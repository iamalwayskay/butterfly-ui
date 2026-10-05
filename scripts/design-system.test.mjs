import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import test from "node:test"

const root = new URL("../", import.meta.url)
const read = (path) => readFileSync(new URL(path, root), "utf8")
const sourceFiles = (directory = "src") => readdirSync(new URL(directory, root), { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:css|ts|tsx)$/.test(entry.name))
  .map((entry) => `${entry.parentPath.slice(new URL(root).pathname.length)}${entry.parentPath.endsWith("/") ? "" : "/"}${entry.name}`)

const loadLocation = async () => {
  assert.ok(existsSync(new URL("src/lib/app-location.ts", root)), "host-aware app location API is missing")
  const { transformWithOxc } = await import("vite")
  const { code } = await transformWithOxc(read("src/lib/app-location.ts"), "app-location.ts")
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)
}

test("marketing host owns the public surface and links to the app hostname", async () => {
  const { resolveAppLocation, appUrl } = await loadLocation()
  assert.deepEqual(resolveAppLocation("butterfly.example", "/"), { surface: "public", basePath: "/app", redirectTo: null })
  assert.equal(appUrl("/login", { hostname: "butterfly.example", host: "butterfly.example", protocol: "https:" }), "https://app.butterfly.example/login")
})

test("app hostname owns root product paths and entry follows explicit auth state", async () => {
  const { resolveAppLocation, appPath, appEntryPath } = await loadLocation()
  assert.deepEqual(resolveAppLocation("app.butterfly.example", "/ads"), { surface: "app", basePath: "", redirectTo: null })
  assert.equal(appPath("/ads/14?tab=notes#version", "app.butterfly.example"), "/ads/14?tab=notes#version")
  assert.equal(appEntryPath(false, "app.butterfly.example"), "/login")
  assert.equal(appEntryPath(true, "app.butterfly.example"), "/ads")
})

test("localhost keeps marketing root and existing app links", async () => {
  const { resolveAppLocation, appPath, appUrl } = await loadLocation()
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.deepEqual(resolveAppLocation(hostname, "/"), { surface: "public", basePath: "/app", redirectTo: null })
    assert.deepEqual(resolveAppLocation(hostname, "/app/ads"), { surface: "app", basePath: "/app", redirectTo: null })
    assert.equal(appPath("/ads", hostname), "/app/ads")
    assert.equal(appPath("/app/ads?view=groups", hostname), "/app/ads?view=groups")
    assert.equal(appPath("/login#code", hostname), "/login#code")
    assert.equal(appPath("/login?method=email#code", hostname), "/login?method=email#code")
    assert.equal(appUrl("/login", { hostname, host: `${hostname}:5178`, protocol: "http:" }), "/login")
  }
})

test("Cloudflare Pages previews keep marketing at root and app routes under /app", async () => {
  const { isPreviewHost, resolveAppLocation, appPath, appUrl } = await loadLocation()
  for (const hostname of ["butterfly.pages.dev", "preview-42.butterfly.pages.dev"]) {
    assert.equal(isPreviewHost(hostname), true)
    assert.deepEqual(resolveAppLocation(hostname, "/"), { surface: "public", basePath: "/app", redirectTo: null })
    assert.deepEqual(resolveAppLocation(hostname, "/app/ads"), { surface: "app", basePath: "/app", redirectTo: null })
    assert.equal(appPath("/ads", hostname), "/app/ads")
    assert.equal(appPath("/login?method=email#code", hostname), "/app/login?method=email#code")
    assert.equal(appUrl("/add?tab=upload", { hostname, host: hostname, protocol: "https:" }), "/app/add?tab=upload")
  }
  assert.equal(isPreviewHost("butterfly.example.com"), false)
})

test("legacy app aliases preserve query and fragment on the production app host", async () => {
  const { resolveAppLocation } = await loadLocation()
  assert.equal(resolveAppLocation("app.butterfly.example", "/app/ads/14", "?tab=notes", "#version").redirectTo, "/ads/14?tab=notes#version")
  assert.equal(resolveAppLocation("app.butterfly.example", "/app", "?view=groups").redirectTo, "/ads?view=groups")
  assert.equal(resolveAppLocation("app.butterfly.example", "/app/", "?view=groups").redirectTo, "/ads?view=groups")
  assert.equal(resolveAppLocation("localhost", "/application").surface, "public")
})


const relativeLuminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255)
  const linear = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

const contrast = (first, second) => {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

test("page workflow families have component tokens and shared catalogue coverage", () => {
  const tokens = read("src/design-system/tokens/component.css")
  for (const name of ["dropzone", "file-preview", "upload-progress", "account-switcher", "filter-bar", "filter-popover", "data-table", "creative-card", "metric-cell", "shot-strip", "transcript", "activity-timeline"]) assert.ok(tokens.includes(`--${name}-`), `${name} token contract is missing`)
  assert.ok(read("src/design-system/index.css").includes("workflow.css"))
  assert.ok(read("src/design-system/catalogue/design-system-page.tsx").includes("WorkflowSpecimens"))
})

test("the design system has a three-layer token architecture", () => {
  const required = [
    "src/design-system/tokens/primitive.css",
    "src/design-system/tokens/semantic.css",
    "src/design-system/tokens/component.css",
  ]

  for (const file of required) {
    assert.equal(existsSync(new URL(file, root)), true, `${file} is missing`)
  }

  const primitive = read(required[0])
  const semantic = read(required[1])
  const component = read(required[2])
  const index = read("src/design-system/index.css")

  assert.match(primitive, /--color-action-start:\s*#c2185b/i)
  assert.match(primitive, /--color-action-end:\s*#8b1a75/i)
  assert.match(semantic, /--surface-canvas:\s*var\(--color-white\)/)
  assert.match(component, /--control-radius:\s*var\(--radius-control\)/)
  assert.doesNotMatch(semantic, /#[0-9a-f]{3,8}/i)
  assert.doesNotMatch(component, /#[0-9a-f]{3,8}/i)
  assert.match(index, /@fontsource-variable\/jetbrains-mono/)
  assert.match(index, /@fontsource-variable\/archivo-narrow/)
  assert.doesNotMatch(index, /@fontsource-variable\/archivo"/)
  assert.doesNotMatch(index, /inter|roboto-condensed/i)
  for (const size of ["12px", "13px", "14px", "15px", "28px", "34px"]) assert.ok(primitive.includes(size), `${size} is missing from the type scale`)
  assert.match(primitive, /--font-brand:\s*"Archivo Narrow Variable"/)
  assert.match(primitive, /--font-human:\s*var\(--font-brand\)/)
  for (const role of ["display", "interface", "body", "ui"]) assert.match(primitive, new RegExp(`--font-${role}:\\s*var\\(--font-human\\)`))
  assert.doesNotMatch(primitive, /Archivo Variable/)
  assert.match(primitive, /--font-data:\s*"JetBrains Mono Variable"/)
  for (const space of [3, 5, 8, 13, 21, 34, 55]) assert.match(primitive, new RegExp(`--space-${space}:\\s*${space}px`))
  for (const radius of [5, 8, 13, 21]) assert.match(primitive, new RegExp(`--radius-${radius}:\\s*${radius}px`))
  assert.doesNotMatch(primitive + semantic, /highlight/i)
  assert.doesNotMatch(primitive, /font-weight:\s*700|--weight-[^:]+:\s*700/)
  assert.match(primitive, /--weight-regular:\s*400/)
  assert.match(primitive, /--weight-medium:\s*500/)
  assert.match(primitive, /--weight-semibold:\s*600/)
  assert.doesNotMatch(primitive, /--font-mono:/)
})

test("the primary action gradient guarantees white WCAG AA contrast", () => {
  const primitive = read("src/design-system/tokens/primitive.css")
  const semantic = read("src/design-system/tokens/semantic.css")
  const settings = read("src/design-system/components/design-settings.ts")
  const stops = [...primitive.matchAll(/--color-action-(?:start|end):\s*(#[0-9a-f]{6})/gi)].map((match) => match[1])

  assert.equal(stops.length, 2)
  for (const stop of stops) assert.ok(contrast(stop, "#ffffff") >= 4.5, `${stop} fails white-text AA contrast`)
  assert.match(semantic, /--action-primary-text:\s*var\(--color-white\)/)
  assert.match(settings, /gradientStart:\s*"#c2185b"/i)
  assert.match(settings, /gradientEnd:\s*"#8b1a75"/i)
})

test("rejected teal values cannot re-enter visible source", () => {
  const rejected = /#(?:087b80|075985|25d9df)\b/i
  const offenders = sourceFiles().filter((file) => rejected.test(read(file)))
  assert.deepEqual(offenders, [])
})

test("shared structural controls use the configurable casing and governed action contract", () => {
  const controls = read("src/design-system/components/controls.css")
  const workspace = read("src/design-system/components/workspace.css")
  const component = read("src/design-system/tokens/component.css")
  assert.match(component, /--action-radius:\s*var\(--radius-pill\)/)
  assert.match(component, /--control-radius:\s*var\(--radius-control\)/)
  assert.match(component, /--media-radius:\s*0px/)
  assert.match(controls, /\.bf-button\s*\{[^}]*text-transform:\s*var\(--heading-transform\)/s)
  assert.match(controls, /\.bf-tabs__tab\s*\{[^}]*text-transform:\s*var\(--heading-transform\)/s)
  assert.match(workspace, /\.bf-page-tabs__link\s*\{[^}]*text-transform:\s*var\(--heading-transform\)/s)
})

test("the component contract answers control-selection questions", () => {
  const contract = read("src/design-system/README.md")

  for (const heading of [
    "## Accordion",
    "## Select, combobox, filter, or menu?",
    "## Popover, sheet, or dialog?",
    "## Tabs and navigation",
    "## Tables and filters",
    "## Responsive contract",
  ]) {
    assert.ok(contract.includes(heading), `${heading} is missing`)
  }

  assert.match(contract, /seven JEV property groups/i)
  assert.match(contract, /actions only/i)
  assert.match(contract, /44(px|×44)/i)
})

test("the JEV demo route exposes accessible disclosure and selection controls", () => {
  const app = read("src/App.tsx")
  const demo = read("src/design-system/catalogue/jev-analysis-demo.tsx")

  assert.match(app, /app\/demo\/jev-analysis/)
  assert.match(demo, /aria-expanded=/)
  assert.match(demo, /<SelectField/)
  assert.match(demo, /role="radiogroup"/)
  assert.match(demo, /aria-live=/)
  assert.match(demo, /kindred-campaign-hands\.png/)
  assert.doesNotMatch(demo, /kindred-campaign-diptych\.png/)
  assert.match(demo, /DesignCustomizer/)
})

test("the reusable design catalogue and live customizer are routed", () => {
  const app = read("src/App.tsx")
  const customizer = read("src/design-system/components/design-customizer.tsx")
  const settings = read("src/design-system/components/design-settings.ts")
  const catalogue = read("src/design-system/catalogue/design-system-page.tsx")

  assert.match(app, /app\/demo\/design-system/)
  for (const control of ["Typeface", "Weight", "Casing", "Motion", "Sidebar", "Density"]) assert.match(customizer, new RegExp(control))
  for (const attribute of ["data-font", "data-ui-weight", "data-casing", "data-motion"]) assert.match(settings, new RegExp(attribute))
  assert.doesNotMatch(customizer, /Control shape/)
  assert.doesNotMatch(settings, /data-control-shape/)
  assert.doesNotMatch(customizer, /CTA radius/)
  assert.match(catalogue, /Pill actions · square controls/)
  assert.doesNotMatch(customizer, /Gradient start/)
  assert.match(settings, /APPROVED_ACTION_SETTINGS/)
  assert.match(customizer, /Sidebar/)
  assert.match(customizer, /Density/)
  assert.match(settings, /localStorage/)
  assert.match(catalogue, /Buttons/)
  assert.match(catalogue, /Accordions/)
  assert.match(catalogue, /Form controls/)
  assert.match(catalogue, /Evidence patterns/)
  assert.match(catalogue, /ExtendedSpecimens/)
  assert.doesNotMatch(catalogue, /Anatomy:/)
})

test("component contracts are modular and exported through one public boundary", () => {
  const component = read("src/design-system/tokens/component.css")
  const controls = read("src/design-system/components/controls.css")
  const barrel = read("src/design-system/components/index.ts")
  const sharedEntry = read("src/design-system/index.css")
  const catalogue = read("src/design-system/catalogue/design-system-page.tsx")
  const demo = read("src/design-system/catalogue/jev-analysis-demo.tsx")
  const demoCss = read("src/design-system/catalogue/jev-analysis-demo.css")

  for (const prefix of ["button", "pill", "breadcrumb", "menu", "accordion", "property-row"]) {
    assert.match(component, new RegExp(`--${prefix}-`), `${prefix} component tokens are missing`)
  }
  assert.match(controls, /\.bf-accordion__trigger[^}]*var\(--accordion-/s)
  assert.match(controls, /\.bf-property-list__row[^}]*var\(--property-row-/s)
  assert.match(demoCss, /\.jev-accordion__trigger[^}]*var\(--accordion-/s)
  assert.match(barrel, /MultiSelect, type MultiSelectOption, type MultiSelectProps/)
  assert.match(barrel, /DesignCustomizer, type DesignCustomizerProps/)
  assert.doesNotMatch(sharedEntry, /catalogue\//)
  assert.doesNotMatch(catalogue + demo, /components\/(multi-select|design-customizer|design-settings)/)
  assert.match(catalogue, /<RailNav/)
  assert.doesNotMatch(catalogue, /ds-nav-demo/)
})

test("filter controls expose typed reusable selection and date patterns", () => {
  const controls = read("src/design-system/components/filter-controls.tsx")
  const styles = read("src/design-system/components/filter-controls.css")
  const tokens = read("src/design-system/tokens/component.css")
  const barrel = read("src/design-system/components/index.ts")
  const catalogue = read("src/design-system/catalogue/design-system-page.tsx")

  for (const component of ["SegmentedControl", "Combobox", "DateField", "DateRangeField", "Switch"]) {
    assert.match(barrel, new RegExp(component), `${component} is missing from the public barrel`)
    assert.match(catalogue, new RegExp(`<${component}`), `${component} is missing from the catalogue`)
  }
  for (const token of ["--segmented-", "--switch-", "--combobox-"]) assert.match(tokens, new RegExp(token))
  assert.match(controls, /role="radiogroup"/)
  assert.match(controls, /role="switch"/)
  assert.match(controls, /role="listbox"/)
  assert.match(controls, /type="date"/)
  assert.match(styles, /var\(--segmented-/)
  assert.match(styles, /var\(--switch-/)
  assert.match(styles, /var\(--combobox-/)
  assert.match(controls, /tone\?: "neutral" \| "accent"/)
  assert.match(styles, /bf-segmented__indicator/)
  assert.doesNotMatch(catalogue, /Carrier|FedEx|DHL|Ship date|delivery window/i)
})

test("personality is governed by surface, geometry, and motion tokens", () => {
  const primitive = read("src/design-system/tokens/primitive.css")
  const semantic = read("src/design-system/tokens/semantic.css")
  const component = read("src/design-system/tokens/component.css")
  const barrel = read("src/design-system/components/index.ts")
  const catalogue = read("src/design-system/catalogue/design-system-page.tsx")

  for (const token of ["--cut-8", "--cut-13", "--cut-21", "--color-action-start", "--color-action-end"]) assert.match(primitive, new RegExp(token))
  for (const token of ["--surface-inverse", "--shape-cut-single", "--shape-notch-label", "--accent-inverse-gradient"]) assert.match(semantic, new RegExp(token))
  for (const token of ["--motion-state-duration", "--feature-panel-", "--accent-label-"]) assert.match(component, new RegExp(token))
  assert.match(barrel, /AccentLabel, Surface/)
  assert.match(catalogue, /<Surface[^>]+tone="inverse"[^>]+geometry="cut"/)
})

test("the demo cleanup keeps actions legible and removes presentation-only chrome", () => {
  const semantic = read("src/design-system/tokens/semantic.css")
  const demo = read("src/design-system/catalogue/jev-analysis-demo.tsx")
  const demoCss = read("src/design-system/catalogue/jev-analysis-demo.css")
  const catalogueCss = read("src/design-system/catalogue/design-system-page.css")
  const controlsCss = read("src/design-system/components/controls.css")

  assert.match(semantic, /--action-primary-text:\s*var\(--color-white\)/)
  assert.match(demoCss, /\.jev-primary-button[^}]*color:\s*var\(--action-primary-text\)/s)
  assert.match(controlsCss, /\.bf-button--primary[^}]*color:\s*var\(--button-primary-foreground\)/s)
  assert.match(read("src/design-system/tokens/component.css"), /--button-primary-foreground:\s*var\(--action-primary-text\)/)
  assert.doesNotMatch(catalogueCss, /\.ds-button--primary/)
  assert.match(demo, /<MultiSelect/)
  assert.match(demo, /idPrefix="jev"/)
  assert.doesNotMatch(demoCss, /\.jev-secondary-grid strong[^}]*font-display/s)
  assert.match(demoCss, /\.jev-evidence-value strong[^}]*font-interface/s)
  assert.doesNotMatch(demo, /Generated for interface review/)
  assert.doesNotMatch(demo, /Sample Meta delivery/)
  assert.doesNotMatch(demoCss, /scrollbar-color|scrollbar-width:\s*thin/s)
  assert.doesNotMatch(catalogueCss, /\.ds-nav-demo/)
})

test("cross-product primitives are reusable, routed, responsive, and accessible", () => {
  const barrel = read("src/design-system/components/index.ts")
  const workspace = read("src/design-system/components/workspace.tsx")
  const states = read("src/design-system/components/states.tsx")
  const data = read("src/design-system/components/data-controls.tsx")
  const permission = read("src/design-system/components/permission.tsx")
  const team = read("src/design-system/components/team.tsx")
  const connection = read("src/design-system/components/connection.tsx")
  const otp = read("src/design-system/components/otp-field.tsx")
  const taskViews = read("src/design-system/components/task-views.tsx")
  const styles = read("src/design-system/components/workspace.css")

  for (const component of [
    "WorkspacePageHeader", "PageTabs", "StatePanel", "InlineAlert", "Progress",
    "FilterChip", "ResultCount", "ViewToggle", "Pagination", "BulkActionBar",
    "PermissionGate", "MemberRow", "RoleSelect", "InviteRow", "ConnectionStatus",
    "StepProgress", "OtpField", "TaskViews",
  ]) assert.match(barrel, new RegExp(component), `${component} is missing from the public barrel`)

  assert.match(workspace, /from "react-router-dom"/)
  assert.match(workspace, /URLSearchParams/)
  assert.match(workspace, /aria-current=/)
  assert.match(states, /role="progressbar"/)
  assert.match(states, /aria-busy=/)
  assert.match(data, /aria-pressed=/)
  assert.match(data, /aria-current=/)
  assert.match(permission, /allowed/)
  assert.match(team, /RoleSelect/)
  assert.match(team, /Pending/)
  assert.match(connection, /aria-current=/)
  assert.match(otp, /one-time-code/)
  assert.match(otp, /onPaste/)
  assert.match(taskViews, /role=\{compact \? "tablist" : undefined\}/)
  assert.match(taskViews, /role=\{compact \? "tabpanel" : "region"\}/)
  assert.match(taskViews, /ArrowRight/)
  assert.match(styles, /min-height:\s*44px/)
  assert.match(styles, /@media \(max-width:\s*768px\)/, "workspace components must enter their mobile contract with the shell Sheet at 768px")
  assert.match(styles, /prefers-reduced-motion/)
  assert.doesNotMatch(styles, /#[0-9a-f]{3,8}/i)
})

import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createServer } from "vite"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { readFile } from "node:fs/promises"

let server
let Lander
let Login
let landerCss
let loginCss
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: "custom" })
  ;({ Lander } = await server.ssrLoadModule("/src/pages/lander.tsx"))
  ;({ Login } = await server.ssrLoadModule("/src/pages/login.tsx"))
  landerCss = await readFile(new URL("../../pages/lander.css", import.meta.url), "utf8")
  loginCss = await readFile(new URL("../../pages/login.css", import.meta.url), "utf8")
})
after(async () => { await server?.close(); delete globalThis.window })

function render(hostname = "localhost") {
  globalThis.window = { location: { hostname, protocol: "https:", host: hostname, origin: `https://${hostname}` } }
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Lander)))
}

function renderLogin(state = "") {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/login${state}`] }, createElement(Login)))
}

test("marketing and auth expose the approved product language", () => {
  const marketing = render()
  const login = renderLogin()
  for (const label of [
    "Your Ads.",
    "A Closer Look.",
    "A Clearer Next Move.",
    "How It Works",
    "Your Data",
    "Explore Sample Account",
    "Sign In",
  ]) assert.ok(marketing.includes(label), `Missing exact marketing label: ${label}`)
  for (const label of ["Sign In to Butterfly", "Continue With Google", "Continue With Email"]) {
    assert.ok(login.includes(label), `Missing exact auth label: ${label}`)
  }
  assert.match(marketing, /<span>butterfly<\/span>/)
  assert.match(login, /<span class="login-brand-wordmark">butterfly<\/span>/)
})

test("marketing and auth apply the uppercase structural typography contract", () => {
  for (const [name, css] of [["marketing", landerCss], ["auth", loginCss]]) {
    assert.match(css, /text-transform\s*:\s*uppercase/i, `${name} CSS does not apply the structural casing rule`)
    assert.doesNotMatch(css, /\.bf-button[^{}]*\{[^}]*border-radius/i, `${name} overrides the shared pill action geometry`)
  }
})

test("marketing explains the complete fixture loop through paused Meta handoff", () => {
  const html = render()
  for (const capability of [/Bring In Ads/, /Review the Read/, /Build the Batch/, /paused Meta handoff/i, /Paused/, /Work Queue/]) {
    assert.match(html, capability)
  }
  assert.doesNotMatch(html, /Published|Live Ads|Meta Draft/)
})

test("mobile navigation exposes a named sheet trigger and target", () => {
  const html = render()
  assert.match(html, /aria-label="Open navigation"/)
  assert.match(html, /aria-controls="landing-navigation"/)
})

test("direct auth progress and failure fixtures retain their attempted values", () => {
  assert.match(renderLogin("?state=sending"), /value="owner@kindred\.example"/)
  const verifying = renderLogin("?state=verifying")
  assert.match(verifying, /<fieldset[^>]*disabled=""/)
  assert.match(verifying, /value="2"/)
  assert.match(renderLogin("?state=verify-failure"), /value="1"/)
})

for (const state of ["code", "send-failure", "google-failure", "verify-failure", "expired", "cooldown", "sending", "verifying", "storage-failure"]) {
  test(`sign-in fixture renders the ${state} state directly`, () => {
    const html = renderLogin(`?state=${state}`)
    assert.match(html, /Sign In to Butterfly|Enter Your Code/)
  })
}

test("public page exposes navigable product proof, workflow, features and provenance", () => {
  const html = render()
  for (const id of ["workspace", "how-it-works", "features", "trust"]) {
    assert.match(html, new RegExp(`id="${id}"`), `Missing section target ${id}`)
  }
  assert.match(html, /Sample Account/)
  assert.match(html, /sample analysis/i)
  assert.match(html, /browser/i)
})

test("marketing offers distinct upload and Meta entry states on every supported host", () => {
  for (const [hostname, prefix] of [["localhost", "/app"], ["127.0.0.1", "/app"], ["butterfly.pages.dev", "/app"], ["preview-42.butterfly.pages.dev", "/app"], ["butterfly.example.com", "https://app.butterfly.example.com"], ["app.butterfly.example.com", ""]]) {
    const html = render(hostname)
    for (const tab of ["upload", "meta"]) {
      assert.ok(html.includes(`href="${prefix}/add?tab=${tab}"`), `${hostname} is missing the ${tab} entry`)
    }
  }
})

test("feature evidence covers shot timing, transcript and narrative review", () => {
  const html = render()
  for (const capability of [/shots?/i, /time ranges?/i, /transcript/i, /narrative timeline/i]) {
    assert.ok(capability.test(html), `Missing feature evidence: ${capability}`)
  }
})

test("team feature evidence explains roles and local invitation behavior", () => {
  const html = render()
  const features = html.split('id="features"')[1].split('</section>')[0]
  for (const capability of [/team/i, /roles/i, /invitations/i, /no email/i]) {
    assert.ok(capability.test(features), `Missing team evidence: ${capability}`)
  }
})

const prohibitedClaims = [
  ["pricing or invented commercial offer", /\bpricing\b|\bfree trial\b|[$£€]\s*\d|\bper month\b|\/mo\b/i],
  ["testimonials or customer endorsement", /testimonials?|trusted by|customers? say|customer logos?|rated \d|five.star rating/i],
  ["Discovery or competitor intelligence", /\bdiscovery\b|competitor(?:s| intelligence| research| ads)?\b/i],
  ["market-wide findings", /market.wide|industry.wide|across the market|market intelligence|market.leading/i],
  ["unverified performance or causality", /shape performance|guaranteed|(?:increase|boost|improve|double|lift)\w*[^.!?]{0,50}(?:ROAS|revenue|conversions|performance)|(?:prove|explain)\w* why[^.!?]{0,40}(?:won|performed|converted)/i],
  ["live results or service claims", /live customer (?:results|data)|real.time (?:Meta|analysis|results|sync)|automatically (?:sync|analyse|analyze|publish)|(?:Meta|Google) (?:is )?connected|connect your Meta account now/i],
  ["unsupported integrations", /integrates? with|integration with|Slack|TikTok|LinkedIn|YouTube|Shopify|Google Ads/i],
  ["generic AI marketing", /AI.powered|AI.driven|revolutionary AI|unlock the power of AI/i],
  ["fixed property ceiling", /\b41[- ]propert(?:y|ies)\b|\ball 41\b/i],
  ["unresolved generated output formats", /generate (?:a |your )?(?:brief|hooks|scripts|storyboards)|generated (?:briefs|hooks|scripts|storyboards)/i],
]

for (const [boundary, prohibited] of prohibitedClaims) {
  test(`marketing avoids ${boundary}`, () => {
    assert.ok(!prohibited.test(render()), `Public page crosses boundary: ${boundary}`)
  })
}

test("public app links cross to the app hostname instead of opening public routes", () => {
  const html = render("butterfly.example.com")
  assert.match(html, /href="https:\/\/app\.butterfly\.example\.com\/login"/)
  assert.match(html, /href="https:\/\/app\.butterfly\.example\.com\/add\?tab=meta"/)
  assert.doesNotMatch(html, /href="\/(?:login|app\/add)"/)
})

test("local app links preserve compatibility and provide a keyboard skip target", () => {
  const html = render()
  assert.match(html, /href="\/login"/)
  assert.match(html, /href="\/app\/add\?tab=meta"/)
  assert.match(html, /href="#main-content"/)
  assert.match(html, /<main[^>]*id="main-content"/)
})

/**
 * Butterfly — the read.
 *
 * Every ad in the sidecart carries the same typed fields, read off the creative.
 * The values here are illustrative sample data for the UI; the shapes are the
 * product. Swap this file for the API response and every screen follows.
 */

export type HookType =
  | "not-run"
  | "problem"
  | "demonstration"
  | "result"
  | "surprise"
  | "question"
  | "callout"

export type CtaWeight = "heavy" | "present" | "light" | "none"

export type AdStatus = "live" | "paused" | "killed" | "draft" | "uploaded"

export interface Frame {
  src: string
  /** seconds into the creative */
  t: number
}

export interface AdRead {
  /** when the product first appears on screen, in seconds */
  productAt: number | null
  /** when the main benefit is stated, in seconds */
  benefitAt: number | null
  /** when evidence (proof) is shown, in seconds */
  proofAt: number | null
  hook: HookType
  hookLine: string
  ctaWeight: CtaWeight
  ctaLine: string
  angle: string
  proof: string
  /** the words in the creative, in order */
  transcript: string[]
  /** 0–100. How well this ad does the job it was made for. */
  score: number | null
  /** the single thing to change, if the read found one */
  flag?: string
  /** true when the flag is an actual defect. A high-scoring ad may carry a
   *  remark ("nothing structural") that is not a thing to fix. */
  needsFix: boolean
  /** where retention falls away, in seconds — only where measured */
  dropAt?: number
}

export interface Ad {
  id: string
  /** Operator-facing ad name from the account. */
  name?: string
  /** the file the person gave us */
  poster: string
  frames: Frame[]
  w: number
  h: number
  /** A deliberately composed half of the Kindred concept diptych. */
  posterPanel?: "left" | "right"
  campaign?: string
  adSet?: string
  placement?: string
  /** ISO date used for the library's date filter. */
  startedAt?: string
  /** Result for the selected sample delivery window. */
  results?: { label: string; value: string }
  deliveryWindow?: string
  sampleWindows?: Partial<Record<"7" | "30" | "90", { spend: number; results: { label: string; value: string } }>>
  status: AdStatus
  /** days this has been running, null when it was never delivered */
  days: number | null
  /** illustrative delivery figures — absent entirely for an upload */
  spend?: number
  /** the store the ad points at */
  brand: string
  product: string
  read: AdRead
  /** the private sidecart: what the person thought, in their own words */
  notes: {
    hypothesis: string
    angle: string
    transcript: string
  }
  /** which read cluster this ad fell into */
  cluster: string
  added: string
  /** True only when findings are explicitly sample analysis. */
  readIsSample?: boolean
  analysisStatus?: "not-run" | "ready"
  uploadContext?: UploadContext
  /** Local media remains playable during this browser session. The file is not persisted. */
  uploadType?: "image" | "video" | "pdf"
  uploadUrl?: string
  /** Deterministic scale records are fixtures, never a person's upload. */
  scaleFixture?: boolean
}

const f = (id: string, count: number): Frame[] =>
  Array.from({ length: count }, (_, i) => ({
    src: `/frames/${id}_${i + 1}.jpg`,
    t: Number(((i + 1) * 1.1).toFixed(1)),
  }))

export const ads: Ad[] = [
  {
    id: "1235086835413596",
    poster: "/ads/1235086835413596.jpg",
    frames: f("1235086835413596", 6),
    w: 500,
    h: 889,
    status: "live",
    days: 24,
    spend: 4820,
    brand: "Kindred",
    product: "Barrier repair cream",
    cluster: "Ritual · calm skin",
    added: "Jun 2",
    read: {
      productAt: 2.2,
      benefitAt: 8.4,
      proofAt: 11.6,
      hook: "problem",
      hookLine: "\"My skin barrier was wrecked.\"",
      ctaWeight: "heavy",
      ctaLine: "\"Tap Shop Now — 20% off your first order\"",
      angle: "Ritual · calm skin",
      proof: "Before/after, same light, same pose",
      transcript: [
        "My skin barrier was wrecked.",
        "Red, tight, stinging under everything.",
        "This is the one that stopped it.",
        "Fourteen days. Same light, same pose.",
        "Tap Shop Now — 20% off your first order.",
      ],
      score: 82,
      flag: "The offer lands at 0:41, after the proof. Move it earlier or drop it.",
      needsFix: true,
      dropAt: 6.8,
    },
    notes: {
      hypothesis:
        "The before/after is the ad. Everything before it is just getting to it.",
      angle: "Calm, clinical, no urgency — she is buying a repair, not a treat.",
      transcript: "Cut the first line to 1.5s. It is doing nothing.",
    },
  },
  {
    id: "2529793287483755",
    poster: "/ads/2529793287483755.jpg",
    frames: f("2529793287483755", 4),
    w: 540,
    h: 960,
    status: "live",
    days: 18,
    spend: 3140,
    brand: "Kindred",
    product: "Barrier repair cream",
    cluster: "Ritual · calm skin",
    added: "Jun 8",
    read: {
      productAt: 4.6,
      benefitAt: 6.1,
      proofAt: null,
      hook: "question",
      hookLine: "\"Why does your skin still sting?\"",
      ctaWeight: "heavy",
      ctaLine: "\"Shop now — link in bio\"",
      angle: "Ritual · calm skin",
      proof: "None shown",
      transcript: [
        "Why does your skin still sting?",
        "You are layering actives on a broken barrier.",
        "Start here instead.",
        "Shop now — link in bio.",
      ],
      score: 61,
      flag: "No proof at all. Same angle as three other ads, weaker evidence.",
      needsFix: true,
      dropAt: 3.9,
    },
    notes: {
      hypothesis: "Question hooks usually hold better than statements for us.",
      angle: "Same as the winner — this was the control.",
      transcript: "Question is too close to an accusation.",
    },
  },
  {
    id: "1069447598933138",
    poster: "/ads/1069447598933138.jpg",
    frames: f("1069447598933138", 6),
    w: 540,
    h: 960,
    status: "live",
    days: 31,
    spend: 6110,
    brand: "Northbound",
    product: "Travel duffel",
    cluster: "Utility · built to last",
    added: "May 26",
    read: {
      productAt: 0.9,
      benefitAt: 3.2,
      proofAt: 7.4,
      hook: "demonstration",
      hookLine: "Zip rips open on a full bag",
      ctaWeight: "present",
      ctaLine: "\"See the 45L\"",
      angle: "Utility · built to last",
      proof: "Overload test on camera, no cut",
      transcript: [
        "[zip rips]",
        "That is a 45 litre bag, overstuffed.",
        "It still closes.",
        "See the 45L.",
      ],
      score: 91,
      flag: "Nothing structural. This is the one to make variants from.",
      needsFix: false,
    },
    notes: {
      hypothesis: "Show the failure of the other bag first — the contrast sells it.",
      angle: "Engineering proof. The customer is buying a decision, not a bag.",
      transcript: "The zip sound is the hook. Do not add music over it.",
    },
  },
  {
    id: "194540672752132",
    poster: "/ads/194540672752132.jpg",
    frames: f("194540672752132", 6),
    w: 540,
    h: 675,
    status: "paused",
    days: 12,
    spend: 1980,
    brand: "Northbound",
    product: "Travel duffel",
    cluster: "Utility · built to last",
    added: "Jun 14",
    read: {
      productAt: 3.1,
      benefitAt: 9.8,
      proofAt: 12.2,
      hook: "callout",
      hookLine: "\"The last duffel you buy\"",
      ctaWeight: "present",
      ctaLine: "\"Shop the 45L\"",
      angle: "Utility · built to last",
      proof: "Warranty page shown on screen",
      transcript: [
        "The last duffel you buy.",
        "Lifetime hardware, replaceable straps.",
        "Shop the 45L.",
      ],
      score: 58,
      flag: "Product does not appear until 3.1s. The claim runs before the evidence.",
      needsFix: true,
      dropAt: 9.4,
    },
    notes: {
      hypothesis: "Big claim up front, then justify it.",
      angle: "Durability, but told rather than shown.",
      transcript: "This is the weaker version of the zip ad.",
    },
  },
  {
    id: "1277290320948697",
    poster: "/ads/1277290320948697.jpg",
    frames: f("1277290320948697", 6),
    w: 540,
    h: 960,
    status: "live",
    days: 7,
    spend: 1240,
    brand: "Kindred",
    product: "Cleansing balm",
    cluster: "Ritual · calm skin",
    added: "Jun 19",
    read: {
      productAt: 1.4,
      benefitAt: 4.7,
      proofAt: 9.1,
      hook: "demonstration",
      hookLine: "Balm melts a full face of makeup",
      ctaWeight: "light",
      ctaLine: "\"Kindred\"",
      angle: "Ritual · calm skin",
      proof: "Split screen, 30 seconds, no cut",
      transcript: [
        "[balm melts makeup]",
        "No scrubbing. No sting.",
        "Kindred.",
      ],
      score: 77,
      flag: "Almost no call to action. Add one line at 0:20.",
      needsFix: true,
    },
    notes: {
      hypothesis: "The melt is satisfying enough to carry the whole ad.",
      angle: "Sensory, quiet, no claims.",
      transcript: "Works. Just needs a door at the end.",
    },
  },
  {
    id: "2299796660793532",
    poster: "/ads/2299796660793532.jpg",
    frames: f("2299796660793532", 6),
    w: 540,
    h: 960,
    status: "live",
    days: 41,
    spend: 8940,
    brand: "Ledgerline",
    product: "Invoice tool",
    cluster: "Result · numbers first",
    added: "May 16",
    read: {
      productAt: 1.1,
      benefitAt: 2.8,
      proofAt: 6.2,
      hook: "result",
      hookLine: "\"This took four minutes\"",
      ctaWeight: "present",
      ctaLine: "\"Try it free\"",
      angle: "Result · numbers first",
      proof: "Timer on screen, real invoice, uncut",
      transcript: [
        "This took four minutes.",
        "Invoice, sent, paid.",
        "Try it free.",
      ],
      score: 88,
      flag: "Nothing structural. Second-best performer in the account.",
      needsFix: false,
    },
    notes: {
      hypothesis: "Time is the promise. Show the clock, not the UI.",
      angle: "Speed. The buyer is drowning in admin.",
      transcript: "The uncut timer is the whole ad.",
    },
  },
  {
    id: "1598263361660906",
    poster: "/ads/1598263361660906.jpg",
    frames: f("1598263361660906", 6),
    w: 480,
    h: 854,
    status: "killed",
    days: 21,
    spend: 2260,
    brand: "Ledgerline",
    product: "Invoice tool",
    cluster: "Result · numbers first",
    added: "Jun 1",
    read: {
      productAt: 5.4,
      benefitAt: 11.2,
      proofAt: null,
      hook: "problem",
      hookLine: "\"Chasing invoices again?\"",
      ctaWeight: "heavy",
      ctaLine: "\"Sign up now — free for 14 days\"",
      angle: "Result · numbers first",
      proof: "None shown",
      transcript: [
        "Chasing invoices again?",
        "There is a better way to get paid.",
        "Sign up now — free for 14 days.",
      ],
      score: 34,
      flag: "Generic. Nothing here is about this product. Retire it.",
      needsFix: true,
      dropAt: 11.0,
    },
    notes: {
      hypothesis: "Pain-first hook would beat the timer ad.",
      angle: "Pain, with no evidence behind it.",
      transcript: "Wrong. The audience already knows the pain.",
    },
  },
  {
    id: "4315915861994045",
    poster: "/ads/4315915861994045.jpg",
    frames: f("4315915861994045", 4),
    w: 540,
    h: 960,
    status: "live",
    days: 5,
    spend: 690,
    brand: "Northbound",
    product: "Travel duffel",
    cluster: "Utility · built to last",
    added: "Jun 21",
    read: {
      productAt: 2.0,
      benefitAt: 5.5,
      proofAt: 8.8,
      hook: "surprise",
      hookLine: "Bag dropped from a moving van",
      ctaWeight: "light",
      ctaLine: "\"45L\"",
      angle: "Utility · built to last",
      proof: "Uncut drop, then the bag opens normally",
      transcript: [
        "[thud]",
        "Still fine.",
        "45L.",
      ],
      score: 79,
      flag: "Too short to prove anything. Extend the aftermath by 3s.",
      needsFix: true,
    },
    notes: {
      hypothesis: "Violence against the product performs, as long as it survives.",
      angle: "Same durability angle, newer execution.",
      transcript: "Keep the thud. Cut nothing before it.",
    },
  },
  {
    id: "2284494341954924",
    poster: "/ads/2284494341954924.jpg",
    frames: f("2284494341954924", 6),
    w: 540,
    h: 960,
    status: "live",
    days: 15,
    spend: 2730,
    brand: "Kindred",
    product: "Barrier repair cream",
    cluster: "Ritual · calm skin",
    added: "Jun 11",
    read: {
      productAt: 2.9,
      benefitAt: 7.2,
      proofAt: 13.0,
      hook: "problem",
      hookLine: "\"Everything stings right now.\"",
      ctaWeight: "present",
      ctaLine: "\"Shop Kindred\"",
      angle: "Ritual · calm skin",
      proof: "Dermatologist quoted on screen",
      transcript: [
        "Everything stings right now.",
        "Stop adding. Start repairing.",
        "Shop Kindred.",
      ],
      score: 74,
      flag: "Proof is a quote, not a result. The before/after ad already does this better.",
      needsFix: true,
      dropAt: 7.0,
    },
    notes: {
      hypothesis: "Authority beats demonstration for this audience.",
      angle: "Ritual · calm skin, with an expert behind it.",
      transcript: "The quote reads as filler.",
    },
  },
  {
    id: "1470049310687132",
    poster: "/ads/1470049310687132.jpg",
    frames: f("1470049310687132", 6),
    w: 540,
    h: 675,
    status: "paused",
    days: 9,
    spend: 1120,
    brand: "Ledgerline",
    product: "Invoice tool",
    cluster: "Result · numbers first",
    added: "Jun 17",
    read: {
      productAt: 1.8,
      benefitAt: 4.0,
      proofAt: 10.5,
      hook: "result",
      hookLine: "\"Paid in one day\"",
      ctaWeight: "present",
      ctaLine: "\"Start free\"",
      angle: "Result · numbers first",
      proof: "Payment notification, timestamped",
      transcript: [
        "Paid in one day.",
        "No follow-up email.",
        "Start free.",
      ],
      score: 69,
      flag: "The claim is bigger than the proof shows. Soften it or show more.",
      needsFix: true,
    },
    notes: {
      hypothesis: "Same speed angle, different number.",
      angle: "Result · numbers first.",
      transcript: "One day is not believable without the timestamp visible.",
    },
  },
  {
    id: "993961993641897",
    poster: "/ads/993961993641897.jpg",
    frames: f("993961993641897", 2),
    w: 540,
    h: 960,
    status: "uploaded",
    days: null,
    brand: "Kindred",
    product: "Barrier repair cream",
    cluster: "Ritual · calm skin",
    added: "Today",
    read: {
      productAt: 3.4,
      benefitAt: 9.0,
      proofAt: null,
      hook: "callout",
      hookLine: "\"Barrier first\"",
      ctaWeight: "light",
      ctaLine: "\"Kindred\"",
      angle: "Ritual · calm skin",
      proof: "None shown",
      transcript: [
        "Barrier first.",
        "Then everything else works.",
        "Kindred.",
      ],
      score: 52,
      flag: "No proof, weak door. It reads as a brand film, not an ad.",
      needsFix: true,
    },
    notes: {
      hypothesis: "Uploaded from the offline edit — never ran.",
      angle: "",
      transcript: "",
    },
  },
  {
    id: "1682288846257202",
    poster: "/ads/1682288846257202.jpg",
    frames: f("1682288846257202", 1),
    w: 540,
    h: 960,
    status: "uploaded",
    days: null,
    brand: "Northbound",
    product: "Travel duffel",
    cluster: "Utility · built to last",
    added: "Today",
    read: {
      productAt: 0.4,
      benefitAt: 2.6,
      proofAt: 5.9,
      hook: "demonstration",
      hookLine: "Straps pulled to breaking point",
      ctaWeight: "present",
      ctaLine: "\"See the 45L\"",
      angle: "Utility · built to last",
      proof: "Hardware close-up, load test visible",
      transcript: [
        "[strap pulled]",
        "Still holding.",
        "See the 45L.",
      ],
      score: 84,
      flag: "A finished cut of a live idea — worth running against the original.",
      needsFix: true,
    },
    notes: {
      hypothesis: "Same angle, tighter edit. Should beat the 3s version.",
      angle: "",
      transcript: "",
    },
  },
]

// The walkthrough uses one coherent fictional advertiser. The first two files
// are individual portrait renditions from the campaign diptych, and the third
// is a separate portrait asset. The older records remain for saved links and
// legacy local state, but are not included in the connected sample library.
const kindredSample: Array<{
  id: string
  name: string
  poster: string
  posterPanel?: "left" | "right"
  w: number
  h: number
  status: AdStatus
  placement: string
  campaign: string
  adSet: string
  startedAt: string
  days: number
  spend: number
  results: { label: string; value: string }
  deliveryWindow: string
  sampleWindows: NonNullable<Ad["sampleWindows"]>
}> = [
  { id: "1235086835413596", name: "Evening Routine — Cut 02", poster: "/brand/kindred-campaign-evening.png", w: 665, h: 1182, status: "live", placement: "Instagram Reels", campaign: "Daily ritual", adSet: "Prospecting", startedAt: "2026-06-23", days: 91, spend: 4820, results: { label: "Purchases", value: "63" }, deliveryWindow: "Aug 24 – Sep 22, 2026", sampleWindows: { "7": { spend: 1690, results: { label: "Purchases", value: "24" } }, "30": { spend: 4820, results: { label: "Purchases", value: "63" } }, "90": { spend: 8770, results: { label: "Purchases", value: "118" } } } },
  { id: "2529793287483755", name: "Serum Still Life — Cut 01", poster: "/brand/kindred-campaign-serum.png", w: 665, h: 1182, status: "live", placement: "Instagram Stories", campaign: "Daily ritual", adSet: "Retargeting", startedAt: "2026-06-30", days: 84, spend: 3140, results: { label: "Purchases", value: "41" }, deliveryWindow: "Aug 24 – Sep 22, 2026", sampleWindows: { "7": { spend: 1220, results: { label: "Purchases", value: "16" } }, "30": { spend: 3140, results: { label: "Purchases", value: "41" } }, "90": { spend: 5960, results: { label: "Purchases", value: "79" } } } },
  { id: "1277290320948697", name: "First Drop — Cut 03", poster: "/brand/kindred-campaign-hands.png", w: 941, h: 1672, status: "paused", placement: "Instagram Reels", campaign: "First touch", adSet: "Prospecting", startedAt: "2026-06-10", days: 104, spend: 1240, results: { label: "Purchases", value: "18" }, deliveryWindow: "Aug 24 – Sep 22, 2026", sampleWindows: { "7": { spend: 0, results: { label: "Purchases", value: "0" } }, "30": { spend: 1240, results: { label: "Purchases", value: "18" } }, "90": { spend: 3790, results: { label: "Purchases", value: "52" } } } },
]

for (const sample of kindredSample) {
  const ad = ads.find((item) => item.id === sample.id)
  if (!ad) continue
  Object.assign(ad, sample, {
    frames: [],
    product: "Barrier serum",
    cluster: "Daily ritual",
    added: "Sep 2026",
    notes: { hypothesis: "", angle: "", transcript: "" },
    read: {
      ...ad.read,
      productAt: 0,
      benefitAt: 0,
      proofAt: null,
      hookLine: sample.name,
      ctaLine: "",
      angle: sample.campaign,
      proof: "Not assessed",
      transcript: [],
      score: 0,
      flag: undefined,
      needsFix: false,
      dropAt: undefined,
    },
  })
}

export const sampleAdIds = kindredSample.map((sample) => sample.id)

/** The read clusters — how many ads are saying the same thing. */
export interface Cluster {
  name: string
  count: number
  best: string
  worst: string
  note: string
}

export const clusters: Cluster[] = [
  {
    name: "Ritual · calm skin",
    count: 32,
    best: "1235086835413596",
    worst: "1598263361660906",
    note: "Same angle, nine creatives. Two carry proof; the rest assert it.",
  },
  {
    name: "Utility · built to last",
    count: 14,
    best: "1069447598933138",
    worst: "194540672752132",
    note: "The winner shows the failure of the other bag. The losers describe it.",
  },
  {
    name: "Result · numbers first",
    count: 11,
    best: "2299796660793532",
    worst: "1598263361660906",
    note: "Uncut proof beats the claim every time in this cluster.",
  },
]

const localUploadKey = "butterfly-local-uploads"
const uploadPlaceholder = "/ads/upload-placeholder.svg"

export interface UploadContext { product: string; audience: string; destination: string; notes: string }
export function unreviewedRead(): AdRead {
  return { productAt: null, benefitAt: null, proofAt: null, hook: "not-run", hookLine: "", ctaWeight: "none", ctaLine: "", angle: "", proof: "Not assessed", transcript: [], score: null, needsFix: false }
}

function restoreUpload(saved: Ad): Ad {
  return {
    id: saved.id, name: saved.analysisStatus === "not-run" ? saved.name : saved.product,
    poster: uploadPlaceholder, frames: [], w: saved.w || 0, h: saved.h || 0,
    status: "uploaded", days: null, brand: "Local upload", product: saved.product,
    added: saved.added, startedAt: saved.analysisStatus === "not-run" ? saved.startedAt : undefined,
    read: unreviewedRead(), notes: saved.notes ?? { hypothesis: "", angle: "", transcript: "" },
    cluster: "Unreviewed uploads", readIsSample: false, analysisStatus: "not-run",
    uploadType: saved.uploadType, uploadContext: saved.uploadContext,
  }
}

if (typeof window !== "undefined") {
  try {
    const saved = JSON.parse(localStorage.getItem(localUploadKey) ?? "[]") as Ad[]
    if (Array.isArray(saved)) {
      const uploads = saved.filter(ad => ad && typeof ad.id === "string" && ad.id.startsWith("upload-")).map(restoreUpload)
      ads.unshift(...uploads)
      if (uploads.length) localStorage.setItem(localUploadKey, JSON.stringify(uploads))
    }
  } catch {
    // The demo still works with the bundled sample ads if browser storage is unavailable.
  }
}

export const adById = (id: string) => ads.find((a) => a.id === id) || libraryScaleAds(scaleCount()).find(ad => ad.id === id)

function scaleCount() {
  return typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("fixture-count"))
}

/** Explicit URL-only review dataset; never persisted or mixed into a real upload batch. */
export function libraryScaleAds(count: number): Ad[] {
  if (![3, 12, 50, 100, 200].includes(count)) return []
  const canonical = sampleAdIds.map(id => ads.find(ad => ad.id === id)!).filter(Boolean)
  return [...canonical, ...Array.from({length: count - canonical.length}, (_, index): Ad => {
    const ordinal = index + 4, source = canonical[index % canonical.length], upload = index % 3 === 0
    const ratio = index % 4, w = ratio === 1 ? 540 : ratio === 2 ? 1330 : source.w, h = ratio === 1 ? 540 : ratio === 2 ? 1182 : source.h
    return {...source, id:`${upload ? "upload" : "sample"}-scale-${String(ordinal).padStart(3,"0")}`, scaleFixture:true,
      name:`${ratio === 1 ? "Daily ritual — square creative" : `Kindred ${index % 5 === 0 ? "Barrier serum — sensitive skin evening routine, first application and follow-up creative review" : "Daily ritual"}`} — ${String(ordinal).padStart(3,"0")}`,
      brand:ratio === 1 ? "Local scale fixture" : source.brand,
      poster:index % 7 === 0 ? "" : ratio === 1 ? "/brand/creative-square-fixture.svg" : ratio === 2 ? "/brand/kindred-campaign-diptych.png" : source.poster,
      w,h,placement:upload ? undefined : ratio === 1 ? "Facebook Feed" : ratio === 2 ? "Instagram Feed" : "Instagram Reels",
      status:upload ? "uploaded" : index % 4 === 1 ? "draft" : index % 4 === 2 ? "paused" : "live", days:upload ? null : source.days,
      campaign:upload ? undefined : source.campaign,adSet:upload ? undefined : source.adSet,
      uploadType:upload ? index % 2 === 0 ? "video" : "image" : undefined,uploadUrl:undefined,
      sampleWindows:upload || index % 4 === 1 ? undefined : source.sampleWindows,spend:upload ? undefined : source.spend,results:upload ? undefined : source.results,
      read:unreviewedRead(),analysisStatus:"not-run",readIsSample:false,frames:[],notes:{hypothesis:"",angle:"",transcript:""},
    }
  })]
}

/** The sample Meta library appears only after the local connection walkthrough. */
export function visibleAds(): Ad[] {
  const fixture = libraryScaleAds(scaleCount())
  if (fixture.length) return fixture
  const imported = typeof window !== "undefined" && localStorage.getItem("butterfly-meta-connected") === "true"
  const account = typeof window !== "undefined" ? localStorage.getItem("butterfly-meta-account") ?? "kindred" : "kindred"
  const uploads = ads.filter((ad) => ad.id.startsWith("upload-"))
  return imported && account === "kindred" ? [...sampleAdIds.map((id) => ads.find((ad) => ad.id === id)!).filter(Boolean), ...uploads] : uploads
}

/** Replace session media only; preserve identity, group membership, notes and input context. */
export function reattachLocalAd(id: string, file: File, mediaUrl: string, dimensions?: {w:number;h:number}): Ad {
  const existing = ads.find(ad => ad.id === id && ad.id.startsWith("upload-"))
  if (!existing) throw new Error("This uploaded record is no longer available.")
  const uploadType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf"
  const next: Ad = {...existing,uploadType,uploadUrl:mediaUrl,poster:uploadType === "image" ? mediaUrl : uploadPlaceholder,w:dimensions?.w || 0,h:dimensions?.h || 0}
  localStorage.setItem(localUploadKey,JSON.stringify(ads.filter(ad=>ad.id.startsWith("upload-")).map(ad=>({... (ad.id===id ? next : ad),poster:uploadPlaceholder,uploadUrl:undefined}))))
  if(existing.uploadUrl)URL.revokeObjectURL(existing.uploadUrl)
  Object.assign(existing,next)
  return existing
}

/** Keep an uploaded creative in the current browser session for the clickable UI demo. */
export function addLocalAd(file: File, mediaUrl?: string, dimensions?: { w: number; h: number }, uploadContext?: UploadContext): Ad {
  const uploadType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf"
  const ad: Ad = {
    id: `upload-${crypto.randomUUID()}`,
    name: file.name,
    status: "uploaded",
    days: null,
    poster: uploadType === "image" && mediaUrl ? mediaUrl : uploadPlaceholder,
    w: dimensions?.w ?? 0,
    h: dimensions?.h ?? 0,
    frames: [],
    brand: "Local upload",
    product: file.name,
    added: new Date().toLocaleDateString(),
    startedAt: new Date().toISOString().slice(0, 10),
    read: unreviewedRead(),
    notes: { hypothesis: "", angle: "", transcript: "" },
    cluster: "Unreviewed uploads",
    readIsSample: false,
    analysisStatus: "not-run",
    uploadContext,
    uploadType,
    uploadUrl: mediaUrl,
  }
  localStorage.setItem(localUploadKey, JSON.stringify(
    [ad, ...ads.filter(item => item.id.startsWith("upload-"))].map(item => ({ ...item, poster: uploadPlaceholder, uploadUrl: undefined })),
  ))
  ads.unshift(ad)
  return ad
}

export const statusLabel: Record<AdStatus, string> = {
  live: "Live",
  paused: "Paused",
  killed: "Killed",
  draft: "Draft",
  uploaded: "Uploaded",
}

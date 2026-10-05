import type { Ad } from "@/data/ads"
import type { JevProperty } from "@/data/jev"
import type { AdGroup } from "@/lib/groups"
import { appPath } from "@/lib/app-location"

export type DeliveryRange = "7" | "30" | "90"
export type LibraryFindings = Readonly<Record<string, readonly JevProperty[]>>
export interface LibraryState {
  query: string; campaign: string; adSet: string; status: string; placement: string
  property: string; propertyValue: string; dateFrom: string; dateTo: string
  range: DeliveryRange; sort: "spend" | "results" | "name" | "recent"
  direction: "ascending" | "descending"; layout: "grid" | "table"
  tab: "all" | "groups"; group: string; page: number
}

export function readLibraryState(params: URLSearchParams, defaultRange = "30"): LibraryState {
  const range = params.get("range") || defaultRange
  const sort = params.get("sort")
  return {
    query: params.get("q") || "", campaign: params.get("campaign") || "", adSet: params.get("adSet") || "",
    status: params.get("status") || "", placement: params.get("placement") || "",
    property: params.get("property") || "", propertyValue: params.get("value") || "",
    dateFrom: params.get("from") || "", dateTo: params.get("to") || "",
    range: range === "7" || range === "90" ? range : "30",
    sort: sort === "name" || sort === "recent" || sort === "results" ? sort : "spend",
    direction: params.get("direction") === "ascending" || (!params.has("direction") && sort === "name") ? "ascending" : "descending",
    layout: params.get("layout") === "table" ? "table" : "grid",
    tab: params.get("view") === "groups" ? "groups" : "all", group: params.get("group") || "",
    page: Math.max(1, Math.floor(Number(params.get("page")) || 1)),
  }
}

export function updateLibrarySearch(current: URLSearchParams, patch: Record<string, string | number | null>) {
  const next = new URLSearchParams(current)
  if (Object.keys(patch).some(key => ["q","campaign","adSet","status","placement","property","value","from","to","group","view","range","source","analysis-status","fixture-count"].includes(key))) next.delete("page")
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") next.delete(key)
    else next.set(key, String(value))
  }
  return next
}

export function deliveryFor(ad: Ad, range: DeliveryRange) {
  if (ad.status === "uploaded" || ad.id.startsWith("upload-")) return undefined
  return ad.sampleWindows?.[range]
}

export function selectLibraryAds(ads: readonly Ad[], state: LibraryState, groups: readonly AdGroup[], findings: LibraryFindings = {}) {
  const group = groups.find(item => item.id === state.group) ?? (!state.group ? groups[0] : undefined)
  const numeric = (ad: Ad, key: "spend" | "results") => {
    const delivery = deliveryFor(ad, state.range)
    return key === "spend" ? delivery?.spend ?? -1 : Number(delivery?.results.value.replace(/[^\d.]/g, "") ?? -1)
  }
  return ads.filter(ad => {
    if (state.query && ![ad.name, ad.product, ad.campaign, ad.adSet, ad.placement, ad.read.hookLine, ad.read.hook, ad.read.angle].join(" ").toLowerCase().includes(state.query.trim().toLowerCase())) return false
    if (state.campaign && ad.campaign !== state.campaign) return false
    if (state.adSet && ad.adSet !== state.adSet) return false
    if (state.status && ad.status !== state.status) return false
    if (state.placement && ad.placement !== state.placement) return false
    if (state.dateFrom && (!ad.startedAt || ad.startedAt < state.dateFrom)) return false
    if (state.dateTo && (!ad.startedAt || ad.startedAt > state.dateTo)) return false
    if (ad.sampleWindows) {
      const delivery = deliveryFor(ad, state.range)
      if (!delivery || (!delivery.spend && !Number(delivery.results.value.replace(/[^\d.]/g, "")))) return false
    }
    if ((state.group || state.tab === "groups") && !group?.adIds.includes(ad.id)) return false
    if (state.property) {
      const finding = findings[ad.id]?.find(item => item.id === state.property)
      if (!finding || finding.status === "pending" || finding.status === "unavailable") return false
      if (state.propertyValue && finding.value !== state.propertyValue) return false
    }
    return true
  }).sort((a, b) => {
    const comparison = state.sort === "name" ? (a.name || a.product).localeCompare(b.name || b.product)
      : state.sort === "recent" ? (a.startedAt || "").localeCompare(b.startedAt || "")
        : numeric(a, state.sort) - numeric(b, state.sort)
    return (state.direction === "ascending" ? comparison : -comparison) || a.id.localeCompare(b.id)
  })
}

export function libraryDetailHref(id: string, search: URLSearchParams, orderedIds: readonly string[], hostname?: string) {
  const params = new URLSearchParams(search)
  params.set("sourceAds", orderedIds.join(","))
  params.set("returnTo", `${appPath("/ads", hostname)}${search.size ? `?${search}` : ""}`)
  return `${appPath(`/ads/${id}`, hostname)}?${params}`
}

export function detailNavigation(ads: readonly Ad[], currentId: string, search: URLSearchParams, location: Pick<Location, "hostname" | "origin"> = window.location) {
  const available = new Set(ads.map(ad => ad.id))
  const requested = search.has("sourceAds") ? (search.get("sourceAds") || "").split(",") : ads.map(ad => ad.id)
  const ordered = [...new Set(requested)].filter(id => available.has(id))
  const ids = ordered.includes(currentId) ? ordered : available.has(currentId) ? [currentId] : []
  const index = ids.indexOf(currentId)
  const libraryPath = appPath("/ads", location.hostname)
  let backHref = libraryPath
  try {
    const destination = new URL(search.get("returnTo") || libraryPath, location.origin)
    if (destination.origin === location.origin && destination.pathname === libraryPath) backHref = `${destination.pathname}${destination.search}${destination.hash}`
  } catch { /* Malformed return destinations fall back to this workspace's library. */ }
  return { ids, index, backHref, siblingHref(offset: number) {
    const id = ids[index + offset]
    if (index < 0 || !id) return undefined
    const params = new URLSearchParams(search)
    for (const key of ["finding", "findingId", "draft", "draftId", "version", "versionId", "change", "changeId", "ideate"]) params.delete(key)
    params.set("sourceAds", ids.join(","))
    params.set("returnTo", backHref)
    return `${appPath(`/ads/${id}`, location.hostname)}?${params}`
  } }
}

export function comparisonAds(rows: readonly Ad[], selectedIds: readonly string[]) {
  const selected = new Set(selectedIds)
  if (selected.size < 2 || selected.size > 4) return []
  const visible = rows.filter(ad => selected.has(ad.id))
  return visible.length === selected.size ? visible : []
}

export function creativeAspectRatio(ad: Ad): `${number} / ${number}` {
  if (/Reels|Stories/i.test(ad.placement || "")) return "9 / 16"
  return ad.w > 0 && ad.h > 0 ? `${ad.w} / ${ad.h}` : "1 / 1"
}

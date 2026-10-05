import { ads } from "@/data/ads"

export interface AdGroup {
  id: string
  name: string
  adIds: string[]
}

const key = "butterfly-ad-groups"
const initialGroups: AdGroup[] = [
  {
    id: "barrier-cream-tests",
    name: "Daily ritual",
    adIds: ["1235086835413596", "2529793287483755"],
  },
]

export function readGroups(): AdGroup[] {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return initialGroups
    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return initialGroups
    const knownIds = new Set(ads.map((ad) => ad.id))
    return parsed.filter((group): group is AdGroup =>
      typeof group?.id === "string" &&
      typeof group?.name === "string" &&
      Array.isArray(group?.adIds),
    ).map((group) => ({
      ...group,
      name: group.id === "barrier-cream-tests" && group.name === "Barrier cream tests" ? "Daily ritual" : group.name,
      adIds: [...new Set(group.adIds.filter((id) => typeof id === "string" && knownIds.has(id)))],
    }))
  } catch {
    return initialGroups
  }
}

export function writeGroups(groups: AdGroup[]) {
  localStorage.setItem(key, JSON.stringify(groups))
}

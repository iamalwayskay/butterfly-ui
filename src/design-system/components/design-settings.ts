import { useEffect, useMemo, useState } from "react"

export type SidebarMode = "icons" | "labeled"
export type Density = "compact" | "comfortable"
export type InterfaceFont = "jetbrains" | "archivo-narrow"
export type InterfaceWeight = "regular" | "medium"
export type InterfaceCasing = "uppercase" | "natural"
export type MotionMode = "functional" | "reduced"

export interface DesignSettings {
  sidebar: SidebarMode
  density: Density
  font: InterfaceFont
  weight: InterfaceWeight
  casing: InterfaceCasing
  motion: MotionMode
}

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  sidebar: "labeled",
  density: "compact",
  font: "archivo-narrow",
  weight: "medium",
  casing: "uppercase",
  motion: "functional",
}

export const APPROVED_ACTION_SETTINGS = Object.freeze({
  gradientStart: "#c2185b",
  gradientEnd: "#8b1a75",
  ctaRadius: 999,
})

const STORAGE_KEY = "butterfly.design-system.settings.v10"

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/../g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? [0, 0, 0]
  const linear = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(first: string, second: string) {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

export function getGradientContrast(start: string, end: string) {
  const white = Math.min(contrastRatio(start, "#ffffff"), contrastRatio(end, "#ffffff"))
  const black = Math.min(contrastRatio(start, "#111615"), contrastRatio(end, "#111615"))
  return black >= white ? { foreground: "#111615", ratio: black } : { foreground: "#ffffff", ratio: white }
}

function readSettings(): DesignSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_DESIGN_SETTINGS
    const parsed = JSON.parse(saved)
    return {
      sidebar: parsed.sidebar === "icons" ? "icons" : "labeled",
      density: parsed.density === "comfortable" ? "comfortable" : "compact",
      font: parsed.font === "jetbrains" ? "jetbrains" : "archivo-narrow",
      weight: parsed.weight === "regular" ? "regular" : "medium",
      casing: parsed.casing === "natural" ? "natural" : "uppercase",
      motion: parsed.motion === "reduced" ? "reduced" : "functional",
    }
  } catch {
    return DEFAULT_DESIGN_SETTINGS
  }
}

export function useDesignSettings() {
  const [settings, setSettings] = useState<DesignSettings>(readSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const presentation = useMemo(() => ({
    "data-sidebar": settings.sidebar,
    "data-density": settings.density,
    "data-font": settings.font,
    "data-ui-weight": settings.weight,
    "data-casing": settings.casing,
    "data-motion": settings.motion,
  }), [settings])

  const update = <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const reset = () => setSettings(DEFAULT_DESIGN_SETTINGS)

  return { settings, update, reset, presentation }
}

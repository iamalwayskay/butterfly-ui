import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type SurfaceTone = "canvas" | "subtle" | "inverse" | "accent"
export type SurfaceGeometry = "none" | "cut"

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  tone?: SurfaceTone
  geometry?: SurfaceGeometry
  as?: "section" | "article" | "div"
}

export function Surface({ tone = "canvas", geometry = "none", as: Element = "section", className, ...props }: SurfaceProps) {
  return <Element className={cn("bf-surface", `bf-surface--${tone}`, geometry !== "none" && `bf-surface--${geometry}`, className)} {...props} />
}

export interface AccentLabelProps extends HTMLAttributes<HTMLSpanElement> { children: ReactNode }
export function AccentLabel({ className, children, ...props }: AccentLabelProps) {
  return <span className={cn("bf-accent-label", className)} {...props}>{children}</span>
}

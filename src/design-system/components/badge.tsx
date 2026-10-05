import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant = "identity" | "neutral" | "ready" | "review" | "error" | "secondary" | "outline" | "default"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: ReactNode
}

export function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  const resolvedVariant = variant === "secondary" || variant === "outline" || variant === "default" ? "neutral" : variant
  return (
    <span data-slot="badge" className={cn("bf-badge", `bf-badge--${resolvedVariant}`, className)} {...props}>
      {children}
    </span>
  )
}

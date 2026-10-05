import type { CSSProperties, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export type SkeletonVariant = "text" | "block" | "circle"

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: SkeletonVariant
  width?: CSSProperties["width"]
  height?: CSSProperties["height"]
  label?: string
}

export function Skeleton({ variant = "block", width, height, label, className, style, ...props }: SkeletonProps) {
  return (
    <span
      className={cn("bf-skeleton", `bf-skeleton--${variant}`, className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ ...style, width, height }}
      {...props}
    />
  )
}

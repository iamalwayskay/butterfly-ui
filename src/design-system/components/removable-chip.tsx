import { X } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface RemovableChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode
  removeLabel: string
}

export function RemovableChip({ children, removeLabel, className, type = "button", ...props }: RemovableChipProps) {
  return <button type={type} className={cn("bf-removable-chip", className)} aria-label={removeLabel} {...props}>
    <span>{children}</span>
    <span className="bf-removable-chip__remove" aria-hidden="true"><X /></span>
  </button>
}

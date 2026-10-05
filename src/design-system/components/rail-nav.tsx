import type { LucideIcon } from "lucide-react"
import { Tooltip } from "radix-ui"
import { cn } from "@/lib/utils"

export interface RailNavItem {
  label: string
  href: string
  icon: LucideIcon
  active?: boolean
  count?: number
}

export interface RailNavProps {
  label?: string
  items: readonly RailNavItem[]
  mode?: "icons" | "labeled"
  className?: string
  onNavigate?: (href: string) => void
}

export function RailNav({ label = "Workspace", items, mode = "labeled", className, onNavigate }: RailNavProps) {
  return (
    <Tooltip.Provider delayDuration={300}><nav className={cn("bf-rail-nav", `bf-rail-nav--${mode}`, className)} aria-label={label}>
      {items.map(({ label: itemLabel, href, icon: Icon, active, count }) => (
        <Tooltip.Root key={href}><Tooltip.Trigger asChild><a
          className="bf-rail-nav__item"
          href={href}
          aria-current={active ? "page" : undefined}
          aria-label={mode === "icons" ? itemLabel : undefined}
          onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(href) } : undefined}
        >
          <Icon aria-hidden="true" />
          {mode === "labeled" ? <span className="bf-rail-nav__label">{itemLabel}</span> : null}
          {count !== undefined ? <span className="bf-rail-nav__count" aria-label={`${count} items`}>{count}</span> : null}
        </a></Tooltip.Trigger>{mode === "icons" ? <Tooltip.Portal><Tooltip.Content className="bf-icon-tooltip" side="right" sideOffset={8}>{itemLabel}</Tooltip.Content></Tooltip.Portal> : null}</Tooltip.Root>
      ))}
    </nav></Tooltip.Provider>
  )
}

import { ChevronRight } from "lucide-react"
import type { MouseEventHandler, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: ReactNode
  href?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[]
  label?: string
  className?: string
}

export function Breadcrumb({ items, label = "Breadcrumb", className }: BreadcrumbProps) {
  return (
    <nav className={cn("bf-breadcrumb", className)} aria-label={label}>
      <ol className="bf-breadcrumb__list">
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li className="bf-breadcrumb__item" key={`${index}-${String(item.label)}`}>
              {index > 0 ? <ChevronRight className="bf-breadcrumb__separator" aria-hidden="true" /> : null}
              {current || (!item.href && !item.onClick) ? (
                <span className="bf-breadcrumb__current" aria-current={current ? "page" : undefined}>{item.label}</span>
              ) : item.href ? (
                <a className="bf-breadcrumb__link" href={item.href}>{item.label}</a>
              ) : (
                <button className="bf-breadcrumb__link" type="button" onClick={item.onClick}>{item.label}</button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

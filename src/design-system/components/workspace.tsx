import { Link, useLocation, type To } from "react-router-dom"
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb"

export interface WorkspacePageHeaderProps {
  title: string
  breadcrumb?: readonly BreadcrumbItem[]
  metadata?: ReactNode
  actions?: ReactNode
  description?: ReactNode
  className?: string
  headingLevel?: 1 | 2 | 3
}

export function WorkspacePageHeader({ title, breadcrumb, metadata, actions, description, className, headingLevel = 1 }: WorkspacePageHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "h1"
  return (
    <header className={cn("bf-page-header", className)}>
      {breadcrumb?.length ? <Breadcrumb items={[...breadcrumb]} /> : null}
      <div className="bf-page-header__row">
        <div className="bf-page-header__copy">
          <div className="bf-page-header__title-line">
            <Heading>{title}</Heading>
            {metadata ? <div className="bf-page-header__metadata">{metadata}</div> : null}
          </div>
          {description ? <div className="bf-page-header__description">{description}</div> : null}
        </div>
        {actions ? <div className="bf-page-header__actions">{actions}</div> : null}
      </div>
    </header>
  )
}

export interface PageTabItem {
  value: string
  label: string
  to?: To
  queryValue?: string
  disabled?: boolean
  count?: number
}

export interface PageTabsProps {
  label: string
  items: readonly PageTabItem[]
  queryParam?: string
  activeValue?: string
  className?: string
}

export function PageTabs({ label, items, queryParam, activeValue, className }: PageTabsProps) {
  const location = useLocation()
  const currentQueryValue = queryParam ? new URLSearchParams(location.search).get(queryParam) : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ start: false, end: false })

  const updateOverflow = useCallback(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    const next = {
      start: scroll.scrollLeft > 1,
      end: scroll.scrollLeft + scroll.clientWidth < scroll.scrollWidth - 1,
    }
    setOverflow((current) => current.start === next.start && current.end === next.end ? current : next)
  }, [])

  const revealTab = useCallback((tab: HTMLElement) => {
    const scroll = scrollRef.current
    if (!scroll) return
    const tabBounds = tab.getBoundingClientRect()
    const scrollBounds = scroll.getBoundingClientRect()
    if (tabBounds.left < scrollBounds.left) scroll.scrollLeft += tabBounds.left - scrollBounds.left
    else if (tabBounds.right > scrollBounds.right) scroll.scrollLeft += tabBounds.right - scrollBounds.right
    updateOverflow()
  }, [updateOverflow])

  useLayoutEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    let cancelled = false
    const revealActiveTab = () => {
      if (cancelled) return
      const activeTab = scroll.querySelector<HTMLElement>('[aria-current="page"]')
      if (activeTab) revealTab(activeTab)
      else updateOverflow()
    }
    revealActiveTab()
    const resizeObserver = new ResizeObserver(revealActiveTab)
    resizeObserver.observe(scroll)
    scroll.querySelectorAll(".bf-page-tabs__link").forEach((tab) => resizeObserver.observe(tab))
    void document.fonts?.ready.then(revealActiveTab)
    return () => {
      cancelled = true
      resizeObserver.disconnect()
    }
  }, [activeValue, currentQueryValue, items.length, location.pathname, location.search, revealTab, updateOverflow])

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.matches(".bf-page-tabs__link")) revealTab(event.target)
  }

  const destinationFor = (item: PageTabItem): To => {
    if (item.to) return item.to
    if (!queryParam) return location.pathname
    const params = new URLSearchParams(location.search)
    params.set(queryParam, item.queryValue ?? item.value)
    return { pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }
  }

  return (
    <nav
      className={cn("bf-page-tabs", className)}
      aria-label={label}
      data-overflow-start={overflow.start || undefined}
      data-overflow-end={overflow.end || undefined}
    >
      <div ref={scrollRef} className="bf-page-tabs__scroll" onFocusCapture={handleFocus} onScroll={updateOverflow}>
        {items.map((item) => {
          const queryValue = item.queryValue ?? item.value
          const active = activeValue
            ? item.value === activeValue
            : queryParam
              ? currentQueryValue === queryValue || (!currentQueryValue && item === items[0])
              : typeof item.to === "string"
                ? location.pathname === item.to
                : item.to && typeof item.to === "object" && item.to.pathname
                  ? location.pathname === item.to.pathname
                  : false

          if (item.disabled) {
            return <span key={item.value} className="bf-page-tabs__link" aria-disabled="true">{item.label}</span>
          }
          return (
            <Link key={item.value} className="bf-page-tabs__link" to={destinationFor(item)} aria-current={active ? "page" : undefined}>
              <span>{item.label}</span>
              {item.count !== undefined ? <span className="bf-page-tabs__count" aria-label={`${item.count} items`}>{item.count}</span> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

import { useCallback, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

export type TabItem<T extends string> = { value: T; label: string; disabled?: boolean }

export interface TabsProps<T extends string> {
  label: string
  items: readonly TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  className?: string
  panelId?: string
  idPrefix?: string
}

export function Tabs<T extends string>({ label, items, value, onValueChange, className, panelId, idPrefix }: TabsProps<T>) {
  const generatedId = useId()
  const id = idPrefix ?? generatedId
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ start: false, end: false })
  const updateOverflow = useCallback(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    setOverflow({ start: scroll.scrollLeft > 1, end: scroll.scrollLeft + scroll.clientWidth < scroll.scrollWidth - 1 })
  }, [])
  const reveal = useCallback((tab: HTMLElement) => {
    const scroll = scrollRef.current
    if (!scroll) return
    const tabBounds = tab.getBoundingClientRect(), scrollBounds = scroll.getBoundingClientRect()
    if (tabBounds.left < scrollBounds.left) scroll.scrollLeft += tabBounds.left - scrollBounds.left
    else if (tabBounds.right > scrollBounds.right) scroll.scrollLeft += tabBounds.right - scrollBounds.right
    updateOverflow()
  }, [updateOverflow])
  useLayoutEffect(() => {
    const scroll = scrollRef.current
    if (!scroll) return
    const active = refs.current[items.findIndex(item => item.value === value)]
    if (active) reveal(active); else updateOverflow()
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(scroll)
    refs.current.forEach(node => { if (node) observer.observe(node) })
    return () => observer.disconnect()
  }, [items, reveal, updateOverflow, value])
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => { if (event.target instanceof HTMLElement && event.target.matches(".bf-tabs__tab")) reveal(event.target) }

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => !item.disabled)
    const enabledIndex = enabled.findIndex(({ itemIndex }) => itemIndex === index)
    let target = enabledIndex
    if (event.key === "ArrowRight") target = (enabledIndex + 1) % enabled.length
    else if (event.key === "ArrowLeft") target = (enabledIndex - 1 + enabled.length) % enabled.length
    else if (event.key === "Home") target = 0
    else if (event.key === "End") target = enabled.length - 1
    else return
    event.preventDefault()
    const next = enabled[target]
    onValueChange(next.item.value)
    refs.current[next.itemIndex]?.focus()
  }

  return (
    <div className="bf-tabs-frame" data-overflow-start={overflow.start || undefined} data-overflow-end={overflow.end || undefined}>
    <div ref={scrollRef} className={cn("bf-tabs", className)} role="tablist" aria-label={label} onScroll={updateOverflow} onFocusCapture={handleFocus}>
      {items.map((item, index) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(node) => { refs.current[index] = node }}
            id={`${id}-tab-${encodeURIComponent(item.value)}`}
            type="button"
            role="tab"
            className="bf-tabs__tab"
            aria-selected={active}
            aria-controls={panelId ?? `${id}-panel-${item.value}`}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => move(event, index)}
          >
            {item.label}
          </button>
        )
      })}
    </div></div>
  )
}

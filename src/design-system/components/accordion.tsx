import { ChevronDown, LockKeyhole } from "lucide-react"
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface AccordionItem {
  id: string
  label: string
  meta?: string
  content: ReactNode
  disabled?: boolean
  unresolved?: boolean
}

export interface AccordionProps {
  items: readonly AccordionItem[]
  openIds: ReadonlySet<string>
  onToggle: (id: string) => void
  className?: string
}

export function Accordion({ items, openIds, onToggle, className }: AccordionProps) {
  const id = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target = index
    if (event.key === "ArrowDown") target = (index + 1) % items.length
    else if (event.key === "ArrowUp") target = (index - 1 + items.length) % items.length
    else if (event.key === "Home") target = 0
    else if (event.key === "End") target = items.length - 1
    else return
    event.preventDefault()
    let attempts = 0
    while (items[target]?.disabled && attempts < items.length) {
      target = event.key === "ArrowUp" ? (target - 1 + items.length) % items.length : (target + 1) % items.length
      attempts += 1
    }
    refs.current[target]?.focus()
  }

  return (
    <div className={cn("bf-accordion", className)}>
      {items.map((item, index) => {
        const open = openIds.has(item.id)
        const triggerId = `${id}-trigger-${item.id}`
        const panelId = `${id}-panel-${item.id}`
        return (
          <section key={item.id} className={cn("bf-accordion__item", item.unresolved && "bf-accordion__item--unresolved")}>
            <h3 className="bf-accordion__heading">
              <button
                ref={(node) => { refs.current[index] = node }}
                id={triggerId}
                type="button"
                className="bf-accordion__trigger"
                aria-expanded={open}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => onToggle(item.id)}
                onKeyDown={(event) => move(event, index)}
              >
                {item.disabled ? <LockKeyhole className="bf-accordion__chevron" aria-hidden="true" /> : <ChevronDown className="bf-accordion__chevron" aria-hidden="true" />}
                <span className="bf-accordion__label">{item.label}</span>
                {item.meta ? <span className="bf-accordion__meta">{item.meta}</span> : null}
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={triggerId} className="bf-accordion__panel" hidden={!open}>
              {item.content}
            </div>
          </section>
        )
      })}
    </div>
  )
}

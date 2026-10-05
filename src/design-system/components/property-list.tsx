import { ChevronDown } from "lucide-react"
import { useId, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

export interface PropertyRow {
  id: string
  label: string
  value: string
  status: string
  confidence?: number
}

export interface PropertyGroup {
  id: string
  label: string
  meta?: string
  rows: readonly PropertyRow[]
}

export interface PropertyListProps {
  groups: readonly PropertyGroup[]
  selectedId?: string
  openIds: ReadonlySet<string>
  onSelect: (id: string) => void
  onToggleGroup: (id: string) => void
  className?: string
  emptyMessage?: string
}

function confidenceText(confidence?: number) {
  if (confidence === undefined) return null
  return `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`
}

export function PropertyList({ groups, selectedId, openIds, onSelect, onToggleGroup, className, emptyMessage = "No findings match these filters." }: PropertyListProps) {
  const id = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const moveGroupFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target = index
    if (event.key === "ArrowDown") target = (index + 1) % groups.length
    else if (event.key === "ArrowUp") target = (index - 1 + groups.length) % groups.length
    else if (event.key === "Home") target = 0
    else if (event.key === "End") target = groups.length - 1
    else return
    event.preventDefault()
    refs.current[target]?.focus()
  }

  if (!groups.some((group) => group.rows.length)) return <p className={cn("bf-property-list__empty", className)}>{emptyMessage}</p>

  return (
    <div className={cn("bf-property-list", className)} aria-label="Analysis properties">
      {groups.map((group, index) => {
        const open = openIds.has(group.id)
        const triggerId = `${id}-trigger-${group.id}`
        const panelId = `${id}-panel-${group.id}`
        return (
          <section className="bf-property-list__group" key={group.id}>
            <h3 className="bf-property-list__heading">
              <button
                ref={(node) => { refs.current[index] = node }}
                id={triggerId}
                type="button"
                className="bf-property-list__group-trigger"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggleGroup(group.id)}
                onKeyDown={(event) => moveGroupFocus(event, index)}
              >
                <ChevronDown className="bf-property-list__chevron" aria-hidden="true" />
                <span>{group.label}</span>
                <span className="bf-property-list__group-meta">{group.meta ?? `${group.rows.length}`}</span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}>
              {group.rows.map((row) => {
                const selected = row.id === selectedId
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="bf-property-list__row"
                    aria-pressed={selected}
                    onClick={() => onSelect(row.id)}
                  >
                    <span className="bf-property-list__copy">
                      <span className="bf-property-list__label">{row.label}</span>
                      <span className="bf-property-list__value">{row.value}</span>
                    </span>
                    <span className="bf-property-list__trailing">
                      {row.status.toLowerCase() !== "ready" ? <span className={cn("bf-property-list__status", `bf-property-list__status--${row.status}`)}>{row.status}</span> : null}
                      {confidenceText(row.confidence) ? <span className="bf-property-list__confidence">{confidenceText(row.confidence)}</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

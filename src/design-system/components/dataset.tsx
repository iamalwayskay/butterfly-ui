import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Popover } from "radix-ui"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { SelectField } from "./field"

export interface FilterBarProps { label?: string; children: ReactNode; applied?: ReactNode }
export function FilterBar({ label = "Filters", children, applied }: FilterBarProps) {
  return <section className="bf-filter-bar" aria-label={label}><div className="bf-filter-bar__controls">{children}</div>{applied ? <div className="bf-filter-bar__applied">{applied}</div> : null}</section>
}

export interface FilterPopoverProps { label: string; children: ReactNode; onApply?: () => void; onClear?: () => void }
export function FilterPopover({ label, children, onApply, onClear }: FilterPopoverProps) {
  return <Popover.Root><Popover.Trigger asChild><Button variant="secondary">{label}</Button></Popover.Trigger><Popover.Portal><Popover.Content className="bf-filter-popover" aria-label={label} sideOffset={8} collisionPadding={13}>
    <strong>{label}</strong>{children}<div className="bf-filter-popover__actions">{onClear ? <Button variant="quiet" onClick={onClear}>Clear filters</Button> : null}<Popover.Close asChild><Button variant="primary" onClick={onApply}>{onApply ? "Apply filters" : "Done"}</Button></Popover.Close></div>
  </Popover.Content></Popover.Portal></Popover.Root>
}

export interface ResponsiveFilterTaskProps {
  triggerLabel: string
  title: string
  description?: string
  children: ReactNode
  onApply?: () => void
  onClear?: () => void
  mobileBreakpoint?: number
  clearLabel?: string
  closeLabel?: string
}

export function ResponsiveFilterTask({ triggerLabel, title, description, children, onApply, onClear, mobileBreakpoint = 700, clearLabel = "Clear filters", closeLabel }: ResponsiveFilterTaskProps) {
  const query = `(max-width: ${mobileBreakpoint}px)`
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const media = window.matchMedia(query)
    const sync = () => setMobile(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [query])
  const doneLabel = closeLabel ?? (onApply ? "Apply filters" : "Done")
  const actions = <div className="bf-responsive-filter__actions">{onClear ? <Button variant="quiet" onClick={onClear}>{clearLabel}</Button> : null}</div>
  if (mobile) return <Sheet><SheetTrigger asChild><Button variant="secondary">{triggerLabel}</Button></SheetTrigger><SheetContent side="bottom" className="bf-responsive-filter bf-responsive-filter--sheet" showCloseButton={false} data-presentation="sheet">
    <div className="bf-responsive-filter__heading"><SheetTitle>{title}</SheetTitle><SheetClose asChild><Button variant="quiet" onClick={onApply}>{doneLabel}</Button></SheetClose></div>
    {description ? <SheetDescription>{description}</SheetDescription> : null}<div className="bf-responsive-filter__body">{children}</div>{actions}
  </SheetContent></Sheet>
  return <Popover.Root open={popoverOpen} onOpenChange={next => { setPopoverOpen(next); if (!next) window.setTimeout(() => trigger.current?.focus(), 0) }}><Popover.Trigger asChild><Button ref={trigger} variant="secondary">{triggerLabel}</Button></Popover.Trigger><Popover.Portal><Popover.Content className="bf-responsive-filter bf-responsive-filter--popover" aria-label={title} data-presentation="popover" sideOffset={8} collisionPadding={13} onEscapeKeyDown={event => { const target = event.target as HTMLElement; if (target.closest(".bf-combobox, .bf-calendar-popover")) event.preventDefault() }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}>
    <strong>{title}</strong>{description ? <p>{description}</p> : null}<div className="bf-responsive-filter__body">{children}</div><div className="bf-responsive-filter__actions">{onClear ? <Button variant="quiet" onClick={onClear}>{clearLabel}</Button> : null}<Popover.Close asChild><Button variant="primary" onClick={onApply}>{doneLabel}</Button></Popover.Close></div>
  </Popover.Content></Popover.Portal></Popover.Root>
}

export interface ComparisonColumn { id: string; header: ReactNode }
export interface ComparisonRow { id: string; label: ReactNode; values: readonly ReactNode[] }
export interface ComparisonMatrixProps { label: string; columns: readonly ComparisonColumn[]; rows: readonly ComparisonRow[]; cue?: ReactNode; propertyLabel?: string }

export function ComparisonMatrix({ label, columns, rows, cue, propertyLabel = "Property" }: ComparisonMatrixProps) {
  return <div className="bf-comparison-matrix"><p className="bf-comparison-matrix__cue">{cue ?? `${columns.length} items · Scroll horizontally to compare →`}</p><div className="bf-comparison-matrix__scroll" role="region" aria-label={`${label} columns`} tabIndex={0}><table aria-label={label}><thead><tr><th scope="col">{propertyLabel}</th>{columns.map(column => <th scope="col" key={column.id}>{column.header}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{columns.map((column, index) => <td key={column.id}>{row.values[index] ?? "—"}</td>)}</tr>)}</tbody></table></div></div>
}

export interface SortOption { value: string; label: string }
export interface SortSelectProps { value: string; options: readonly SortOption[]; onChange: (value: string) => void; label?: string }
export function SortSelect({ value, options, onChange, label = "Sort by" }: SortSelectProps) {
  return <SelectField label={label} value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
}

export interface DataColumn<Row> { id: string; label: string; render: (row: Row) => ReactNode; sortable?: boolean; numeric?: boolean }
export interface DataTableProps<Row> {
  label: string; rows: readonly Row[]; columns: readonly DataColumn<Row>[]; getRowId: (row: Row) => string; getRowLabel: (row: Row) => string
  sort?: { column: string; direction: "ascending" | "descending" }; onSort?: (column: string, direction: "ascending" | "descending") => void
  selectedIds?: readonly string[]; onSelectionChange?: (ids: string[]) => void; empty?: ReactNode
}
export function DataTable<Row>({ label, rows, columns, getRowId, getRowLabel, sort, onSort, selectedIds = [], onSelectionChange, empty = "No records to show" }: DataTableProps<Row>) {
  return <div className="bf-data-table" role="region" aria-label={`${label} table`} tabIndex={0}><p className="bf-data-table__cue">Scroll horizontally to see every column →</p><table><caption>{label}</caption><thead><tr>{onSelectionChange ? <th scope="col">Select</th> : null}{columns.map(column=><th key={column.id} scope="col" aria-sort={sort?.column === column.id ? sort.direction : column.sortable ? "none" : undefined} data-numeric={column.numeric || undefined}>{column.sortable && onSort ? <button type="button" aria-label={`Sort by ${column.label}`} onClick={()=>onSort(column.id, sort?.column === column.id && sort.direction === "ascending" ? "descending" : "ascending")}>{column.label}</button> : column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map(row=>{
    const id=getRowId(row)
    return <tr key={id}>{onSelectionChange ? <td><Checkbox containerClassName="bf-data-table__selection" aria-label={`Select ${getRowLabel(row)}`} label={`Select ${getRowLabel(row)}`} checked={selectedIds.includes(id)} onChange={event=>onSelectionChange(event.target.checked ? [...selectedIds,id] : selectedIds.filter(selected=>selected!==id))} /></td> : null}{columns.map(column=><td key={column.id} data-numeric={column.numeric || undefined}>{column.render(row)}</td>)}</tr>
  }) : <tr><td colSpan={columns.length + (onSelectionChange ? 1 : 0)}>{empty}</td></tr>}</tbody></table></div>
}

export interface MetricCellProps { label: string; value?: ReactNode; source?: string; window?: string; missingReason?: string }
export function MetricCell({ label, value, source, window: period, missingReason = "No data available" }: MetricCellProps) {
  return <dl className="bf-metric-cell"><dt>{label}</dt><dd>{value ?? missingReason}</dd>{value != null && (source || period) ? <dd className="bf-metric-cell__source">{[source,period].filter(Boolean).join(" · ")}</dd> : null}</dl>
}

export interface CreativeCardProps { title: string; href: string; src?: string; alt: string; mediaType?: "image" | "video" | "document"; width?: number; height?: number; aspectRatio?: `${number} / ${number}`; source: string; selected?: boolean; onSelect?: (selected: boolean) => void; renderLink?: (props: {href: string; children: ReactNode}) => ReactNode; children?: ReactNode }
export function CreativeCard({ title, href, src, alt, mediaType = "image", width, height, aspectRatio = "9 / 16", source, selected = false, onSelect, renderLink, children }: CreativeCardProps) {
  return <article className="bf-creative-card" aria-label={title}>{onSelect ? <Checkbox containerClassName="bf-creative-card__select" label={`Select ${title}`} checked={selected} onChange={event=>onSelect(event.target.checked)} /> : null}<div className="bf-creative-card__media" style={{aspectRatio,"--creative-aspect-ratio":aspectRatio} as CSSProperties}>{mediaType === "document" ? <span>Document preview unavailable</span> : src ? mediaType === "video" ? <video src={src} aria-label={alt} controls playsInline preload="metadata" width={width} height={height} /> : <img src={src} alt={alt} width={width} height={height} loading="lazy" /> : <span>Media unavailable</span>}</div><h3>{renderLink ? renderLink({href,children:title}) : <a href={href}>{title}</a>}</h3><p>{source}</p>{children}</article>
}

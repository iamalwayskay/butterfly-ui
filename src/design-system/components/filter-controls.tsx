import { CalendarDays, Check, ChevronDown, Search } from "lucide-react"
import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { Popover } from "radix-ui"
import { cn } from "@/lib/utils"
import { Field, type FieldProps } from "./field"

export interface SegmentedOption { value: string; label: string; disabled?: boolean }
export interface SegmentedControlProps {
  label: string
  options: readonly SegmentedOption[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  tone?: "neutral" | "accent"
  className?: string
}

export function SegmentedControl({ label, options, value, onValueChange, disabled = false, tone = "neutral", className }: SegmentedControlProps) {
  const id = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const gapOffset = Array.from({ length: selectedIndex }, () => "var(--segmented-gap)").join(" + ")
  const indicatorStyle = {
    "--segmented-count": options.length,
    "--segmented-offset": `calc(${selectedIndex * 100}%${gapOffset ? ` + ${gapOffset}` : ""})`,
  } as CSSProperties
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    let next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowLeft" ? -1 : 1) + options.length) % options.length
    while (options[next]?.disabled && next !== index) next = (next + (event.key === "ArrowLeft" ? -1 : 1) + options.length) % options.length
    refs.current[next]?.focus()
    if (!options[next]?.disabled) onValueChange(options[next].value)
  }
  return <div className={cn("bf-segmented-field", className)}>
    <span className="bf-filter-label" id={`${id}-label`}>{label}</span>
    <div className={cn("bf-segmented", `bf-segmented--${tone}`)} style={indicatorStyle} role="radiogroup" aria-labelledby={`${id}-label`} aria-disabled={disabled || undefined}>
      <span className="bf-segmented__indicator" aria-hidden="true" />
      {options.map((option, index) => <button ref={(node) => { refs.current[index] = node }} key={option.value} type="button" role="radio" aria-checked={value === option.value} disabled={disabled || option.disabled} tabIndex={value === option.value ? 0 : -1} onClick={() => onValueChange(option.value)} onKeyDown={(event) => move(event, index)}>{option.label}</button>)}
    </div>
  </div>
}

export interface SwitchProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  hint?: string
  disabled?: boolean
  className?: string
}

export function Switch({ label, checked, onCheckedChange, hint, disabled = false, className }: SwitchProps) {
  const id = useId()
  return <label className={cn("bf-switch", className)} htmlFor={id}>
    <span className="bf-switch__copy"><span>{label}</span>{hint ? <small>{hint}</small> : null}</span>
    <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onCheckedChange(event.target.checked)} />
    <span className="bf-switch__track" aria-hidden="true"><span /></span>
  </label>
}

export interface ComboboxOption { value: string; label: string; disabled?: boolean }
export interface ComboboxProps {
  label: string
  options: readonly ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  hint?: string
  className?: string
}

export function Combobox({ label, options, value, onValueChange, placeholder = "Choose an option", searchPlaceholder = "Search…", emptyMessage = "No options found.", disabled = false, hint, className }: ComboboxProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const filtered = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())), [options, query])
  const selected = options.find((option) => option.value === value)
  useLayoutEffect(() => {
    if (!open) return
    setQuery("")
    setActive(Math.max(0, options.findIndex((option) => !option.disabled)))
    search.current?.focus()
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])
  useEffect(() => {
    if (open && filtered[active]) document.getElementById(`${id}-option-${filtered[active].value}`)?.scrollIntoView({ block: "nearest" })
  }, [open, active, filtered, id])
  const choose = (option: ComboboxOption) => { if (option.disabled) return; onValueChange(option.value); setOpen(false); setQuery(""); trigger.current?.focus() }
  const enabledIndexes = filtered.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0)
  const onKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true) }
      return
    }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return }
    if (event.key === "Tab" && event.shiftKey) { event.preventDefault(); setOpen(false); trigger.current?.focus(); return }
    if (!filtered.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return
    event.preventDefault()
    if (event.key === "Enter") { const option = filtered[active]; if (option) choose(option) }
    else setActive((current) => {
      const enabledPosition = enabledIndexes.indexOf(current)
      const direction = event.key === "ArrowDown" ? 1 : -1
      return enabledIndexes[(Math.max(0, enabledPosition) + direction + enabledIndexes.length) % enabledIndexes.length] ?? current
    })
  }
  return <div ref={root} className={cn("bf-combobox", className)} onKeyDown={onKeys} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
  }}>
    <span className="bf-filter-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" role="combobox" className="bf-combobox__trigger" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-describedby={hint ? `${id}-hint` : undefined} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} onClick={() => setOpen((current) => !current)}>
      <span id={`${id}-value`} className={selected ? undefined : "is-placeholder"}>{selected?.label ?? placeholder}</span><ChevronDown aria-hidden="true" />
    </button>
    {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    {open ? <div className="bf-combobox__popover">
      <label className="bf-combobox__search"><Search aria-hidden="true" /><span className="bf-visually-hidden">Search {label}</span><input ref={search} role="combobox" aria-expanded={open} aria-autocomplete="list" aria-activedescendant={filtered[active] && !filtered[active].disabled ? `${id}-option-${filtered[active].value}` : undefined} value={query} placeholder={searchPlaceholder} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); setActive(options.filter(option => option.label.toLowerCase().includes(nextQuery.trim().toLowerCase())).findIndex(option => !option.disabled)) }} aria-controls={`${id}-list`} /></label>
      <div id={`${id}-list`} className="bf-combobox__list" role="listbox" aria-label={label}>{filtered.length ? filtered.map((option, index) => <button id={`${id}-option-${option.value}`} key={option.value} type="button" role="option" tabIndex={-1} aria-selected={option.value === value} aria-disabled={option.disabled || undefined} disabled={option.disabled} className={index === active ? "is-active" : undefined} onPointerMove={() => { if (!option.disabled) setActive(index) }} onClick={() => choose(option)}><span>{option.label}</span>{option.value === value ? <Check aria-hidden="true" /> : null}</button>) : <p>{emptyMessage}</p>}</div>
    </div> : null}
  </div>
}

export interface DateFieldProps extends Omit<FieldProps, "type" | "icon"> {}
export function DateField({ onClick, ...props }: DateFieldProps) {
  return <Field {...props} type="date" icon={<CalendarDays aria-hidden="true" />} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) event.currentTarget.showPicker?.() }} />
}

export interface DateRangeFieldProps {
  label: string
  start: string
  end: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  hint?: string
  className?: string
}

export function DateRangeField({ label, start, end, onStartChange, onEndChange, min, max, disabled = false, hint, className }: DateRangeFieldProps) {
  const id = useId()
  return <div className={cn("bf-date-range", className)}>
    <span className="bf-filter-label" id={`${id}-label`}>{label}</span>
    <div className="bf-date-range__control" aria-labelledby={`${id}-label`}>
      <CalendarDays className="bf-date-range__icon" aria-hidden="true" />
      <label><span>Start</span><input type="date" aria-label={`${label} start`} value={start} min={min} max={end || max} disabled={disabled} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => onStartChange(event.target.value)} /></label>
      <span aria-hidden="true">—</span>
      <label><span>End</span><input type="date" aria-label={`${label} end`} value={end} min={start || min} max={max} disabled={disabled} onClick={(event) => event.currentTarget.showPicker?.()} onChange={(event) => onEndChange(event.target.value)} /></label>
    </div>
    {hint ? <small>{hint}</small> : null}
  </div>
}

const calendarWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function parseCalendarDate(value?: string) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function calendarIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function calendarLabel(value?: string, fallback = "Choose date") {
  const date = parseCalendarDate(value)
  return date ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date) : fallback
}

function calendarDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date)
}

function monthFor(value?: string) {
  const date = parseCalendarDate(value) ?? new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

interface CalendarPanelProps {
  calendarId: string
  label: string
  month: Date
  onMonthChange: (month: Date) => void
  start?: string
  end?: string
  min?: string
  max?: string
  onChoose: (value: string) => void
}

function CalendarPanel({ calendarId, label, month, onMonthChange, start, end, min, max, onChoose }: CalendarPanelProps) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const startDate = parseCalendarDate(start)
  const endDate = parseCalendarDate(end)
  const minDate = parseCalendarDate(min)
  const maxDate = parseCalendarDate(max)
  const today = new Date()
  const todayValue = calendarIso(today)
  const firstEnabled = days.find(date => !(minDate && date < minDate) && !(maxDate && date > maxDate))
  const focusValue = start && days.some(date => calendarIso(date) === start) ? start : today.getMonth() === month.getMonth() && today.getFullYear() === month.getFullYear() ? todayValue : calendarIso(firstEnabled ?? first)
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const movement: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (!(event.key in movement) && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    const next = new Date(date)
    next.setDate(date.getDate() + (event.key === "Home" ? -date.getDay() : event.key === "End" ? 6 - date.getDay() : movement[event.key]))
    const value = calendarIso(next)
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) onMonthChange(new Date(next.getFullYear(), next.getMonth(), 1))
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-calendar="${calendarId}"] [data-date="${value}"]`)?.focus())
  }
  return <div className="bf-calendar" data-calendar={calendarId}>
    <div className="bf-calendar__header"><button type="button" aria-label="Previous month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><strong aria-live="polite">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month)}</strong><button type="button" aria-label="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
    <div className="bf-calendar__grid" role="grid" aria-label={`${label} dates`}>
      {calendarWeekdays.map(day => <span role="columnheader" key={day}>{day}</span>)}
      {days.map(date => {
        const value = calendarIso(date)
        const before = Boolean(minDate && date < minDate)
        const after = Boolean(maxDate && date > maxDate)
        const inRange = Boolean(startDate && endDate && date >= startDate && date <= endDate)
        return <button key={value} type="button" role="gridcell" tabIndex={value === focusValue ? 0 : -1} data-date={value} data-outside={date.getMonth() !== month.getMonth() || undefined} data-in-range={inRange || undefined} aria-label={calendarDayLabel(date)} aria-selected={value === start || value === end} disabled={before || after} onKeyDown={event => moveFocus(event, date)} onClick={() => onChoose(value)}>{date.getDate()}</button>
      })}
    </div>
  </div>
}

export interface CalendarDatePickerProps {
  label: string
  value?: string
  onValueChange: (value: string) => void
  min?: string
  max?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function CalendarDatePicker({ label, value, onValueChange, min, max, hint, disabled = false, className }: CalendarDatePickerProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [month, setMonth] = useState(() => monthFor(value))
  useEffect(() => { if (open) setMonth(monthFor(value)) }, [open])
  const changeOpen = (next: boolean) => { if (next) setPortalContainer(trigger.current?.closest<HTMLElement>('[data-slot="sheet-content"], [data-presentation]') ?? null); setOpen(next); if (!next) window.setTimeout(() => trigger.current?.focus(), 0) }
  return <div className={cn("bf-calendar-field", className)}><span className="bf-filter-label" id={`${id}-label`}>{label}</span><Popover.Root open={open} onOpenChange={changeOpen}><Popover.Trigger asChild><button ref={trigger} type="button" className="bf-calendar-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-describedby={hint ? `${id}-hint` : undefined} disabled={disabled}><CalendarDays aria-hidden="true" /><span id={`${id}-value`}>{calendarLabel(value)}</span><ChevronDown aria-hidden="true" /></button></Popover.Trigger><Popover.Portal container={portalContainer ?? undefined}><Popover.Content className="bf-calendar-popover" role="dialog" aria-label={`${label} calendar`} sideOffset={8} collisionPadding={13} onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-calendar="${id}"] [role=gridcell][tabindex="0"]`)?.focus()) }} onEscapeKeyDown={event => { event.preventDefault(); changeOpen(false) }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}><CalendarPanel calendarId={id} label={label} month={month} onMonthChange={setMonth} start={value} min={min} max={max} onChoose={next => { onValueChange(next); changeOpen(false) }} /></Popover.Content></Popover.Portal></Popover.Root>{hint ? <small id={`${id}-hint`}>{hint}</small> : null}</div>
}

export interface CalendarDateRangePickerProps {
  label: string
  start?: string
  end?: string
  onRangeChange: (start: string, end: string) => void
  min?: string
  max?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function CalendarDateRangePicker({ label, start = "", end = "", onRangeChange, min, max, hint, disabled = false, className }: CalendarDateRangePickerProps) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
  const [month, setMonth] = useState(() => monthFor(start || end))
  const [choosingEnd, setChoosingEnd] = useState(false)
  useEffect(() => { if (open) { setMonth(monthFor(start || end)); setChoosingEnd(false) } }, [open])
  const changeOpen = (next: boolean) => { if (next) setPortalContainer(trigger.current?.closest<HTMLElement>('[data-slot="sheet-content"], [data-presentation]') ?? null); setOpen(next); if (!next) window.setTimeout(() => trigger.current?.focus(), 0) }
  const choose = (value: string) => {
    if (!choosingEnd || !start || value < start) { onRangeChange(value, ""); setChoosingEnd(true); return }
    onRangeChange(start, value); setChoosingEnd(false); changeOpen(false)
  }
  return <div className={cn("bf-calendar-field", className)}><span className="bf-filter-label" id={`${id}-label`}>{label}</span><Popover.Root open={open} onOpenChange={changeOpen}><Popover.Trigger asChild><button ref={trigger} type="button" className="bf-calendar-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-describedby={hint ? `${id}-hint` : undefined} disabled={disabled}><CalendarDays aria-hidden="true" /><span id={`${id}-value`} className="bf-calendar-trigger__range"><span>{calendarLabel(start, "Start")}</span><span aria-hidden="true">—</span><span>{calendarLabel(end, "End")}</span></span><ChevronDown aria-hidden="true" /></button></Popover.Trigger><Popover.Portal container={portalContainer ?? undefined}><Popover.Content className="bf-calendar-popover" role="dialog" aria-label={`${label} calendar`} sideOffset={8} collisionPadding={13} onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-calendar="${id}"] [role=gridcell][tabindex="0"]`)?.focus()) }} onEscapeKeyDown={event => { event.preventDefault(); changeOpen(false) }} onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus() }}><p className="bf-calendar__instruction">{choosingEnd ? "Choose end date" : "Choose start date"}</p><CalendarPanel calendarId={id} label={label} month={month} onMonthChange={setMonth} start={start} end={end} min={min} max={max} onChoose={choose} /></Popover.Content></Popover.Portal></Popover.Root>{hint ? <small id={`${id}-hint`}>{hint}</small> : null}</div>
}

import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Checkbox } from "./checkbox"
import { RemovableChip } from "./removable-chip"
import "./multi-select.css"

export type MultiSelectOption = { value: string; label: string; disabled?: boolean }
export interface MultiSelectProps { label: string; options: MultiSelectOption[]; value: string[]; onValueChange: (value: string[]) => void; disabled?: boolean; hint?: string; defaultOpen?: boolean }
export function MultiSelect({ label, options, value, onValueChange, disabled = false, hint, defaultOpen = false }: MultiSelectProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])
  const selected = options.filter((option) => value.includes(option.value))
  return <div className="bf-multi-select" ref={root} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus() } }}>
    <span className="bf-multi-select__label" id={`${id}-label`}>{label}</span>
    <div className="bf-multi-select__control" data-disabled={disabled || undefined}>
      <div className="bf-multi-select__value" id={`${id}-summary`}>{selected.length ? selected.map((option) => <RemovableChip key={option.value} disabled={disabled || option.disabled} removeLabel={`Remove ${option.label}`} onClick={() => onValueChange(value.filter((item) => item !== option.value))}>{option.label}</RemovableChip>) : <span>Choose sources</span>}</div>
      <button ref={trigger} id={`${id}-trigger`} type="button" className="bf-multi-select__trigger" disabled={disabled} aria-label={`${open ? "Close" : "Open"} ${label}${selected.length ? `, ${selected.length} selected` : ""}`} aria-describedby={hint ? `${id}-hint` : undefined} aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(!open)}><ChevronDown size={20} aria-hidden="true" /></button>
    </div>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {open && !disabled && <fieldset id={`${id}-options`} className="bf-multi-select__options"><legend className="bf-multi-select__legend">{label}</legend>{options.length ? options.map((option) => <Checkbox key={option.value} label={option.label} checked={value.includes(option.value)} disabled={option.disabled} onChange={() => onValueChange(value.includes(option.value) ? value.filter((item) => item !== option.value) : [...value, option.value])} />) : <p>No sources available.</p>}{value.length > 0 && <button className="bf-multi-select__clear" type="button" onClick={() => onValueChange([])}>Clear selection</button>}</fieldset>}
  </div>
}

import { ChevronLeft, ChevronRight, Grid2X2, List, X } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface FilterChipProps {
  label: string
  value?: string
  onRemove?: () => void
  removeLabel?: string
  className?: string
}

export function FilterChip({ label, value, onRemove, removeLabel, className }: FilterChipProps) {
  return <span className={cn("bf-filter-chip", className)}><span>{label}</span>{value ? <strong>{value}</strong> : null}{onRemove ? <button type="button" onClick={onRemove} aria-label={removeLabel ?? `Remove ${label}${value ? `: ${value}` : ""}`}><X aria-hidden="true" /></button> : null}</span>
}

export function ResultCount({ count, label = "result", className }: { count: number; label?: string; className?: string }) {
  return <p className={cn("bf-result-count", className)} aria-live="polite"><strong>{count.toLocaleString()}</strong> {label}{count === 1 ? "" : "s"}</p>
}

export type ViewMode = "grid" | "table"
export interface ViewToggleProps { value: ViewMode; onChange: (value: ViewMode) => void; label?: string; className?: string }

export function ViewToggle({ value, onChange, label = "View", className }: ViewToggleProps) {
  return <div className={cn("bf-view-toggle", className)} role="group" aria-label={label}>
    <button type="button" aria-pressed={value === "grid"} onClick={() => onChange("grid")}><Grid2X2 aria-hidden="true" /><span>Grid</span></button>
    <button type="button" aria-pressed={value === "table"} onClick={() => onChange("table")}><List aria-hidden="true" /><span>Table</span></button>
  </div>
}

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  label?: string
  className?: string
}

export function Pagination({ page, pageCount, onPageChange, label = "Pagination", className }: PaginationProps) {
  const safeCount = Math.max(1, pageCount)
  const safePage = Math.min(safeCount, Math.max(1, page))
  const pages = Array.from({ length: safeCount }, (_, index) => index + 1).filter((candidate) => candidate === 1 || candidate === safeCount || Math.abs(candidate - safePage) <= 1)
  return <nav className={cn("bf-pagination", className)} aria-label={label}>
    <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} aria-label="Previous page"><ChevronLeft aria-hidden="true" /></button>
    {pages.map((candidate, index) => <span key={candidate} className="bf-pagination__slot">{index > 0 && candidate - pages[index - 1] > 1 ? <span aria-hidden="true">…</span> : null}<button type="button" aria-current={candidate === safePage ? "page" : undefined} onClick={() => onPageChange(candidate)} aria-label={`Page ${candidate}`}>{candidate}</button></span>)}
    <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={safePage === safeCount} aria-label="Next page"><ChevronRight aria-hidden="true" /></button>
  </nav>
}

export interface BulkActionBarProps {
  count: number
  noun?: string
  children: ReactNode
  onClear?: () => void
  className?: string
}

export function BulkActionBar({ count, noun = "item", children, onClear, className }: BulkActionBarProps) {
  if (count <= 0) return null
  return <div className={cn("bf-bulk-actions", className)} role="region" aria-label="Bulk actions"><p><strong>{count}</strong> {noun}{count === 1 ? "" : "s"} selected</p><div className="bf-bulk-actions__controls">{children}{onClear ? <Button variant="quiet" onClick={onClear}>Clear selection</Button> : null}</div></div>
}

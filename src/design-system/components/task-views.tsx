import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TaskView = "creative" | "analysis" | "evidence"
export interface TaskViewsProps {
  creative: ReactNode
  analysis: ReactNode
  evidence: ReactNode
  value: TaskView
  onChange: (view: TaskView) => void
  labels?: Partial<Record<TaskView, string>>
  className?: string
}

const views: readonly TaskView[] = ["creative", "analysis", "evidence"]

export function TaskViews({ creative, analysis, evidence, value, onChange, labels, className }: TaskViewsProps) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const [compact, setCompact] = useState(false)
  const copy: Record<TaskView, string> = { creative: labels?.creative ?? "Creative", analysis: labels?.analysis ?? "Analysis", evidence: labels?.evidence ?? "Evidence" }
  const content = { creative, analysis, evidence }
  useLayoutEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width <= 900))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index
    if (event.key === "ArrowRight") next = (index + 1) % views.length
    else if (event.key === "ArrowLeft") next = (index - 1 + views.length) % views.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = views.length - 1
    else return
    event.preventDefault()
    onChange(views[next])
    refs.current[next]?.focus()
  }
  return <div ref={root} className={cn("bf-task-views", className)} data-view={value}>
    <div className="bf-task-views__switcher" role={compact ? "tablist" : undefined} aria-label={compact ? "Task view" : undefined} aria-hidden={!compact || undefined}>{views.map((view, index) => <button key={view} ref={(node) => { refs.current[index] = node }} type="button" role={compact ? "tab" : undefined} aria-selected={compact ? value === view : undefined} aria-controls={compact ? `${id}-${view}` : undefined} id={`${id}-${view}-tab`} tabIndex={compact ? value === view ? 0 : -1 : -1} onClick={() => onChange(view)} onKeyDown={(event) => move(event, index)}>{copy[view]}</button>)}</div>
    <div className="bf-task-views__body">{views.map((view) => <section key={view} id={`${id}-${view}`} className={`bf-task-views__pane bf-task-views__pane--${view}`} role={compact ? "tabpanel" : "region"} aria-labelledby={compact ? `${id}-${view}-tab` : undefined} aria-label={compact ? undefined : copy[view]} data-pane={view}>{content[view]}</section>)}</div>
  </div>
}

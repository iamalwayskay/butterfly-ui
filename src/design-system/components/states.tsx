import { AlertCircle, CheckCircle2, CircleDashed, Info, LoaderCircle, LockKeyhole, SearchX, TriangleAlert, X } from "lucide-react"
import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StateTone = "neutral" | "loading" | "success" | "warning" | "error" | "permission" | "empty"

const icons = {
  neutral: Info,
  loading: LoaderCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  permission: LockKeyhole,
  empty: SearchX,
} as const

export interface StatePanelProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: ReactNode
  tone?: StateTone
  actions?: ReactNode
  compact?: boolean
}

export function StatePanel({ title, description, tone = "neutral", actions, compact = false, className, ...props }: StatePanelProps) {
  const Icon = icons[tone]
  return (
    <section className={cn("bf-state-panel", `bf-state-panel--${tone}`, compact && "bf-state-panel--compact", className)} aria-live={tone === "loading" ? "polite" : undefined} aria-busy={tone === "loading" || undefined} {...props}>
      <Icon className={cn("bf-state-panel__icon", tone === "loading" && "bf-spin")} aria-hidden="true" />
      <div className="bf-state-panel__copy">
        <h2>{title}</h2>
        {description ? <div>{description}</div> : null}
      </div>
      {actions ? <div className="bf-state-panel__actions">{actions}</div> : null}
    </section>
  )
}

export interface InlineAlertProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  tone?: Exclude<StateTone, "empty" | "loading">
  children: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
}

export function InlineAlert({ title, tone = "neutral", children, onDismiss, dismissLabel = "Dismiss message", className, ...props }: InlineAlertProps) {
  const Icon = icons[tone]
  return (
    <div className={cn("bf-inline-alert", `bf-inline-alert--${tone}`, className)} role={tone === "error" ? "alert" : "status"} {...props}>
      <Icon className="bf-inline-alert__icon" aria-hidden="true" />
      <div className="bf-inline-alert__copy">
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {onDismiss ? <button type="button" className="bf-inline-alert__dismiss" onClick={onDismiss} aria-label={dismissLabel}><X aria-hidden="true" /></button> : null}
    </div>
  )
}

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value?: number
  max?: number
  label: string
  showValue?: boolean
}

export function Progress({ value, max = 100, label, showValue = true, className, ...props }: ProgressProps) {
  const bounded = value === undefined ? undefined : Math.min(max, Math.max(0, value))
  const percent = bounded === undefined ? undefined : Math.round((bounded / max) * 100)
  return (
    <div className={cn("bf-progress", value === undefined && "bf-progress--indeterminate", className)} {...props}>
      <div className="bf-progress__label"><span>{label}</span>{showValue && percent !== undefined ? <span>{percent}%</span> : null}</div>
      <div className="bf-progress__track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={bounded}>
        <span className="bf-progress__bar" style={percent === undefined ? undefined : { width: `${percent}%` }} />
      </div>
    </div>
  )
}

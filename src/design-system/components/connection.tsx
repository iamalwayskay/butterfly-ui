import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle, PlugZap } from "lucide-react"
import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Progress } from "./states"

export type ConnectionState = "disconnected" | "connecting" | "importing" | "ready" | "partial" | "error"
export interface ConnectionStatusProps {
  state: ConnectionState
  title: string
  description?: ReactNode
  actions?: ReactNode
  progress?: number
  className?: string
}

const connectionIcons = { disconnected: PlugZap, connecting: LoaderCircle, importing: LoaderCircle, ready: CheckCircle2, partial: CircleDashed, error: AlertCircle } as const

export function ConnectionStatus({ state, title, description, actions, progress, className }: ConnectionStatusProps) {
  const Icon = connectionIcons[state]
  const busy = state === "connecting" || state === "importing"
  return <section className={cn("bf-connection-status", `bf-connection-status--${state}`, className)} aria-live="polite" aria-busy={busy || undefined}>
    <Icon className={cn("bf-connection-status__icon", busy && "bf-spin")} aria-hidden="true" />
    <div className="bf-connection-status__body"><h2>{title}</h2>{description ? <div>{description}</div> : null}{progress !== undefined ? <Progress label="Import progress" value={progress} /> : null}</div>
    {actions ? <div className="bf-connection-status__actions">{actions}</div> : null}
  </section>
}

export interface StepItem { label: string; description?: string }
export interface StepProgressProps { steps: readonly StepItem[]; current: number; label?: string; className?: string }

export function StepProgress({ steps, current, label = "Progress", className }: StepProgressProps) {
  return <ol className={cn("bf-step-progress", className)} aria-label={label} style={{ "--step-count": steps.length } as CSSProperties}>{steps.map((step, index) => {
    const status = index < current ? "complete" : index === current ? "current" : "upcoming"
    return <li key={`${step.label}-${index}`} data-status={status} aria-current={status === "current" ? "step" : undefined}><span className="bf-step-progress__marker">{status === "complete" ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span><span><strong>{step.label}</strong>{step.description ? <small>{step.description}</small> : null}</span></li>
  })}</ol>
}

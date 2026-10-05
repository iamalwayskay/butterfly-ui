import { Check, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface EvidenceFact {
  label: string
  value: string
}

export interface EvidenceInspectorProps {
  label: string
  value: string
  status: string
  facts: readonly EvidenceFact[]
  quote?: string
  quoteLabel?: string
  timestamp?: number
  provenance?: string
  confirmed?: boolean
  onViewTimestamp?: (timestamp: number) => void
  onCorrect?: () => void
  onConfirm?: () => void
  className?: string
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function EvidenceInspector({ label, value, status, facts, quote, quoteLabel = "Evidence", timestamp, provenance, confirmed = false, onViewTimestamp, onCorrect, onConfirm, className }: EvidenceInspectorProps) {
  return (
    <article className={cn("bf-evidence", className)} aria-label={`${label} evidence`}>
      <header className="bf-evidence__header">
        <div>
          <p className="bf-evidence__eyebrow">Extracted value</p>
          <h2 className="bf-evidence__value">{value}</h2>
        </div>
        <span className={cn("bf-evidence__status", `bf-evidence__status--${status.toLowerCase()}`)}>{status}</span>
      </header>

      <dl className="bf-evidence__facts">
        {facts.map((fact) => (
          <div className="bf-evidence__fact" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {quote ? (
        <figure className="bf-evidence__quote">
          {quoteLabel && quoteLabel !== "Evidence" ? <figcaption>{quoteLabel}</figcaption> : null}
          <blockquote>“{quote}”</blockquote>
          {timestamp !== undefined ? (
            <button className="bf-evidence__timestamp" type="button" onClick={() => onViewTimestamp?.(timestamp)}>
              <Play aria-hidden="true" /> View at {formatTime(timestamp)}
            </button>
          ) : null}
        </figure>
      ) : null}

      {provenance ? (
        <div className="bf-evidence__provenance">
          <h3>Provenance</h3>
          <p>{provenance}</p>
        </div>
      ) : null}

      {onCorrect || onConfirm ? (
        <footer className="bf-evidence__actions">
          {onCorrect ? <Button variant="secondary" onClick={onCorrect}>Correct</Button> : null}
          {onConfirm ? <Button variant="primary" icon={confirmed ? <Check /> : undefined} onClick={onConfirm}>{confirmed ? "Confirmed" : "Confirm"}</Button> : null}
        </footer>
      ) : null}
    </article>
  )
}

import { UploadCloud } from "lucide-react"
import { useId, useState, type DragEvent, type ReactNode } from "react"
import { Button } from "./button"
import { Progress } from "./states"
import { SelectField } from "./field"

export interface DropzoneProps { label: string; name?: string; accept?: string; multiple?: boolean; disabled?: boolean; hint?: string; error?: string; id?: string; selectedCount?: number; onFiles: (files: File[]) => void }
export function Dropzone({ label, name, accept, multiple = false, disabled = false, hint, error, id: suppliedId, selectedCount, onFiles }: DropzoneProps) {
  const generatedId = useId(), id = suppliedId ?? generatedId
  const [dragging, setDragging] = useState(false)
  const [lastCount, setLastCount] = useState(0)
  const count = selectedCount ?? lastCount
  const countLabel = selectedCount === undefined ? `${count} ${count === 1 ? "file" : "files"} chosen` : `${count} ${count === 1 ? "asset" : "assets"} in batch`
  const acceptFiles = (files: File[]) => { const accepted = files.slice(0, multiple ? undefined : 1); setLastCount(accepted.length); onFiles(accepted) }
  const stopDrag = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false) }
  return <div className="bf-dropzone" data-dragging={dragging || undefined} aria-disabled={disabled || undefined} onDragEnter={event => { event.preventDefault(); if (!disabled) setDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={stopDrag} onDrop={event => { stopDrag(event); if (!disabled) acceptFiles(Array.from(event.dataTransfer.files)) }}>
    <input className="bf-dropzone__input" id={id} name={name} type="file" accept={accept} multiple={multiple} disabled={disabled} aria-label={label} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} onChange={event => { acceptFiles(Array.from(event.target.files ?? [])); event.target.value = "" }} />
    <label className="bf-dropzone__surface" htmlFor={id}><UploadCloud aria-hidden="true" /><span><strong>{label}</strong><small>{multiple ? "Choose files or drop them here" : "Choose a file or drop it here"}</small></span>{count > 0 ? <span className="bf-dropzone__count">{countLabel}</span> : null}</label>
    {error ? <p className="bf-dropzone__message" id={`${id}-error`} role="alert">{error}</p> : hint ? <p id={`${id}-hint`}>{hint}</p> : null}
  </div>
}

export interface FilePreviewProps { name: string; src?: string; mediaType: "image" | "video" | "document"; description?: ReactNode; onRemove?: () => void }
export function FilePreview({ name, src, mediaType, description, onRemove }: FilePreviewProps) {
  return <figure className="bf-file-preview">
    {mediaType === "image" && src ? <img src={src} alt={name} /> : mediaType === "video" && src ? <video src={src} controls aria-label={name} /> : <p>{mediaType === "document" ? "Document preview unavailable" : "Media unavailable"}</p>}
    <figcaption><strong>{name}</strong>{description}{onRemove ? <Button variant="quiet" onClick={onRemove} aria-label={`Remove ${name}`}>Remove</Button> : null}</figcaption>
  </figure>
}

export interface UploadProgressProps { name: string; value?: number; error?: string; onRetry?: () => void }
export function UploadProgress({ name, value, error, onRetry }: UploadProgressProps) {
  return <div className="bf-upload-progress" aria-live="polite">{error ? <><p role="alert">{error}</p>{onRetry ? <Button variant="secondary" onClick={onRetry}>Retry {name}</Button> : null}</> : <Progress label={`${name} upload`} value={value} />}</div>
}

export interface AccountOption { id: string; name: string; source: string; disabled?: boolean }
export interface AccountSwitcherProps { accounts: readonly AccountOption[]; value: string; onChange: (id: string) => void; disabled?: boolean; label?: string }
export function AccountSwitcher({ accounts, value, onChange, disabled, label = "Account" }: AccountSwitcherProps) {
  return <div className="bf-account-switcher"><SelectField label={label} value={value} disabled={disabled || !accounts.length} onChange={event => onChange(event.target.value)}>{!accounts.length ? <option value="">No accounts available</option> : accounts.map(account => <option key={account.id} value={account.id} disabled={account.disabled}>{account.name} · {account.source}</option>)}</SelectField></div>
}

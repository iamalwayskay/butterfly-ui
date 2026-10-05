import { ChevronDown } from "lucide-react"
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type FieldFrameProps = {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

function FieldFrame({ id, label, hint, error, children, className }: FieldFrameProps) {
  return (
    <div className={cn("bf-field", error && "bf-field--error", className)}>
      <label className="bf-field__label" htmlFor={id}>{label}</label>
      {children}
      {error ? <span className="bf-field__message" id={`${id}-error`} role="alert">{error}</span> : hint ? <span className="bf-field__hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  )
}

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  icon?: ReactNode
  containerClassName?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, icon, id: suppliedId, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} className={containerClassName}>
      <span className={cn("bf-field__control", icon && "bf-field__control--icon")}>
        {icon ? <span className="bf-field__leading" aria-hidden="true">{icon}</span> : null}
        <input
          ref={ref}
          id={id}
          className={cn("bf-field__input", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </span>
    </FieldFrame>
  )
})

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, id: suppliedId, className, containerClassName, children, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} className={containerClassName}>
      <span className="bf-field__control bf-field__control--select">
        <select
          ref={ref}
          id={id}
          className={cn("bf-field__input bf-field__select", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="bf-field__select-icon" aria-hidden="true" />
      </span>
    </FieldFrame>
  )
})

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { label, hint, error, id: suppliedId, className, containerClassName, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error} className={containerClassName}>
      <span className="bf-field__control bf-field__control--textarea">
        <textarea
          ref={ref}
          id={id}
          className={cn("bf-field__input bf-field__textarea", className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </span>
    </FieldFrame>
  )
})

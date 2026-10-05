import { Check } from "lucide-react"
import { forwardRef, useId, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string
  hint?: string
  containerClassName?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, id: suppliedId, containerClassName, className, ...props },
  ref,
) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <label className={cn("bf-checkbox", containerClassName)} htmlFor={id}>
      <span className="bf-checkbox__control">
        <input ref={ref} id={id} type="checkbox" className={cn("bf-checkbox__input", className)} aria-describedby={hintId} {...props} />
        <span className="bf-checkbox__box" aria-hidden="true"><Check /></span>
      </span>
      <span className="bf-checkbox__copy">
        <span className="bf-checkbox__label">{label}</span>
        {hint ? <span className="bf-checkbox__hint" id={hintId}>{hint}</span> : null}
      </span>
    </label>
  )
})

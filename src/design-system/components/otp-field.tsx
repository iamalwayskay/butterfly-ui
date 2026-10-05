import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

export interface OtpFieldProps {
  value: string
  onChange: (value: string) => void
  length?: number
  label?: string
  disabled?: boolean
  error?: string
  autoFocus?: boolean
  className?: string
}

export function OtpField({ value, onChange, length = 6, label = "Verification code", disabled, error, autoFocus, className }: OtpFieldProps) {
  const errorId = `${useId()}-error`
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? "")
  const setDigit = (index: number, input: string) => {
    const digit = input.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    onChange(next.join("").slice(0, length))
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus()
    if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); refs.current[index - 1]?.focus() }
    if (event.key === "ArrowRight" && index < length - 1) { event.preventDefault(); refs.current[index + 1]?.focus() }
  }
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    refs.current[Math.min(pasted.length, length) - 1]?.focus()
  }

  return <fieldset className={cn("bf-otp", error && "bf-otp--error", className)} disabled={disabled} aria-describedby={error ? errorId : undefined}>
    <legend>{label}</legend>
    <div className="bf-otp__fields">{digits.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node }} value={digit} onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => onKeyDown(event, index)} onPaste={onPaste} onFocus={(event) => event.currentTarget.select()} inputMode="numeric" pattern="[0-9]*" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`${label}, digit ${index + 1} of ${length}`} aria-invalid={error ? true : undefined} autoFocus={autoFocus && index === 0} maxLength={1} />)}</div>
    {error ? <span id={errorId} className="bf-otp__error" role="alert">{error}</span> : null}
  </fieldset>
}

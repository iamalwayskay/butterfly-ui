import { useRef } from "react"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  error?: boolean
}

export function OtpInput({ value, onChange, error = false }: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-md border bg-background text-lg font-medium tabular-nums ${error ? "border-destructive" : "border-input"} ${value.length === index ? "ring-1 ring-ring" : ""}`}>
            {value[index] ?? ""}
          </div>
        ))}
      </div>
      <input ref={inputRef} autoFocus aria-label="Six-digit sign-in code" aria-invalid={error} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} className="absolute inset-0 h-full w-full cursor-text opacity-0" />
    </div>
  )
}

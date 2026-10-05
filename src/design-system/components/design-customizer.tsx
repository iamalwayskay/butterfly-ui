import { useRef, useState } from "react"
import { ExternalLink, Settings, RotateCcw, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { type DesignSettings } from "./design-settings"

export interface DesignCustomizerProps {
  settings: DesignSettings
  update: <K extends keyof DesignSettings>(key: K, value: DesignSettings[K]) => void
  reset: () => void
  catalogueHref?: string
  catalogueLabel?: string
}

export function DesignCustomizer({ settings, update, reset, catalogueHref, catalogueLabel }: DesignCustomizerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button ref={triggerRef} className="ds-customizer__trigger" type="button" aria-label="Open design settings">
        <Settings size={18} strokeWidth={1.8} />
        <span>Configure system</span>
      </button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="ds-customizer__backdrop" />
      <Dialog.Content className="ds-customizer__panel is-open" aria-label="Design settings" onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus() }}>
        <header>
          <div><Dialog.Title>Design settings</Dialog.Title><Dialog.Description>Change the live system. Your choices are saved in this browser.</Dialog.Description></div>
          <Dialog.Close asChild><button type="button" aria-label="Close design settings"><X size={18} /></button></Dialog.Close>
        </header>

        <div className="ds-customizer__body">
          <fieldset>
            <legend>Typeface</legend>
            <div className="ds-segmented">
              {([['jetbrains', 'JetBrains Mono'], ['archivo-narrow', 'Archivo Narrow']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.font === value} onClick={() => update("font", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Weight</legend>
            <div className="ds-segmented">
              {([['regular', 'Regular'], ['medium', 'Medium']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.weight === value} onClick={() => update("weight", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Casing</legend>
            <div className="ds-segmented">
              {([['uppercase', 'Uppercase'], ['natural', 'Natural']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.casing === value} onClick={() => update("casing", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Motion</legend>
            <div className="ds-segmented">
              {([['functional', 'Functional'], ['reduced', 'Reduced']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.motion === value} onClick={() => update("motion", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Sidebar</legend>
            <div className="ds-segmented">
              {([['labeled', 'Labeled'], ['icons', 'Icons only']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.sidebar === value} onClick={() => update("sidebar", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Density</legend>
            <div className="ds-segmented">
              {([['compact', 'Compact'], ['comfortable', 'Comfortable']] as const).map(([value, label]) => <button type="button" aria-pressed={settings.density === value} onClick={() => update("density", value)} key={value}>{label}</button>)}
            </div>
          </fieldset>
        </div>

        <footer>
          <button type="button" onClick={reset}><RotateCcw size={15} /> Reset to system</button>
          {catalogueHref && <a href={catalogueHref}>{catalogueLabel ?? "View catalogue"}<ExternalLink size={14} /></a>}
        </footer>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  )
}

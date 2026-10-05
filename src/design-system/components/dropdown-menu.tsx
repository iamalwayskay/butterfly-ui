import { Check, ChevronDown, MoreHorizontal, type LucideIcon } from "lucide-react"
import {
  createElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

export interface DropdownMenuItem {
  id: string
  label: string
  icon?: ReactNode | LucideIcon
  disabled?: boolean
  active?: boolean
  destructive?: boolean
  onSelect: () => void
}

export interface DropdownMenuProps {
  label: string
  items: readonly DropdownMenuItem[]
  icon?: ReactNode | LucideIcon
  triggerText?: string
  showChevron?: boolean
  align?: "start" | "end"
  className?: string
}

function renderIcon(icon: ReactNode | LucideIcon) {
  return isValidElement(icon) ? icon : createElement(icon as LucideIcon, { "aria-hidden": true })
}

export function DropdownMenu({ label, items, icon = MoreHorizontal, triggerText, showChevron = false, align = "end", className }: DropdownMenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const focusTargetRef = useRef<"first" | "last">("first")

  const enabledIndices = () => items.flatMap((item, index) => item.disabled ? [] : [index])

  const openMenu = (target: "first" | "last" = "first") => {
    focusTargetRef.current = target
    setOpen(true)
  }

  const closeMenu = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return
    const enabled = enabledIndices()
    const index = focusTargetRef.current === "last" ? enabled.at(-1) : enabled[0]
    requestAnimationFrame(() => index !== undefined && itemRefs.current[index]?.focus())

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, items])

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (open && event.key === "Escape") {
      event.preventDefault()
      closeMenu(true)
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      openMenu(event.key === "ArrowUp" ? "last" : "first")
    }
  }

  const onItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") {
      event.preventDefault()
      closeMenu(true)
      return
    }
    if (event.key === "Tab") {
      setOpen(false)
      return
    }
    const enabled = enabledIndices()
    const position = enabled.indexOf(index)
    let next: number | undefined
    if (event.key === "ArrowDown") next = enabled[(position + 1) % enabled.length]
    else if (event.key === "ArrowUp") next = enabled[(position - 1 + enabled.length) % enabled.length]
    else if (event.key === "Home") next = enabled[0]
    else if (event.key === "End") next = enabled.at(-1)
    else return
    event.preventDefault()
    if (next !== undefined) itemRefs.current[next]?.focus()
  }

  return (
    <div ref={rootRef} className={cn("bf-menu", className)}>
      <button
        ref={triggerRef}
        type="button"
        className="bf-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="bf-menu__trigger-icon" aria-hidden="true">{renderIcon(icon)}</span>
        {triggerText ? <span className="bf-menu__trigger-label">{triggerText}</span> : null}
        {showChevron ? <ChevronDown className="bf-menu__chevron" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div id={menuId} className={cn("bf-menu__content", `bf-menu__content--${align}`)} role="menu" aria-label={label}>
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(node) => { itemRefs.current[index] = node }}
              type="button"
              role="menuitem"
              aria-current={item.active ? "true" : undefined}
              className={cn(
                "bf-menu__item",
                item.active && "bf-menu__item--active",
                item.destructive && "bf-menu__item--destructive",
              )}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect()
                closeMenu(true)
              }}
              onKeyDown={(event) => onItemKeyDown(event, index)}
            >
              {item.icon ? <span className="bf-menu__item-icon" aria-hidden="true">{renderIcon(item.icon)}</span> : null}
              <span>{item.label}</span>
              {item.active ? <Check className="bf-menu__check" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

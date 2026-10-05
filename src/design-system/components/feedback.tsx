import { useId, useRef, type ComponentProps, type ReactNode, type RefObject } from "react"
import { AlertDialog as AlertPrimitive, Toast as ToastPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { IconButton } from "./button"
import { InlineAlert, type InlineAlertProps } from "./states"

export const AlertDialog = AlertPrimitive.Root
export const AlertDialogTrigger = AlertPrimitive.Trigger
export const AlertDialogTitle = AlertPrimitive.Title
export const AlertDialogDescription = AlertPrimitive.Description
export const AlertDialogCancel = AlertPrimitive.Cancel
export type AlertDialogContentProps = ComponentProps<typeof AlertPrimitive.Content>
export function AlertDialogContent({children,className,...props}:AlertDialogContentProps) {
  return <AlertPrimitive.Portal><AlertPrimitive.Overlay className="bf-alert-dialog-overlay" /><AlertPrimitive.Content className={cn("bf-alert-dialog",className)} {...props}>{children}</AlertPrimitive.Content></AlertPrimitive.Portal>
}
export function AlertDialogActions({children,className}:{children:ReactNode;className?:string}) {
  return <div className={cn("bf-alert-dialog__actions",className)}>{children}</div>
}

export interface BannerProps extends Omit<InlineAlertProps,"title"> {title:string;actions?:ReactNode}
/** Persistent, named page context; transient acknowledgements belong in Toast. */
export function Banner({title,children,actions,...props}:BannerProps) {
  const titleId=useId()
  return <section className="bf-banner" aria-labelledby={titleId}><InlineAlert {...props}><strong id={titleId}>{title}</strong><div>{children}</div>{actions}</InlineAlert></section>
}

export interface ToastProps {open:boolean;onOpenChange:(open:boolean)=>void;title:string;description?:ReactNode;duration?:number;returnFocusRef:RefObject<HTMLElement|null>}
/** Radix owns announcements, Escape, swipe, and pause while focused/hovered. */
export function Toast({open,onOpenChange,title,description,duration=5000,returnFocusRef}:ToastProps) {
  const viewportRef=useRef<HTMLOListElement>(null)
  function changeOpen(next:boolean) {
    // Radix moves a focused toast to its viewport before requesting close.
    // Only return focus when it is still owned here; timer expiry must not steal it.
    if(!next && viewportRef.current?.contains(document.activeElement))returnFocusRef.current?.focus()
    onOpenChange(next)
  }
  return <ToastPrimitive.Provider duration={duration}><ToastPrimitive.Root type="background" data-bf-toast="" className="bf-toast" open={open} onOpenChange={changeOpen}><div><ToastPrimitive.Title>{title}</ToastPrimitive.Title>{description && <ToastPrimitive.Description>{description}</ToastPrimitive.Description>}</div><ToastPrimitive.Close asChild><IconButton label="Dismiss notification" variant="quiet" icon={X} /></ToastPrimitive.Close></ToastPrimitive.Root><ToastPrimitive.Viewport ref={viewportRef} className="bf-toast-viewport" /></ToastPrimitive.Provider>
}

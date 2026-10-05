import type { ReactNode } from "react"
import { StatePanel } from "./states"

export interface PermissionGateProps {
  allowed: boolean
  children: ReactNode
  fallback?: ReactNode
  title?: string
  description?: ReactNode
}

export function PermissionGate({ allowed, children, fallback, title = "You do not have access", description = "Ask a workspace admin for the permission required to continue." }: PermissionGateProps) {
  if (allowed) return <>{children}</>
  return <>{fallback ?? <StatePanel tone="permission" title={title} description={description} />}</>
}

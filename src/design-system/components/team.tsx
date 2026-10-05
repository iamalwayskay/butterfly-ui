import { Mail, MoreHorizontal, RotateCw, X } from "lucide-react"
import type { ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { IconButton } from "./button"
import { Badge } from "./badge"
import { SelectField } from "./field"

export interface RoleOption { value: string; label: string }
export interface RoleSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string
  options: readonly RoleOption[]
}

export function RoleSelect({ label, options, className, ...props }: RoleSelectProps) {
  return <SelectField label={label} containerClassName={cn("bf-role-select", className)} {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
}

export interface MemberRowProps {
  name: string
  email: string
  avatar?: ReactNode
  role: string
  roles?: readonly RoleOption[]
  onRoleChange?: (role: string) => void
  status?: string
  actions?: ReactNode
  disabled?: boolean
  className?: string
}

export function MemberRow({ name, email, avatar, role, roles, onRoleChange, status, actions, disabled, className }: MemberRowProps) {
  return <div className={cn("bf-member-row", className)}>
    <div className="bf-member-row__avatar" aria-hidden="true">{avatar ?? name.slice(0, 2).toUpperCase()}</div>
    <div className="bf-member-row__identity"><strong>{name}</strong><span>{email}</span></div>
    {status ? <Badge variant="neutral">{status}</Badge> : null}
    {roles && onRoleChange ? <RoleSelect label={`Role for ${name}`} value={role} options={roles} onChange={(event) => onRoleChange(event.target.value)} disabled={disabled} /> : <span className="bf-member-row__role">{role}</span>}
    {actions ? <div className="bf-member-row__actions">{actions}</div> : <IconButton label={`More actions for ${name}`} icon={MoreHorizontal} disabled={disabled} />}
  </div>
}

export interface InviteRowProps {
  email: string
  role: string
  status?: "pending" | "failed"
  sentAt?: string
  onResend?: () => void
  onCancel?: () => void
  className?: string
}

export function InviteRow({ email, role, status = "pending", sentAt, onResend, onCancel, className }: InviteRowProps) {
  return <div className={cn("bf-invite-row", `bf-invite-row--${status}`, className)}>
    <span className="bf-invite-row__icon"><Mail aria-hidden="true" /></span>
    <div className="bf-invite-row__identity"><strong>{email}</strong><span>{role}{sentAt ? ` · Sent ${sentAt}` : ""}</span></div>
    <Badge variant={status === "failed" ? "error" : "review"}>{status === "failed" ? "Delivery failed" : "Pending"}</Badge>
    <div className="bf-invite-row__actions">{onResend ? <IconButton label={`Resend invite to ${email}`} icon={RotateCw} onClick={onResend} /> : null}{onCancel ? <IconButton label={`Cancel invite to ${email}`} icon={X} onClick={onCancel} /> : null}</div>
  </div>
}

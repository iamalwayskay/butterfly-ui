import { cn } from "@/lib/utils"
import "./page.css"

/**
 * The app content frame.
 *
 * Every product screen renders inside this, so the content column has ONE left
 * edge and ONE max width for the whole app. Pages must not set their own
 * container or centring — a screen that needs a narrower measure passes
 * `width="form"`, which keeps the same left edge and only limits the right.
 *
 * Before this existed, each page chose its own max-w-* and centred itself
 * independently, so the heading and cards shifted horizontally on every nav
 * click (fix list 4xl, clusters 5xl, settings 3xl, my ads none).
 */
export function Page({
  children,
  width = "default",
  className,
}: {
  children: React.ReactNode
  /** default = tables and lists · form = single-column reading/form measure */
  width?: "default" | "form"
  className?: string
}) {
  return (
    <div className={cn("bf-page-frame", className)}>
      <div
        className={cn(
          "w-full",
          width === "default" ? "max-w-[1200px]" : "max-w-[760px]",
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** Page heading. Same size, same spacing, every screen. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

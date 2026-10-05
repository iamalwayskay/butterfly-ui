import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Ad, AdStatus } from "@/data/ads"

const statusStyles: Record<AdStatus, string> = {
  live: "border-transparent bg-primary/10 text-primary",
  paused: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
  killed: "border-transparent bg-muted text-muted-foreground",
  draft: "border-transparent bg-secondary text-secondary-foreground",
  uploaded: "border-transparent bg-accent text-accent-foreground",
}

export function StatusBadge({ status, label }: { status: AdStatus; label: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", statusStyles[status])}>
      {label}
    </Badge>
  )
}

export function Thumb({ ad, className }: { ad: Ad; className?: string }) {
  if (ad.posterPanel) {
    return (
      <div
        role="img"
        aria-label={ad.name ?? ad.product}
        className={cn("bg-muted", className)}
        style={{
          backgroundImage: `url(${ad.poster})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "200% 100%",
          backgroundPosition: ad.posterPanel === "left" ? "left center" : "right center",
        }}
      />
    )
  }
  return (
    <img
      src={ad.poster}
      alt={ad.name ?? ad.product}
      loading="lazy"
      className={cn("bg-muted object-contain", className)}
    />
  )
}

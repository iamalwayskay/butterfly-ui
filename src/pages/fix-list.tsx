import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, Clock3, FilePenLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { visibleAds, type Ad } from "@/data/ads"
import { Thumb } from "@/components/read"
import { getIterationDrafts } from "@/lib/iterations"
import { Page } from "@/components/page"

function QueueAd({ ad, draftChange }: { ad: Ad; draftChange?: string }) {
  return <article className="grid gap-5 rounded-xl border bg-card p-4 sm:grid-cols-[118px_1fr] sm:p-5">
    <Link to={`/app/ads/${ad.id}`} className="flex h-44 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-[210px]" aria-label={`Open ${ad.name ?? ad.read.hookLine}`}><Thumb ad={ad} className="h-full w-full" /></Link>
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant="outline" className="font-normal">{draftChange ? "Draft saved" : ad.status === "paused" ? "Paused" : "Needs review"}</Badge><span>{ad.brand} · {ad.product}</span></div>
      <Link to={`/app/ads/${ad.id}`} className="mt-3 line-clamp-2 text-base font-semibold tracking-tight hover:underline">{ad.name ?? ad.read.hookLine}</Link>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{draftChange ? "Planned change" : ad.read.flag ? "Suggested change" : "Next step"}</p>
      <p className="mt-1 max-w-prose text-sm leading-6">{draftChange ?? ad.read.flag ?? "This ad is paused. Review its creative and delivery before deciding whether to revise it or leave it paused."}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-xs text-muted-foreground">
        <span className="capitalize">{ad.status}</span>
        <span aria-hidden="true">·</span>
        <span>{ad.spend === undefined ? "No delivery data" : `$${ad.spend.toLocaleString()} spent · Last 30 days`}</span>
        <Button variant="ghost" size="sm" className="ml-auto -mr-2" asChild><Link to={`/app/ads/${ad.id}`}>{draftChange ? "Open draft" : "Review ad"}<ArrowRight className="size-4" /></Link></Button>
      </div>
    </div>
  </article>
}

export function FixList() {
  const ads = visibleAds()
  const drafts = getIterationDrafts().filter((draft) => ads.some((ad) => ad.id === draft.adId))
  const draftedIds = new Set(drafts.map((draft) => draft.adId))
  const review = ads.filter((ad) => !ad.readIsSample && (ad.status === "paused" || ad.read.needsFix || draftedIds.has(ad.id)))
  const awaiting = ads.filter((ad) => ad.readIsSample)

  return <Page width="default">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-[28px] font-semibold tracking-tight">Action queue</h1><p className="mt-1 text-sm text-muted-foreground">Review a creative, decide what to change, and keep the draft with its ad.</p></div>
      <Button variant="outline" size="sm" asChild><Link to="/app/changed">See saved changes <ArrowRight className="size-4" /></Link></Button>
    </div>
    <div className="mt-7 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
      <div className="flex items-center gap-3 bg-card px-5 py-4"><Clock3 className="size-4 text-muted-foreground" /><div><p className="text-xl font-semibold tabular-nums">{review.filter((ad) => !draftedIds.has(ad.id)).length}</p><p className="text-xs text-muted-foreground">To review</p></div></div>
      <div className="flex items-center gap-3 bg-card px-5 py-4"><FilePenLine className="size-4 text-muted-foreground" /><div><p className="text-xl font-semibold tabular-nums">{drafts.length}</p><p className="text-xs text-muted-foreground">Drafts saved</p></div></div>
      <div className="flex items-center gap-3 bg-card px-5 py-4"><CheckCircle2 className="size-4 text-muted-foreground" /><div><p className="text-xl font-semibold tabular-nums">{awaiting.length}</p><p className="text-xs text-muted-foreground">Uploads to review</p></div></div>
    </div>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Ads to review</h2><p className="mt-1 text-sm text-muted-foreground">Paused ads and saved drafts in one place.</p></div><span className="text-sm tabular-nums text-muted-foreground">{review.length} {review.length === 1 ? "ad" : "ads"}</span></div>
    {review.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{review.map((ad) => <QueueAd key={ad.id} ad={ad} draftChange={drafts.find((draft) => draft.adId === ad.id)?.change} />)}</div> : <div className="mt-4 rounded-xl border border-dashed bg-card p-10 text-center"><h3 className="text-base font-medium">Nothing needs review</h3><p className="mt-1 text-sm text-muted-foreground">Paused ads and saved drafts will appear here.</p></div>}
    {awaiting.length > 0 && <section className="mt-10"><h2 className="text-lg font-semibold">Uploads to review</h2><p className="mt-1 text-sm text-muted-foreground">Open an uploaded creative to add notes or draft a change.</p><div className="mt-4 flex flex-wrap gap-3">{awaiting.map((ad) => <Link key={ad.id} to={`/app/ads/${ad.id}`} className="flex min-w-[240px] items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary/50"><Thumb ad={ad} className="h-14 w-9 rounded" /><span className="flex-1 text-sm font-medium">{ad.name ?? ad.read.hookLine}</span><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div></section>}
  </Page>
}

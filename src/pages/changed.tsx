import { Link } from "react-router-dom"
import { ArrowRight, FilePenLine, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { visibleAds } from "@/data/ads"
import { Thumb } from "@/components/read"
import { getIterationDrafts } from "@/lib/iterations"
import { Page } from "@/components/page"

export function Changed() {
  const ads = visibleAds()
  const drafts = getIterationDrafts().filter((draft) => ads.some((ad) => ad.id === draft.adId))
  return <Page width="default">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[28px] font-semibold tracking-tight">Changes</h1><p className="mt-1 text-sm text-muted-foreground">Keep drafts and creative changes attached to the ad they came from.</p></div><Button variant="outline" size="sm" asChild><Link to="/app/ads">My ads <ArrowRight className="size-4" /></Link></Button></div>
    <section className="mt-8"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FilePenLine className="size-4 text-muted-foreground" /><h2 className="text-lg font-semibold">Saved drafts</h2></div><span className="text-sm tabular-nums text-muted-foreground">{drafts.length}</span></div><p className="mt-1 text-sm text-muted-foreground">A saved draft is a plan. The ad has not changed until the new creative is made and run.</p>
      {drafts.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{drafts.map((draft) => {
        const ad = ads.find((item) => item.id === draft.adId)
        if (!ad) return null
        return <article key={draft.id} className="flex gap-4 rounded-xl border bg-card p-4"><Link to={`/app/ads/${ad.id}`} className="flex h-32 w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"><Thumb ad={ad} className="h-full w-full" /></Link><div className="flex min-w-0 flex-1 flex-col"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="font-normal">Draft saved</Badge><span className="text-xs text-muted-foreground">{new Date(draft.createdAt).toLocaleDateString()}</span></div><p className="mt-3 line-clamp-3 text-sm font-medium leading-6">{draft.change}</p><p className="mt-1 text-xs text-muted-foreground">{ad.name ?? ad.product}</p><Link to={`/app/ads/${ad.id}`} className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-primary hover:underline">Open ad <ArrowRight className="size-3" /></Link></div></article>
      })}</div> : <div className="mt-4 rounded-xl border border-dashed bg-card px-6 py-10"><p className="text-sm font-medium">No drafts saved yet</p><p className="mt-1 text-sm text-muted-foreground">Open an ad and save the change you want to make.</p><Button variant="outline" size="sm" className="mt-4" asChild><Link to="/app/ads">Browse ads <ArrowRight className="size-4" /></Link></Button></div>}
    </section>
    <section className="mt-10"><div className="flex items-center gap-2"><History className="size-4 text-muted-foreground" /><h2 className="text-lg font-semibold">Recent changes</h2></div><div className="mt-4 rounded-xl border border-dashed bg-card px-6 py-10"><p className="text-sm font-medium">No changes recorded yet</p><p className="mt-1 text-sm text-muted-foreground">Saved drafts stay above. Once a revised creative runs, its change and delivery can be recorded here.</p></div></section>
  </Page>
}

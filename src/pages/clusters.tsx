import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, Columns2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { visibleAds, type Ad } from "@/data/ads"
import { Thumb } from "@/components/read"
import { readGroups, writeGroups, type AdGroup } from "@/lib/groups"
import { Page } from "@/components/page"

function Creative({ ad, className = "" }: { ad: Ad; className?: string }) {
  return <div className={`flex items-center justify-center overflow-hidden rounded-lg bg-muted ${className}`}>
    <div className="h-full max-w-full overflow-hidden rounded-md" style={{ aspectRatio: ad.w && ad.h ? `${ad.w} / ${ad.h}` : undefined }}>
      <Thumb ad={ad} className="h-full w-full" />
    </div>
  </div>
}

export function Clusters() {
  const [ads] = useState(visibleAds)
  const [groups, setGroups] = useState(readGroups)
  const [name, setName] = useState("")
  const [rename, setRename] = useState("")
  const [editing, setEditing] = useState(false)
  const [compare, setCompare] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = groups.find((group) => group.id === searchParams.get("group"))

  function update(next: AdGroup[]) {
    setGroups(next)
    writeGroups(next)
  }

  function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const group = { id: crypto.randomUUID(), name: trimmed, adIds: [] }
    update([...groups, group])
    setName("")
    setSearchParams({ group: group.id })
  }

  function addAd(groupId: string, adId: string) {
    update(groups.map((group) => group.id === groupId && !group.adIds.includes(adId)
      ? { ...group, adIds: [...group.adIds, adId] }
      : group))
  }

  function removeAd(groupId: string, adId: string) {
    update(groups.map((group) => group.id === groupId
      ? { ...group, adIds: group.adIds.filter((id) => id !== adId) }
      : group))
  }

  if (selected) {
    const members = ads.filter((ad) => selected.adIds.includes(ad.id))
    const available = ads.filter((ad) => !selected.adIds.includes(ad.id))
    return <Page width="default">
      <Button variant="ghost" size="sm" className="-ml-2 mb-5" onClick={() => { setSearchParams({}); setCompare(false); setEditing(false) }}><ArrowLeft className="size-4" /> All groups</Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {editing ? <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (rename.trim()) update(groups.map((group) => group.id === selected.id ? { ...group, name: rename.trim() } : group)); setEditing(false) }}>
              <Input aria-label="Group name" autoFocus value={rename} onChange={(event) => setRename(event.target.value)} className="max-w-64" />
              <Button size="icon" type="submit" aria-label="Save name"><Check className="size-4" /></Button>
            </form> : <h1 className="text-[28px] font-semibold tracking-tight">{selected.name}</h1>}
            <Badge variant="outline" className="font-normal">{members.length} {members.length === 1 ? "ad" : "ads"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">A collection of ads you chose. Ads can be in more than one group.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => { setRename(selected.name); setEditing(true) }}><Pencil className="size-3.5" /> Rename</Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${selected.name}`} onClick={() => { update(groups.filter((group) => group.id !== selected.id)); setSearchParams({}) }}><Trash2 className="size-4" /></Button>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-3 border-y py-3">
        <Select onValueChange={(adId) => addAd(selected.id, adId)} value="">
          <SelectTrigger aria-label="Add an ad" className="w-full max-w-72" disabled={!available.length}><SelectValue placeholder={available.length ? "Add an ad" : "All ads added"} /></SelectTrigger>
          <SelectContent>{available.map((ad) => <SelectItem key={ad.id} value={ad.id}>{ad.product} · {ad.name ?? ad.read.hookLine}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled={members.length < 2} onClick={() => setCompare(!compare)}><Columns2 className="size-4" /> {compare ? "Hide comparison" : "Compare creatives"}</Button>
        <Button variant="ghost" size="sm" asChild><Link to={`/app/ads?group=${encodeURIComponent(selected.id)}`}>Open in My ads <ArrowRight className="size-4" /></Link></Button>
      </div>
      {members.length ? <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((ad) => <div key={ad.id} className="overflow-hidden rounded-xl border bg-card">
            <Link to={`/app/ads/${ad.id}`} className="block bg-muted p-4"><Creative ad={ad} className="h-64" /></Link>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{ad.product}</span><span className="capitalize">{ad.status}</span></div>
              <Link to={`/app/ads/${ad.id}`} className="mt-1.5 block line-clamp-2 text-sm font-medium hover:underline">{ad.name ?? ad.read.hookLine}</Link>
              <div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">{ad.spend === undefined ? "No delivery data" : `$${ad.spend.toLocaleString()} spend · Last 30 days`}</span><Button variant="ghost" size="icon" aria-label={`Remove ${ad.name ?? ad.read.hookLine} from group`} onClick={() => removeAd(selected.id, ad.id)}><X className="size-4" /></Button></div>
            </div>
          </div>)}
        </div>
        {compare && <section className="mt-8 overflow-x-auto rounded-xl border bg-card">
          <div className="border-b px-5 py-4"><h2 className="text-base font-semibold">Compare creatives</h2><p className="text-xs text-muted-foreground">Kindred sample · Last 30 days</p></div>
          <table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b bg-muted/50 text-xs text-muted-foreground"><th className="px-5 py-3 font-medium">Ad</th><th className="px-5 py-3 font-medium">Product</th><th className="px-5 py-3 font-medium">Placement</th><th className="px-5 py-3 text-right font-medium">Spend</th></tr></thead><tbody className="divide-y">{members.map((ad) => <tr key={ad.id}><td className="px-5 py-3"><Link to={`/app/ads/${ad.id}`} className="font-medium hover:underline">{ad.name ?? ad.read.hookLine}</Link></td><td className="px-5 py-3">{ad.product}</td><td className="px-5 py-3">{ad.placement ?? "—"}</td><td className="px-5 py-3 text-right tabular-nums">{ad.spend === undefined ? "—" : `$${ad.spend.toLocaleString()}`}</td></tr>)}</tbody></table>
        </section>}
      </> : <div className="mt-8 rounded-xl border border-dashed bg-card px-6 py-14 text-center"><h2 className="text-base font-medium">No ads in this group yet</h2><p className="mt-1 text-sm text-muted-foreground">Add an ad above to start collecting and comparing.</p></div>}
    </Page>
  }

  return <Page width="default">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-[28px] font-semibold tracking-tight">Groups</h1><p className="mt-1 text-sm text-muted-foreground">Keep related ads together for a campaign, test, or product.</p></div><span className="text-sm text-muted-foreground">{groups.length} {groups.length === 1 ? "group" : "groups"}</span></div>
    <form onSubmit={createGroup} className="mt-7 flex max-w-xl gap-2"><Input aria-label="New group name" placeholder="Name a new group" value={name} onChange={(event) => setName(event.target.value)} /><Button type="submit" disabled={!name.trim()}><Plus className="size-4" /> Create group</Button></form>
    {groups.length ? <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groups.map((group) => {
      const members = ads.filter((ad) => group.adIds.includes(ad.id))
      return <button key={group.id} type="button" onClick={() => setSearchParams({ group: group.id })} className="group overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <div className="flex h-44 items-center justify-center gap-2 bg-muted p-4">{members.length ? members.slice(0, 3).map((ad) => <Creative key={ad.id} ad={ad} className="h-full w-24 max-w-[31%] shadow-sm" />) : <span className="text-sm text-muted-foreground">No ads yet</span>}</div>
        <div className="flex items-center justify-between gap-4 p-5"><div><h2 className="font-semibold group-hover:text-primary">{group.name}</h2><p className="mt-1 text-xs text-muted-foreground">{members.length} {members.length === 1 ? "ad" : "ads"}</p></div><ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" /></div>
      </button>
    })}</div> : <div className="mt-7 rounded-xl border border-dashed bg-card px-6 py-14 text-center"><h2 className="text-base font-medium">Your first group starts here</h2><p className="mt-1 text-sm text-muted-foreground">Name a collection above, then add the ads you want to review together.</p></div>}
  </Page>
}

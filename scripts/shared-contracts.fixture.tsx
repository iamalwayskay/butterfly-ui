import { createRoot } from "react-dom/client"
import { useState } from "react"
import { BrowserRouter } from "react-router-dom"
import * as UI from "../src/design-system/components"
import "../src/design-system/index.css"

const required = ["Dropzone", "FilePreview", "UploadProgress", "AccountSwitcher", "FilterBar", "FilterPopover", "ResponsiveFilterTask", "ComparisonMatrix", "SortSelect", "DataTable", "CreativeCard", "MetricCell", "ShotStrip", "Transcript", "ActivityTimeline", "CalendarDatePicker", "CalendarDateRangePicker"]
Object.assign(window, { availableContracts: required.filter(name => name in UI) })

function Fixture() {
  const [files, setFiles] = useState<File[]>([])
  const [account, setAccount] = useState("kindred")
  const [sort, setSort] = useState("name")
  const [selected, setSelected] = useState<string[]>([])
  const [time, setTime] = useState(0)
  const [filter, setFilter] = useState(false)
  const [date, setDate] = useState("2026-10-03")
  const [range, setRange] = useState({ start: "2026-09-26", end: "2026-10-02" })
  return <BrowserRouter><main>
    <UI.Dropzone label="Choose creative" accept="image/*,application/pdf" onFiles={setFiles} />
    <output aria-label="Chosen files">{files.map(file => file.name).join(", ")}</output>
    <UI.Dropzone label="Disabled upload" disabled onFiles={setFiles} />
    <UI.FilePreview name="Brief.pdf" mediaType="document" onRemove={() => setFiles([])} />
    <UI.UploadProgress name="Creative.png" value={40} />
    <UI.AccountSwitcher value={account} onChange={setAccount} accounts={[{id:"kindred",name:"Kindred",source:"Sample account"},{id:"upload",name:"Personal",source:"Local uploads"}]} />
    <output aria-label="Selected account">{account}</output>
    <UI.CalendarDatePicker label="Schedule for" value={date} onValueChange={setDate} />
    <output aria-label="Selected date">{date}</output>
    <UI.CalendarDateRangePicker label="Performance window" start={range.start} end={range.end} onRangeChange={(start, end) => setRange({ start, end })} />
    <output aria-label="Selected range">{range.start}/{range.end}</output>
    <UI.FilterBar label="Ad filters"><UI.FilterPopover label="Filter ads"><UI.Checkbox label="Active only" checked={filter} onChange={event=>setFilter(event.target.checked)} /></UI.FilterPopover><UI.SortSelect value={sort} onChange={setSort} options={[{value:"name",label:"Name"},{value:"recent",label:"Recent"}]} /></UI.FilterBar>
    <UI.ResponsiveFilterTask triggerLabel="More filters" title="Filter creative" description="Choose the records shown below."><UI.Checkbox label="Ready only" checked={filter} onChange={event=>setFilter(event.target.checked)} /></UI.ResponsiveFilterTask>
    <UI.ComparisonMatrix label="Creative comparison" columns={[{id:"one",header:"Evening reset"},{id:"two",header:"Serum proof"}]} rows={[{id:"hook",label:"Hook",values:["Routine","Product"]},{id:"results",label:"Results",values:["63","41"]}]} />
    <output aria-label="Sort value">{sort}</output>
    <UI.DataTable label="Creative records" rows={[{id:"one",name:"Evening reset"}]} getRowId={row=>row.id} getRowLabel={row=>row.name} columns={[{id:"name",label:"Ad",render:row=>row.name,sortable:true}]} sort={{column:"name",direction:sort === "descending" ? "descending" : "ascending"}} onSort={(_,direction)=>setSort(direction)} selectedIds={selected} onSelectionChange={setSelected} />
    <output aria-label="Selected rows">{selected.join(",")}</output>
    <UI.CreativeCard title="Evening reset" href="/ads/one" src="/brand/kindred-campaign-hands.png" alt="Hands applying skincare" aspectRatio="1 / 1" source="Sample account" selected={selected.includes("one")} onSelect={checked=>setSelected(checked?["one"]:[])}><UI.MetricCell label="Results" missingReason="No delivery data" /></UI.CreativeCard>
    <UI.ShotStrip shots={[{id:"opening",time:0,label:"Opening"},{id:"proof",time:7,label:"Product proof"}]} selectedId={time === 0 ? "opening" : "proof"} onSelect={shot=>setTime(shot.time)} />
    <UI.Transcript segments={[{id:"line",time:7,text:"A calmer evening routine"}]} currentTime={time} onSeek={setTime} />
    <UI.ActivityTimeline items={[{id:"version",label:"Version saved",detail:"Offer corrected",dateTime:"2026-10-03T10:00:00Z",timeLabel:"3 Oct",href:"/ads/one#version"}]} />
    <output aria-label="Selected time">{time}</output>
    <UI.PageTabs label="Views" queryParam="view" items={[{value:"ads",label:"Ads"},{value:"groups",label:"Groups"}]} />
  </main></BrowserRouter>
}

if (required.every(name => name in UI)) createRoot(document.getElementById("root")!).render(<Fixture />)

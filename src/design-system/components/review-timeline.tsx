import type { ReactNode } from "react"

function timeLabel(seconds: number) { return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}` }
export interface Shot { id: string; time: number; endTime?: number; label: string; thumbnail?: string }
export interface ShotStripProps { shots: readonly Shot[]; selectedId?: string; onSelect: (shot: Shot) => void; label?: string }
export function ShotStrip({ shots, selectedId, onSelect, label = "Shots" }: ShotStripProps) {
  return <div className="bf-shot-strip" role="group" aria-label={label}>{shots.length ? shots.map(shot=><button key={shot.id} type="button" aria-pressed={shot.id===selectedId} onClick={()=>onSelect(shot)}>{shot.thumbnail ? <img src={shot.thumbnail} alt="" /> : null}<span><time>{timeLabel(shot.time)}{shot.endTime !== undefined ? `–${timeLabel(shot.endTime)}` : ""}</time>{shot.label}</span></button>) : <p>No shots available</p>}</div>
}

export interface TranscriptSegment { id: string; time: number; text: string }
export interface TranscriptProps { segments: readonly TranscriptSegment[]; currentTime?: number; onSeek?: (time: number) => void; label?: string }
export function Transcript({ segments, currentTime, onSeek, label = "Transcript" }: TranscriptProps) {
  const active = currentTime === undefined ? undefined : [...segments].reverse().find(segment=>segment.time <= currentTime)?.id
  return <section className="bf-transcript" aria-label={label}>{segments.length ? <ol>{segments.map(segment=><li key={segment.id} aria-current={segment.id===active ? "true" : undefined}>{onSeek ? <button type="button" onClick={()=>onSeek(segment.time)}><time>{timeLabel(segment.time)}</time> {segment.text}</button> : <p><time>{timeLabel(segment.time)}</time> {segment.text}</p>}</li>)}</ol> : <p>No transcript available</p>}</section>
}

export interface ActivityItem { id: string; label: string; detail?: ReactNode; dateTime: string; timeLabel: string; href?: string }
export interface ActivityTimelineProps { items: readonly ActivityItem[]; label?: string }
export function ActivityTimeline({ items, label = "Activity" }: ActivityTimelineProps) {
  return <section className="bf-activity-timeline" aria-label={label}>{items.length ? <ol>{items.map(item=><li key={item.id}><time dateTime={item.dateTime}>{item.timeLabel}</time><div>{item.href ? <a href={item.href}>{item.label}</a> : <strong>{item.label}</strong>}{item.detail ? <p>{item.detail}</p> : null}</div></li>)}</ol> : <p>No activity yet</p>}</section>
}

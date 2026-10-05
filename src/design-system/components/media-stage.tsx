import { Pause, Play } from "lucide-react"
import { type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface MediaStageProps {
  src: string
  alt: string
  mediaType?: "image" | "video"
  poster?: string
  aspectRatio?: `${number} / ${number}`
  currentTime?: number
  duration?: number
  playing?: boolean
  onPlayToggle?: () => void
  footer?: ReactNode
  className?: string
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function MediaStage({ src, alt, mediaType = "image", poster, aspectRatio = "9 / 16", currentTime = 0, duration, playing = false, onPlayToggle, footer, className }: MediaStageProps) {
  const style = { "--media-aspect-ratio": aspectRatio } as CSSProperties
  return (
    <figure className={cn("bf-media", className)} style={style}>
      <div className="bf-media__stage">
        {mediaType === "video" ? (
          <video className="bf-media__asset" src={src} poster={poster} aria-label={alt} controls={!onPlayToggle} playsInline preload="metadata" />
        ) : (
          <img className="bf-media__asset" src={src} alt={alt} width={Number(aspectRatio.split("/")[0])} height={Number(aspectRatio.split("/")[1])} />
        )}
        {onPlayToggle ? (
          <button type="button" className="bf-media__play" aria-label={playing ? "Pause creative" : "Play creative"} onClick={onPlayToggle}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
        ) : null}
        {duration !== undefined ? <span className="bf-media__time">{formatTime(currentTime)} / {formatTime(duration)}</span> : null}
      </div>
      {footer ? <figcaption className="bf-media__footer">{footer}</figcaption> : null}
    </figure>
  )
}

/**
 * Timeline Playback - Slider and Play controls for Hospital Operations.
 * Replays room status changes over time.
 */
import { useEffect, useRef } from 'react'

export default function TimelinePlayback({
  times,
  selectedTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  onBackToLive,
  playbackIntervalMs = 2000,
  isLive = false,
  compact = false,
}) {
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!isPlaying || !times.length || isLive) return
    intervalRef.current = setInterval(() => {
      const idx = times.indexOf(selectedTime)
      const nextIdx = idx < times.length - 1 ? idx + 1 : 0
      onTimeChange(times[nextIdx])
    }, playbackIntervalMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, selectedTime, times, onTimeChange, playbackIntervalMs, isLive])

  const currentIndex = times.indexOf(selectedTime)
  const sliderValue = currentIndex >= 0 ? currentIndex : 0

  return (
    <div className={`rounded-lg border border-white/10 bg-slate-800/60 px-4 py-4 space-y-3 ${compact ? 'py-3' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {compact ? 'Timeline' : 'Hospital Operations Timeline'}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">
            <strong className={isLive ? 'text-emerald-400' : 'text-white'}>{isLive ? 'Live' : selectedTime}</strong>
          </span>
          {!compact && !isLive && onBackToLive && (
            <button
              type="button"
              onClick={onBackToLive}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600/80 border border-emerald-500/50 text-white hover:bg-emerald-600 transition-colors"
            >
              <span>●</span> Live
            </button>
          )}
          {!compact && (
          <button
            type="button"
            onClick={onPlayPause}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-500/30 border border-amber-500/50 text-amber-200 hover:bg-amber-500/40'
                : 'bg-emerald-600/80 border border-emerald-500/50 text-white hover:bg-emerald-600'
            }`}
          >
            {isPlaying ? (
              <>
                <span>⏸</span> Pause
              </>
            ) : (
              <>
                <span>▶</span> Play Timeline
              </>
            )}
          </button>
          )}
        </div>
      </div>
      {!compact && (
      <>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 w-10 shrink-0">{times[0]}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, times.length - 1)}
            value={sliderValue}
            onChange={(e) => onTimeChange(times[Number(e.target.value)])}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
          <span className="text-xs text-slate-500 w-10 shrink-0 text-right">{times[times.length - 1]}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500 px-1">
          {times.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </>
      )}
    </div>
  )
}

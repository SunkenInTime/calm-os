import { useEffect, useState, type CSSProperties } from 'react'
import { useMutation } from 'convex/react'
import { Check, Pause, Square } from 'lucide-react'
import { api } from '../convex/_generated/api'
import {
  DEFAULT_SESSION_EXTENSION_MINUTES,
  getProgressRatio,
  getRemainingWholeMinutes,
  useFocusBlockSession,
} from './lib/focusBlockSession'
import type { TaskId } from './lib/domain'

type AppRegionStyle = CSSProperties & { WebkitAppRegion: 'drag' | 'no-drag' }
const dragRegionStyle: AppRegionStyle = { WebkitAppRegion: 'drag' }
const noDragRegionStyle: AppRegionStyle = { WebkitAppRegion: 'no-drag' }

function FocusBlockOverlay() {
  const { session, stop, closeComplete, extendByMinutes } = useFocusBlockSession()
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const [now, setNow] = useState(() => Date.now())
  const [isHovered, setIsHovered] = useState(false)

  async function handleMarkTaskDone() {
    try {
      if (session.status === 'complete' && session.commitmentId) {
        await markTaskDone({ taskId: session.commitmentId as TaskId })
      }
    } catch {
      // Always allow closing the container even if completion fails transiently.
    } finally {
      await closeComplete()
    }
  }

  async function handleCloseComplete() {
    await closeComplete()
  }

  useEffect(() => {
    if (session.status !== 'running') {
      return
    }
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 250)
    return () => window.clearInterval(timer)
  }, [session.status])

  if (session.status === 'running') {
    const remainingMinutes = getRemainingWholeMinutes(session, now)
    const progress = getProgressRatio(session, now)
    const ringSize = 112
    const ringStroke = 8
    const ringRadius = (ringSize - ringStroke) / 2
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringOffset = ringCircumference * (1 - progress)

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent p-2">
        <div
          style={dragRegionStyle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative flex h-32 w-32 items-center justify-center rounded-[34px] bg-white/92 shadow-xl ring-1 ring-slate-900/6 backdrop-blur-sm"
        >
          <svg
            className="-rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            aria-hidden
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="hsl(226 40% 82% / 0.22)"
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="hsl(235 82% 65%)"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 240ms linear' }}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <p
              className={`text-lg font-medium tracking-tight text-slate-700 transition-all duration-200 ${
                isHovered ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
              }`}
            >
              {remainingMinutes}m
            </p>
            <div
              className={`absolute flex items-center gap-2 transition-all duration-200 ${
                isHovered
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-1 opacity-0'
              }`}
            >
              <button
                type="button"
                style={noDragRegionStyle}
                onClick={() => void stop()}
                aria-label="Pause focus session"
                title="Pause"
                className="focus-widget-control-btn"
              >
                <Pause size={14} />
              </button>
              <button
                type="button"
                onClick={() => void stop()}
                style={noDragRegionStyle}
                aria-label="Stop focus session"
                title="Stop"
                className="focus-widget-control-btn"
              >
                <Square size={13} className="fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (session.status === 'complete') {
    const ringSize = 78
    const ringStroke = 7
    const ringRadius = (ringSize - ringStroke) / 2
    const ringCircumference = 2 * Math.PI * ringRadius

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent p-2">
        <div
          style={dragRegionStyle}
          className="focus-complete-shell w-full rounded-3xl border border-indigo-100 bg-white/95 px-4 py-3 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3" style={dragRegionStyle}>
            <div className="relative shrink-0">
              <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden>
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke="hsl(226 40% 82% / 0.2)"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke="hsl(235 80% 66%)"
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={0}
                  className="focus-complete-ring"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <Check size={24} strokeWidth={2.3} className="focus-complete-check" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Session complete.</p>
              <p className="truncate text-xs text-slate-500">{session.commitmentTitle}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleMarkTaskDone()}
              style={noDragRegionStyle}
              className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Mark task done
            </button>
            <button
              type="button"
              onClick={() => void handleCloseComplete()}
              style={noDragRegionStyle}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Close session
            </button>
            <button
              type="button"
              onClick={() => void extendByMinutes(DEFAULT_SESSION_EXTENSION_MINUTES)}
              style={noDragRegionStyle}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-indigo-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            >
              +15m
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <div className="h-screen w-screen bg-transparent" />
}

export default FocusBlockOverlay

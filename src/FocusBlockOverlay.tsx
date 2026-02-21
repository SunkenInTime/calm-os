import { useEffect, useState, type CSSProperties } from 'react'
import { formatMmSs, getRemainingMs, useFocusBlockSession } from './lib/focusBlockSession'

type AppRegionStyle = CSSProperties & { WebkitAppRegion: 'drag' | 'no-drag' }
const dragRegionStyle: AppRegionStyle = { WebkitAppRegion: 'drag' }
const noDragRegionStyle: AppRegionStyle = { WebkitAppRegion: 'no-drag' }

function FocusBlockOverlay() {
  const { session, stop, continueBlock, closeComplete } = useFocusBlockSession()
  const [now, setNow] = useState(() => Date.now())

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
    const remaining = formatMmSs(getRemainingMs(session, now))
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent p-2">
        <div
          style={dragRegionStyle}
          className="flex w-full items-center justify-between rounded-full border border-indigo-200 bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-900/5"
        >
          <p className="min-w-0 truncate text-xs font-medium text-slate-700">
            Focus: {session.commitmentTitle} • {remaining}
          </p>
          <button
            type="button"
            onClick={() => void stop()}
            style={noDragRegionStyle}
            className="ml-2 shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
          >
            Stop
          </button>
        </div>
      </div>
    )
  }

  if (session.status === 'complete') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent p-2">
        <div
          style={dragRegionStyle}
          className="flex w-full items-center justify-between rounded-full border border-indigo-200 bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-900/5"
        >
          <p className="min-w-0 truncate text-xs font-medium text-slate-700">
            Focus block complete.
          </p>
          <div className="ml-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void continueBlock()}
              style={noDragRegionStyle}
              className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => void closeComplete()}
              style={noDragRegionStyle}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <div className="h-screen w-screen bg-transparent" />
}

export default FocusBlockOverlay

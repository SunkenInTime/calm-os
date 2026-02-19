import { useEffect, useState } from 'react'

export const FOCUS_BLOCK_DURATION_MS = 25 * 60 * 1000

export type FocusBlockStatus = 'idle' | 'running' | 'complete'

export type FocusBlockSession = {
  status: FocusBlockStatus
  commitmentId: string | null
  commitmentTitle: string | null
  startedAt: number | null
  endsAt: number | null
}

export type FocusStartPayload = {
  source: 'commitment-card'
  commitmentId: string
  commitmentTitle: string
}

const IDLE_SESSION: FocusBlockSession = {
  status: 'idle',
  commitmentId: null,
  commitmentTitle: null,
  startedAt: null,
  endsAt: null,
}

function normalizeSession(value: unknown): FocusBlockSession {
  if (!value || typeof value !== 'object') {
    return IDLE_SESSION
  }

  const candidate = value as Partial<FocusBlockSession>
  const status =
    candidate.status === 'running' || candidate.status === 'complete' ? candidate.status : 'idle'

  return {
    status,
    commitmentId: typeof candidate.commitmentId === 'string' ? candidate.commitmentId : null,
    commitmentTitle: typeof candidate.commitmentTitle === 'string' ? candidate.commitmentTitle : null,
    startedAt: typeof candidate.startedAt === 'number' ? candidate.startedAt : null,
    endsAt: typeof candidate.endsAt === 'number' ? candidate.endsAt : null,
  }
}

export function getRemainingMs(session: FocusBlockSession, now: number) {
  if (session.status !== 'running' || typeof session.endsAt !== 'number') {
    return 0
  }
  return Math.max(0, session.endsAt - now)
}

export function formatMmSs(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useFocusBlockSession() {
  const [session, setSession] = useState<FocusBlockSession>(IDLE_SESSION)

  useEffect(() => {
    let isMounted = true

    const listener = (_event: unknown, nextSession: unknown) => {
      if (!isMounted) return
      setSession(normalizeSession(nextSession))
    }

    window.ipcRenderer?.on?.('focus:state', listener)

    void window.ipcRenderer?.invoke?.('focus:get-state').then((nextSession: unknown) => {
      if (!isMounted) return
      setSession(normalizeSession(nextSession))
    })

    return () => {
      isMounted = false
      window.ipcRenderer?.off?.('focus:state', listener)
    }
  }, [])

  return {
    session,
    stop: () => window.ipcRenderer?.invoke?.('focus:stop'),
    continueBlock: () => window.ipcRenderer?.invoke?.('focus:continue'),
    closeComplete: () => window.ipcRenderer?.invoke?.('focus:close-complete'),
  }
}

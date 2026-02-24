import { useEffect, useState } from 'react'

export const DEFAULT_SESSION_LENGTH_MINUTES = 25
export const DEFAULT_SESSION_EXTENSION_MINUTES = 15

export type FocusBlockStatus = 'idle' | 'running' | 'complete'

export type FocusBlockSession = {
  status: FocusBlockStatus
  commitmentId: string | null
  commitmentTitle: string | null
  sessionLengthMinutes: number | null
  startedAt: number | null
  endsAt: number | null
}

export type FocusStartPayload = {
  source: 'commitment-card'
  commitmentId: string
  commitmentTitle: string
  sessionLengthMinutes: number
}

const IDLE_SESSION: FocusBlockSession = {
  status: 'idle',
  commitmentId: null,
  commitmentTitle: null,
  sessionLengthMinutes: null,
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
    sessionLengthMinutes:
      typeof candidate.sessionLengthMinutes === 'number' ? candidate.sessionLengthMinutes : null,
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

export function getRemainingWholeMinutes(session: FocusBlockSession, now: number) {
  return Math.max(0, Math.ceil(getRemainingMs(session, now) / 60000))
}

export function getProgressRatio(session: FocusBlockSession, now: number) {
  if (session.status === 'complete') {
    return 1
  }

  if (
    session.status !== 'running' ||
    typeof session.startedAt !== 'number' ||
    typeof session.endsAt !== 'number'
  ) {
    return 0
  }

  const total = session.endsAt - session.startedAt
  if (total <= 0) {
    return 0
  }

  const elapsed = now - session.startedAt
  return Math.max(0, Math.min(1, elapsed / total))
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
    extendByMinutes: (minutes = DEFAULT_SESSION_EXTENSION_MINUTES) =>
      window.ipcRenderer?.invoke?.('focus:extend', { minutes }),
  }
}

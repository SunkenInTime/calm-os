import { FormEvent, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Ellipsis, Link2, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { toLocalDateKey } from '../../lib/date'
import type { IdeaDoc } from '../../lib/domain'

function IdeasSidebar() {
  const ideas = useQuery(api.ideas.listIdeas) as IdeaDoc[] | undefined
  const createIdea = useMutation(api.ideas.createIdea)
  const createTask = useMutation(api.tasks.createTask)
  const archiveIdea = useMutation(api.ideas.archiveIdea)

  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openIdeaId, setOpenIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [openMenuIdeaId, setOpenMenuIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [pendingScheduleIdeaId, setPendingScheduleIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [pendingActionIdeaId, setPendingActionIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [exitingIdeaIds, setExitingIdeaIds] = useState<Record<string, true>>({})
  const [toastMessage, setToastMessage] = useState('')
  const asideRef = useRef<HTMLElement>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      setIsSubmitting(true)
      await createIdea({ title: trimmed })
      setTitle('')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!asideRef.current?.contains(event.target as Node)) {
        setOpenIdeaId(null)
        setOpenMenuIdeaId(null)
        setPendingScheduleIdeaId(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  function showToast(message: string) {
    setToastMessage(message)
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('')
      toastTimeoutRef.current = null
    }, 1800)
  }

  async function archiveWithFade(ideaId: IdeaDoc['_id']) {
    setExitingIdeaIds((prev) => ({ ...prev, [ideaId]: true }))
    await new Promise((resolve) => {
      window.setTimeout(resolve, 180)
    })
    await archiveIdea({ ideaId })
  }

  async function handleArchive(ideaId: IdeaDoc['_id']) {
    try {
      setPendingActionIdeaId(ideaId)
      setOpenIdeaId((current) => (current === ideaId ? null : current))
      setOpenMenuIdeaId((current) => (current === ideaId ? null : current))
      setPendingScheduleIdeaId((current) => (current === ideaId ? null : current))
      await archiveWithFade(ideaId)
    } finally {
      setPendingActionIdeaId((current) => (current === ideaId ? null : current))
      setExitingIdeaIds((prev) => {
        const next = { ...prev }
        delete next[ideaId]
        return next
      })
    }
  }

  async function handlePromote(idea: IdeaDoc, scheduleForToday: boolean) {
    const dueDate = scheduleForToday ? toLocalDateKey(new Date()) : null
    try {
      setPendingActionIdeaId(idea._id)
      await createTask({ title: idea.title, dueDate })
      await archiveWithFade(idea._id)
      setOpenIdeaId(null)
      setOpenMenuIdeaId(null)
      setPendingScheduleIdeaId(null)
      showToast('Idea promoted to task.')
    } finally {
      setPendingActionIdeaId((current) => (current === idea._id ? null : current))
      setExitingIdeaIds((prev) => {
        const next = { ...prev }
        delete next[idea._id]
        return next
      })
    }
  }

  function handleIdeaClick(ideaId: IdeaDoc['_id']) {
    if (pendingActionIdeaId) {
      return
    }
    setOpenIdeaId((current) => (current === ideaId ? null : ideaId))
    setOpenMenuIdeaId(null)
    setPendingScheduleIdeaId(null)
  }

  function handleOpenReference(event: ReactMouseEvent<HTMLButtonElement>, url: string) {
    event.stopPropagation()
    void window.ipcRenderer?.invoke?.('shell:open-external-url', url)
  }

  return (
    <aside
      ref={asideRef}
      className="relative flex min-h-0 w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 px-4 py-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Ideas</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-400">
          {ideas?.length ?? 0}
        </span>
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add idea..."
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="shrink-0 rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <Plus size={13} />
        </button>
      </form>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {!ideas ? (
          <p className="p-2 text-xs text-slate-400">Loading...</p>
        ) : ideas.length === 0 ? (
          <p className="p-2 text-xs text-slate-400">No ideas yet.</p>
        ) : (
          <div className="space-y-1">
            {ideas.map((idea) => {
              const isPopoverOpen = openIdeaId === idea._id
              const isMenuOpen = openMenuIdeaId === idea._id
              const isScheduling = pendingScheduleIdeaId === idea._id
              const isBusy = pendingActionIdeaId === idea._id
              const isExiting = Boolean(exitingIdeaIds[idea._id])

              return (
                <div key={idea._id} className={`idea-item-wrap ${isExiting ? 'idea-exiting' : ''}`}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleIdeaClick(idea._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleIdeaClick(idea._id)
                      }
                    }}
                    className="group flex w-full items-center gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-left shadow-sm transition-colors hover:border-slate-200"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{idea.title}</span>
                    {idea.referenceUrl && (
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        <Link2 size={11} />
                      </span>
                    )}
                    <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenMenuIdeaId((current) => (current === idea._id ? null : idea._id))
                          setOpenIdeaId(idea._id)
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Idea actions"
                      >
                        <Ellipsis size={13} />
                      </button>
                    </span>
                  </div>

                  {isMenuOpen && (
                    <div className="mt-1 rounded-md border border-slate-200 bg-white p-1 text-xs shadow-sm">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setOpenIdeaId(idea._id)
                          setPendingScheduleIdeaId(idea._id)
                          setOpenMenuIdeaId(null)
                        }}
                        className="block w-full rounded px-2 py-1 text-left text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Promote to task
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleArchive(idea._id)}
                        className="block w-full rounded px-2 py-1 text-left text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleArchive(idea._id)}
                        className="block w-full rounded px-2 py-1 text-left text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Drop
                      </button>
                    </div>
                  )}

                  {isPopoverOpen && (
                    <div className="mt-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                      <p className="text-xs font-medium text-slate-700">{idea.title}</p>
                      {idea.referenceUrl && (
                        <button
                          type="button"
                          onClick={(event) => handleOpenReference(event, idea.referenceUrl!)}
                          className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Link2 size={11} />
                          Open reference
                        </button>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setPendingScheduleIdeaId(idea._id)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Promote to task
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleArchive(idea._id)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleArchive(idea._id)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Drop
                        </button>
                      </div>

                      {isScheduling && (
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                          <p className="text-[11px] text-slate-600">Schedule for today?</p>
                          <div className="mt-1.5 flex gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handlePromote(idea, true)}
                              className="rounded bg-slate-700 px-2 py-1 text-[11px] text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handlePromote(idea, false)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {toastMessage && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
          {toastMessage}
        </div>
      )}
    </aside>
  )
}

export default IdeasSidebar

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Lightbulb, Link, ListChecks, X } from 'lucide-react'
import { api } from '../convex/_generated/api'
import { parseDateAlias, stripAlias } from './lib/dateAliases'
import { formatDateKey } from './lib/date'

type QuickAddMode = 'idea' | 'task'

function toReferenceUrl(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function QuickAddOverlay() {
  const createTask = useMutation(api.tasks.createTask)
  const createIdea = useMutation(api.ideas.createIdea)
  const [mode, setMode] = useState<QuickAddMode>('task')
  const [title, setTitle] = useState('')
  const [resolvedDate, setResolvedDate] = useState<string | null>(null)
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setMode('task')
    setTitle('')
    setResolvedDate(null)
    setReferenceUrl(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  useEffect(() => {
    resetState()
    window.addEventListener('focus', resetState)
    return () => window.removeEventListener('focus', resetState)
  }, [resetState])

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        window.ipcRenderer?.send?.('quick-add:close')
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  useEffect(() => {
    if (mode === 'task') {
      const alias = parseDateAlias(title)
      if (alias) {
        setResolvedDate(alias.dateKey)
      } else {
        setResolvedDate(null)
      }
    } else {
      setResolvedDate(null)
    }
  }, [title, mode])

  useEffect(() => {
    async function readClipboardReference() {
      if (mode !== 'idea') {
        setReferenceUrl(null)
        return
      }

      try {
        const clipboardText = await window.ipcRenderer?.invoke?.('quick-add:read-clipboard-text')
        const nextReferenceUrl = toReferenceUrl(typeof clipboardText === 'string' ? clipboardText : null)
        setReferenceUrl(nextReferenceUrl)
      } catch {
        setReferenceUrl(null)
      }
    }

    void readClipboardReference()
  }, [mode])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setMode((prev) => (prev === 'idea' ? 'task' : 'idea'))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    try {
      setIsSubmitting(true)
      if (mode === 'task') {
        const alias = parseDateAlias(trimmed)
        const cleanTitle = alias ? stripAlias(trimmed, alias) : trimmed
        const submitDueDate = alias ? alias.dateKey : resolvedDate
        await createTask({ title: cleanTitle, dueDate: submitDueDate })
      } else {
        await createIdea({ title: trimmed, referenceUrl: referenceUrl ?? undefined })
      }
      setTitle('')
      setResolvedDate(null)
      setReferenceUrl(null)
      window.ipcRenderer?.send?.('quick-add:close')
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearDate() {
    setResolvedDate(null)
    const alias = parseDateAlias(title)
    if (alias) {
      setTitle(stripAlias(title, alias))
    }
    inputRef.current?.focus()
  }

  const dateLabel = resolvedDate ? formatDateKey(resolvedDate) : null

  return (
    <div className="flex h-screen w-screen items-center justify-center px-6" style={{ background: 'transparent' }}>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[920px] items-center rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5"
      >
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'idea' ? 'task' : 'idea'))}
          className={`ml-3 flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-base font-medium transition-colors select-none ${mode === 'task'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700'
            }`}
          tabIndex={-1}
        >
          {mode === 'task' ? <ListChecks size={18} /> : <Lightbulb size={18} />}
          {mode === 'task' ? 'Task' : 'Idea'}
        </button>

        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'task'
              ? 'Add a task... (TD, TM, MON-SUN for date)'
              : 'Capture an idea...'
          }
          className="min-w-0 flex-1 bg-transparent px-5 py-5 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none"
          autoFocus
        />

        {mode === 'task' && dateLabel && (
          <span className="mr-3 flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700">
            {dateLabel}
            <button
              type="button"
              onClick={clearDate}
              className="rounded-full p-0.5 hover:bg-indigo-200"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          </span>
        )}

        {mode === 'idea' && referenceUrl && (
          <span className="mr-3 flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            <Link size={13} />
            <span className="max-w-[260px] truncate">{referenceUrl}</span>
            <button
              type="button"
              onClick={() => setReferenceUrl(null)}
              className="rounded-full p-0.5 hover:bg-slate-200"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          </span>
        )}
      </form>
    </div>
  )
}

export default QuickAddOverlay

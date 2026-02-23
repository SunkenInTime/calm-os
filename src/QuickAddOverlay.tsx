import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { Lightbulb, Link, ListChecks, X } from 'lucide-react'
import { api } from '../convex/_generated/api'
import { findDateAliasMatches, parseDateAlias, stripAlias } from './lib/dateAliases'
import { formatDateKey } from './lib/date'
import AnimatedCaretInput from './components/AnimatedCaretInput'

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
  const [tabSwitchDirection, setTabSwitchDirection] = useState<'toTask' | 'toIdea' | null>(null)
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
    if (!tabSwitchDirection) {
      return
    }

    const timeout = window.setTimeout(() => {
      setTabSwitchDirection(null)
    }, 260)

    return () => window.clearTimeout(timeout)
  }, [tabSwitchDirection])

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
      setMode((prev) => {
        const nextMode = prev === 'idea' ? 'task' : 'idea'
        setTabSwitchDirection(nextMode === 'idea' ? 'toIdea' : 'toTask')
        return nextMode
      })
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
  const renderOverlayText = useCallback(
    (text: string) => {
      if (mode !== 'task' || text.length === 0) {
        return text
      }

      const aliasMatches = findDateAliasMatches(text)
      if (aliasMatches.length === 0) {
        return text
      }

      const nodes: React.ReactNode[] = []
      let cursor = 0

      aliasMatches.forEach((match, index) => {
        if (match.startIndex > cursor) {
          nodes.push(
            <span key={`plain-${index}-${cursor}`}>
              {text.slice(cursor, match.startIndex)}
            </span>,
          )
        }

        nodes.push(
          <span key={`alias-${index}-${match.startIndex}`} className="quick-add-keyword-highlight">
            {text.slice(match.startIndex, match.endIndex)}
          </span>,
        )
        cursor = match.endIndex
      })

      if (cursor < text.length) {
        nodes.push(<span key={`plain-tail-${cursor}`}>{text.slice(cursor)}</span>)
      }

      return nodes
    },
    [mode],
  )

  return (
    <div className="flex h-screen w-screen items-center justify-center px-6" style={{ background: 'transparent' }}>
      <form
        onSubmit={handleSubmit}
        className={[
          'flex h-14 w-full max-w-[736px] items-center gap-2.5 rounded-[9px] bg-white p-2.5 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25),0_16px_40px_-28px_rgba(15,23,42,0.95)] ring-1 ring-slate-300/80',
          tabSwitchDirection === 'toIdea' && 'quick-add-tab-switch quick-add-tab-switch--idea',
          tabSwitchDirection === 'toTask' && 'quick-add-tab-switch quick-add-tab-switch--task',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'idea' ? 'task' : 'idea'))}
          className="input-affordance flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[#4f39f6] text-white shadow-[0_4px_10px_-4px_rgba(79,57,246,0.9)] transition-colors hover:bg-[#432edf] disabled:cursor-not-allowed disabled:opacity-70"
          tabIndex={-1}
          disabled={isSubmitting}
          aria-label={mode === 'task' ? 'Switch to idea mode' : 'Switch to task mode'}
        >
          {mode === 'task' ? <ListChecks size={18} strokeWidth={2.25} /> : <Lightbulb size={18} strokeWidth={2.25} />}
        </button>

        <AnimatedCaretInput
          inputRef={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'task'
              ? 'Add a task (for example: Follow up with Alex tomorrow)'
              : 'Capture an idea (Tab switches back to tasks)'
          }
          className="min-w-0 flex-1"
          inputClassName="w-full bg-transparent px-0 py-0 text-[18px] leading-[1.2] text-slate-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          textClassName="px-0 py-0 text-[18px] leading-[1.2] text-slate-900"
          placeholderClassName="quick-add-placeholder-hint"
          renderOverlayText={renderOverlayText}
          autoFocus
          disabled={isSubmitting}
        />

        {mode === 'task' && dateLabel && (
          <span className="mr-0.5 flex shrink-0 items-center gap-1 text-xs font-medium text-[#4f39f6]">
            <span>{dateLabel}</span>
            <button
              type="button"
              onClick={clearDate}
              className="input-affordance rounded-sm p-0.5 text-[#4f39f6] transition-colors hover:bg-[#ede9ff]"
              tabIndex={-1}
              aria-label="Clear due date"
            >
              <X size={13} />
            </button>
          </span>
        )}

        {mode === 'idea' && referenceUrl && (
          <button
            type="button"
            onClick={() => setReferenceUrl(null)}
            className="input-affordance group relative flex size-6 shrink-0 items-center justify-center rounded-sm text-[#4f39f6] transition-colors hover:bg-slate-100"
            tabIndex={-1}
            aria-label="Remove link from clipboard"
            title={referenceUrl}
          >
            <span className="flex items-center justify-center transition-opacity group-hover:opacity-0">
              <Link size={18} />
            </span>
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <X size={18} />
            </span>
          </button>
        )}
      </form>
    </div>
  )
}

export default QuickAddOverlay

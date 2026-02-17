import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import type React from 'react'

type QuickAddMode = 'task' | 'idea'

function QuickAddOverlay() {
  const createTask = useMutation(api.tasks.createTask)
  const createIdea = useMutation(api.ideas.createIdea)
  const [mode, setMode] = useState<QuickAddMode>('task')
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusInput() {
      setMode('task')
      setTitle('')
      setSubmitError('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        window.ipcRenderer?.send?.('quick-add:close')
      }
    }

    focusInput()
    window.addEventListener('focus', focusInput)
    window.addEventListener('keydown', onEscape)

    return () => {
      window.removeEventListener('focus', focusInput)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setSubmitError('Title is required.')
      return
    }

    try {
      setIsSubmitting(true)
      if (mode === 'task') {
        await createTask({
          title: trimmedTitle,
          dueDate: null,
        })
      } else {
        await createIdea({
          title: trimmedTitle,
        })
      }
      setTitle('')
      window.ipcRenderer?.send?.('quick-add:close')
    } catch {
      setSubmitError(`Could not create ${mode} right now.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setMode((current) => (current === 'task' ? 'idea' : 'task'))
    }
  }

  const placeholder = mode === 'task' ? 'Add task...' : 'Capture idea...'
  const modeLabel = mode === 'task' ? 'Task' : 'Idea'

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950/95 p-3">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-neutral-700/80 bg-neutral-900 p-3 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
            {modeLabel}
          </span>
          <input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-800 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-xs text-neutral-500">
          <span>Tab to toggle Task/Idea</span>
          <span>Esc to close</span>
        </div>
        {submitError && <p className="mt-2 px-1 text-sm text-neutral-400">{submitError}</p>}
        <button type="submit" disabled={isSubmitting} className="hidden">
          Add
        </button>
      </form>
    </div>
  )
}

export default QuickAddOverlay

import { FormEvent, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import SmartTaskInput from './SmartTaskInput'
import { useSmartTaskInput } from '../../lib/useSmartTaskInput'

type TaskComposerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, dueDate: string | null) => Promise<void>
}

function TaskComposerModal({ isOpen, onClose, onSubmit }: TaskComposerModalProps) {
  const { title, setTitle, resolvedDate, setResolvedDate, getCleanTitle, reset } =
    useSmartTaskInput()
  const inputRef = useRef<HTMLInputElement>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      reset()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = getCleanTitle()
    if (!cleanTitle || isSubmittingRef.current) return
    try {
      isSubmittingRef.current = true
      await onSubmit(cleanTitle, resolvedDate)
      onClose()
    } catch {
      // silently handled
    } finally {
      isSubmittingRef.current = false
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-slate-800">Add Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-3">
          <SmartTaskInput
            value={title}
            onChange={setTitle}
            resolvedDate={resolvedDate}
            onResolvedDate={setResolvedDate}
            placeholder="Task title... (try TD, TM, MON-SUN)"
            inputRef={inputRef}
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Type TD for today, TM for tomorrow, or a day name (MON, TUE...) to set the due date inline.
        </p>
      </form>
    </div>
  )
}

export default TaskComposerModal

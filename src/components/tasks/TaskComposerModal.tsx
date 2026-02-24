import { FormEvent, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import SmartTaskInput from './SmartTaskInput'
import { useSmartTaskInput } from '../../lib/useSmartTaskInput'

type TaskComposerModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    title: string,
    dueDate: string | null,
    sessionLengthMinutes: number | null,
  ) => Promise<void>
}

function TaskComposerModal({ isOpen, onClose, onSubmit }: TaskComposerModalProps) {
  const { title, setTitle, resolvedDate, setResolvedDate, getTaskDraft, reset } =
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
    const taskDraft = getTaskDraft()
    if (!taskDraft.title || isSubmittingRef.current) return
    try {
      isSubmittingRef.current = true
      await onSubmit(taskDraft.title, taskDraft.dueDate, taskDraft.sessionLengthMinutes)
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
            placeholder="Task title... (try TD, TM, MON-SUN, or 1h / 45m)"
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
          Add dates inline with TD/TM/day names, and sessions with phrases like "deep work 90m".
        </p>
      </form>
    </div>
  )
}

export default TaskComposerModal

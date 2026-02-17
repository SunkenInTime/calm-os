import { Check, ArrowRight, X } from 'lucide-react'
import type { TaskDoc, TaskId } from '../../lib/domain'
import { formatDueDate } from '../../lib/date'

type DecisionTaskCardProps = {
  task: TaskDoc
  moveDate: string
  onMoveDateChange: (taskId: TaskId, date: string) => void
  onMarkDone: (taskId: TaskId) => Promise<void>
  onMove: (taskId: TaskId, date: string) => Promise<void>
  onDrop: (taskId: TaskId) => Promise<void>
}

function DecisionTaskCard({
  task,
  moveDate,
  onMoveDateChange,
  onMarkDone,
  onMove,
  onDrop,
}: DecisionTaskCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-800">{task.title}</p>
      <p className="mt-0.5 text-xs text-slate-400">
        {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'Unscheduled'}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onMarkDone(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
        >
          <Check size={12} />
          Done
        </button>
        <button
          type="button"
          onClick={() => void onMove(task._id, moveDate)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
        >
          <ArrowRight size={12} />
          Move
        </button>
        <button
          type="button"
          onClick={() => void onDrop(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          <X size={12} />
          Drop
        </button>
        <input
          type="date"
          value={moveDate}
          onChange={(event) => onMoveDateChange(task._id, event.target.value)}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:border-indigo-300 focus:outline-none"
        />
      </div>
    </div>
  )
}

export default DecisionTaskCard

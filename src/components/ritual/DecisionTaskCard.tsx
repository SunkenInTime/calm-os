import { useState } from 'react'
import { Check, ArrowRight, X } from 'lucide-react'
import type { DueLabel } from '../../lib/date'
import type { TaskDoc, TaskId } from '../../lib/domain'
import DueBadge from '../tasks/DueBadge'

type DecisionTaskCardProps = {
  task: TaskDoc
  dueLabel?: DueLabel
  moveDate: string
  onMoveDateChange: (taskId: TaskId, date: string) => void
  onMarkDone: (taskId: TaskId) => Promise<void>
  onMove: (taskId: TaskId, date: string) => Promise<void>
  onDrop: (taskId: TaskId) => Promise<void>
}

function DecisionTaskCard({
  task,
  dueLabel,
  moveDate,
  onMoveDateChange,
  onMarkDone,
  onMove,
  onDrop,
}: DecisionTaskCardProps) {
  const [moveState, setMoveState] = useState<'idle' | 'picking'>('idle')

  function handleMoveClick() {
    if (moveState === 'idle') {
      setMoveState('picking')
    }
  }

  function handleConfirmMove() {
    void onMove(task._id, moveDate)
    setMoveState('idle')
  }

  function handleCancelMove() {
    setMoveState('idle')
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{task.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            You didn't get to this today — what's the state of it?
          </p>
        </div>
        {dueLabel && <DueBadge label={dueLabel} />}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onMarkDone(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Check size={12} />
          I did it
        </button>
        <button
          type="button"
          onClick={handleMoveClick}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
            moveState === 'picking'
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
          }`}
        >
          <ArrowRight size={12} />
          Move it
        </button>
        <button
          type="button"
          onClick={() => void onDrop(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <X size={12} />
          Drop it
        </button>
      </div>

      {moveState === 'picking' && (
        <div className="mt-2.5 flex items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50/50 px-3 py-2">
          <label className="text-xs text-slate-500">Move to:</label>
          <input
            type="date"
            value={moveDate}
            onChange={(event) => onMoveDateChange(task._id, event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-indigo-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleConfirmMove}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Confirm move
          </button>
          <button
            type="button"
            onClick={handleCancelMove}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default DecisionTaskCard

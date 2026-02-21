import { useRef, useState } from 'react'
import { Check, ArrowRight, X, CalendarDays } from 'lucide-react'
import type { DueLabel } from '../../lib/date'
import { formatDateKey } from '../../lib/date'
import type { TaskDoc, TaskId } from '../../lib/domain'
import DueBadge from '../tasks/DueBadge'
import DatePickerPopover from '../tasks/DatePickerPopover'

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
  const [showCalendar, setShowCalendar] = useState(false)
  const dateBtnRef = useRef<HTMLButtonElement>(null)

  function handleMoveClick() {
    if (moveState === 'idle') {
      setMoveState('picking')
    }
  }

  function handleConfirmMove() {
    void onMove(task._id, moveDate)
    setMoveState('idle')
    setShowCalendar(false)
  }

  function handleCancelMove() {
    setMoveState('idle')
    setShowCalendar(false)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{task.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            What's the state of this?
          </p>
        </div>
        {dueLabel === 'Overdue' ? (
          <span className="inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-amber-700">
            OVERDUE
          </span>
        ) : (
          dueLabel && <DueBadge label={dueLabel} />
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void onMarkDone(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-100"
        >
          <Check size={12} />
          Done
        </button>
        <button
          type="button"
          onClick={handleMoveClick}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
            moveState === 'picking'
              ? 'border-slate-300 bg-slate-100 text-slate-700'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
          }`}
        >
          <ArrowRight size={12} />
          Move
        </button>
        <button
          type="button"
          onClick={() => void onDrop(task._id)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-100"
        >
          <X size={12} />
          Drop
        </button>
      </div>

      {moveState === 'picking' && (
        <div className="mt-2.5 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <label className="text-xs text-slate-500">Move to:</label>
          <div className="relative">
            <button
              ref={dateBtnRef}
              type="button"
              onClick={() => setShowCalendar((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs transition-colors ${
                showCalendar
                  ? 'border-indigo-300 text-indigo-600'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <CalendarDays size={12} />
              {formatDateKey(moveDate)}
            </button>
            <DatePickerPopover
              isOpen={showCalendar}
              onClose={() => setShowCalendar(false)}
              onSelect={(dateKey) => onMoveDateChange(task._id, dateKey)}
              selectedDate={moveDate}
              anchorRef={dateBtnRef}
              align="left"
            />
          </div>
          <button
            type="button"
            onClick={handleConfirmMove}
            className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
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

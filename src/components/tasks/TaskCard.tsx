import { useState, type DragEvent } from 'react'
import { Star } from 'lucide-react'
import type { DueLabel } from '../../lib/date'
import type { TaskDoc, TaskId } from '../../lib/domain'
import type { ColumnKey } from '../../lib/useDragAndDrop'
import DueBadge from './DueBadge'

type TaskCardProps = {
  task: TaskDoc
  columnKey: ColumnKey
  compact?: boolean
  dueLabel?: DueLabel
  isCommitment?: boolean
  showFocusButton?: boolean
  onMarkDone: (taskId: TaskId) => Promise<void>
  onToggleFocus?: (taskId: TaskId) => void
  onDragStart?: (event: DragEvent, taskId: TaskId, sourceColumn: ColumnKey) => void
  onDragEnd?: () => void
}

function TaskCard({
  task,
  columnKey,
  compact = false,
  dueLabel,
  isCommitment = false,
  showFocusButton = false,
  onMarkDone,
  onToggleFocus,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const [isExiting, setIsExiting] = useState(false)
  const draggable = !!onDragStart

  function handleCheck() {
    setIsExiting(true)
    setTimeout(() => {
      void onMarkDone(task._id)
    }, 400)
  }

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart!(e, task._id, columnKey) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={`group flex items-center gap-2.5 rounded-md border ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} shadow-sm transition-all ${isExiting ? 'task-exiting' : ''} ${
        isCommitment
          ? 'border-indigo-200 bg-indigo-50/40'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <input
        type="checkbox"
        checked={isExiting}
        onChange={handleCheck}
        aria-label={`Mark ${task.title} done`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
      />
      <span className={`min-w-0 flex-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-800 ${isExiting ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </span>
      {isCommitment && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
          <Star size={9} className="fill-indigo-500 text-indigo-500" />
          Focus today
        </span>
      )}
      {dueLabel && <DueBadge label={dueLabel} />}
      {showFocusButton && onToggleFocus && (
        <button
          type="button"
          onClick={() => onToggleFocus(task._id)}
          className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            isCommitment
              ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
          }`}
        >
          {isCommitment ? 'Unfocus' : 'Focus today'}
        </button>
      )}
    </div>
  )
}

export default TaskCard

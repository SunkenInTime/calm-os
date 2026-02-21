import { useState, type DragEvent } from 'react'
import { CircleMinus, Play, Plus } from 'lucide-react'
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
  onStartFocusBlock?: (task: TaskDoc) => void
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
  onStartFocusBlock,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const [isExiting, setIsExiting] = useState(false)
  const draggable = !!onDragStart
  const isDueToday = dueLabel === 'Due today'

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
      {isCommitment && onStartFocusBlock && (
        <button
          type="button"
          onClick={() => onStartFocusBlock(task)}
          className="inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-indigo-500 transition-colors hover:bg-indigo-100/70 hover:text-indigo-700"
        >
          <Play size={10} className="fill-current" />
          Focus
        </button>
      )}
      {showFocusButton && onToggleFocus && !isCommitment && (
        <button
          type="button"
          onClick={() => onToggleFocus(task._id)}
          className="inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        >
          <Plus size={10} />
          Focus
        </button>
      )}
      {dueLabel && <DueBadge label={dueLabel} subtle={isCommitment || isDueToday} />}
      {showFocusButton && onToggleFocus && isCommitment && (
        <button
          type="button"
          onClick={() => onToggleFocus(task._id)}
          aria-label={`Unfocus ${task.title}`}
          title="Unfocus"
          className="inline-flex shrink-0 items-center rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <CircleMinus size={13} />
        </button>
      )}
    </div>
  )
}

export default TaskCard

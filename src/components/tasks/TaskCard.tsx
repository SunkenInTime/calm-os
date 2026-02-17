import { useState, type DragEvent } from 'react'
import type { TaskDoc, TaskId } from '../../lib/domain'
import type { ColumnKey } from '../../lib/useDragAndDrop'

type TaskCardProps = {
  task: TaskDoc
  columnKey: ColumnKey
  compact?: boolean
  showCommitButton?: boolean
  onMarkDone: (taskId: TaskId) => Promise<void>
  onToggleCommitment?: (taskId: TaskId) => void
  onDragStart: (event: DragEvent, taskId: TaskId, sourceColumn: ColumnKey) => void
  onDragEnd: () => void
}

function TaskCard({
  task,
  columnKey,
  compact = false,
  showCommitButton = false,
  onMarkDone,
  onToggleCommitment,
  onDragStart,
  onDragEnd,
}: TaskCardProps) {
  const [isExiting, setIsExiting] = useState(false)

  function handleCheck() {
    setIsExiting(true)
    setTimeout(() => {
      void onMarkDone(task._id)
    }, 400)
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task._id, columnKey)}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2.5 rounded-md border border-slate-200 bg-white ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} cursor-grab shadow-sm transition-all hover:border-slate-300 hover:shadow active:cursor-grabbing ${isExiting ? 'task-exiting' : ''}`}
    >
      <input
        type="checkbox"
        checked={isExiting}
        onChange={handleCheck}
        aria-label={`Mark ${task.title} done`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
      />
      <span className={`flex-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-800 ${isExiting ? 'line-through text-slate-400' : ''}`}>
        {task.title}
      </span>
      {showCommitButton && onToggleCommitment && (
        <button
          type="button"
          onClick={() => onToggleCommitment(task._id)}
          className="shrink-0 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 opacity-0 transition-opacity hover:bg-slate-100 group-hover:opacity-100"
        >
          Commit
        </button>
      )}
    </div>
  )
}

export default TaskCard

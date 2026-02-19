import type { DragEvent } from 'react'
import type { TaskDoc, TaskId } from '../../lib/domain'
import type { ColumnKey } from '../../lib/useDragAndDrop'
import TaskCard from './TaskCard'

type TaskPanelProps = {
  columnKey: ColumnKey
  title: string
  tasks: TaskDoc[]
  tone?: 'primary' | 'secondary' | 'muted'
  compact?: boolean
  isDropActive: boolean
  className?: string
  showFocusButton?: boolean
  onMarkDone: (taskId: TaskId) => Promise<void>
  onToggleFocus?: (taskId: TaskId) => void
  onDragStart: (event: DragEvent, taskId: TaskId, sourceColumn: ColumnKey) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent, columnKey: ColumnKey) => void
  onDragLeave: (event: DragEvent, columnKey: ColumnKey) => void
  onDrop: (event: DragEvent, columnKey: ColumnKey) => void
  children?: React.ReactNode
}

const TONE_STYLES = {
  primary: 'border-slate-200 bg-white',
  secondary: 'border-slate-200/80 bg-slate-50/60',
  muted: 'border-slate-200/60 bg-slate-50/40',
}

function TaskPanel({
  columnKey,
  title,
  tasks,
  tone = 'secondary',
  compact = false,
  isDropActive,
  className = '',
  showFocusButton = false,
  onMarkDone,
  onToggleFocus,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}: TaskPanelProps) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, columnKey)}
      onDragLeave={(e) => onDragLeave(e, columnKey)}
      onDrop={(e) => onDrop(e, columnKey)}
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border ${TONE_STYLES[tone]} ${isDropActive ? 'drop-active' : ''} ${className}`}
    >
      <div className={`flex shrink-0 items-center justify-between border-b border-slate-100 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
        <h3 className={`font-medium text-slate-600 ${compact ? 'text-xs uppercase tracking-wider' : 'text-sm'}`}>
          {title}
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
          {tasks.length}
        </span>
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto ${compact ? 'p-2' : 'p-3'}`}>
        {children}
        {!children && tasks.length === 0 && (
          <p className={`${compact ? 'p-1.5 text-xs' : 'p-2 text-sm'} text-slate-400`}>
            Nothing here right now.
          </p>
        )}
        {!children && tasks.length > 0 && (
          <div className={`${compact ? 'space-y-1.5' : 'space-y-2'}`}>
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                columnKey={columnKey}
                compact={compact}
                showFocusButton={showFocusButton}
                onMarkDone={onMarkDone}
                onToggleFocus={onToggleFocus}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskPanel

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'

type TaskDoc = {
  _id: Id<'tasks'>
  title: string
  dueDate: string | null
  status: 'pending' | 'done' | 'dropped'
  createdAt: string
}

type IdeaDoc = {
  _id: Id<'ideas'>
  title: string
  rank: number
  createdAt: string
}

type TaskBuckets = {
  todayTasks: TaskDoc[]
  tomorrowTasks: TaskDoc[]
  dayAfterTasks: TaskDoc[]
  unscheduledTasks: TaskDoc[]
}

type ColumnTarget = 'today' | 'tomorrow' | 'dayAfter' | 'unscheduled'

type HorizonDateKeys = {
  todayKey: string
  tomorrowKey: string
  dayAfterKey: string
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  copy.setDate(copy.getDate() + days)
  return copy
}

function getHorizonDateKeys(): HorizonDateKeys {
  const now = new Date()
  return {
    todayKey: toLocalDateKey(now),
    tomorrowKey: toLocalDateKey(addDays(now, 1)),
    dayAfterKey: toLocalDateKey(addDays(now, 2)),
  }
}

function normalizeDueDateKey(dueDate: string | null): string | null {
  if (!dueDate) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate
  }

  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return toLocalDateKey(parsed)
}

function formatDueDate(dueDate: string | null): string {
  const dateKey = normalizeDueDateKey(dueDate)
  if (!dateKey) return 'No due date'

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type PanelTone = 'primary' | 'secondary' | 'muted'

type TaskPanelProps = {
  columnKey: ColumnTarget
  title: string
  tasks: TaskDoc[]
  tone: PanelTone
  exitingTaskIds: Set<Id<'tasks'>>
  onCheckTask: (taskId: Id<'tasks'>) => void
  onTaskDragStart: (taskId: Id<'tasks'>) => void
  onTaskDragEnd: () => void
  onTaskDragOver: (column: ColumnTarget) => void
  onTaskDrop: (column: ColumnTarget) => void
  isDropActive: boolean
  compact?: boolean
  className?: string
}

function TaskPanel({
  columnKey,
  title,
  tasks,
  tone,
  exitingTaskIds,
  onCheckTask,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDrop,
  isDropActive,
  compact = false,
  className = '',
}: TaskPanelProps) {
  const panelClass =
    tone === 'primary'
      ? 'border-neutral-700/80 bg-neutral-900'
      : tone === 'secondary'
        ? 'border-neutral-800 bg-neutral-900/70'
        : 'border-neutral-800/80 bg-neutral-900/45'

  const titleClass =
    tone === 'primary'
      ? 'text-xl font-semibold text-neutral-100'
      : tone === 'secondary'
        ? 'text-sm font-medium text-neutral-300'
        : 'text-sm font-medium text-neutral-400'

  const cardClass =
    tone === 'primary'
      ? 'rounded-xl bg-neutral-800 px-4 py-3 hover:bg-neutral-700/90'
      : tone === 'secondary'
        ? 'rounded-lg bg-neutral-800/75 px-3 py-2 hover:bg-neutral-700/80'
        : 'rounded-lg bg-neutral-800/55 px-3 py-2 hover:bg-neutral-800/70'

  const bodyTextClass = tone === 'primary' ? 'text-neutral-100' : 'text-neutral-300'
  const dueDateClass = tone === 'primary' ? 'text-neutral-400' : 'text-neutral-500'
  const headerClass = compact ? 'px-4 pb-2 pt-3' : 'px-5 pb-3 pt-4'
  const bodyClass = compact ? 'px-4 pb-4 space-y-2' : 'px-5 pb-5 space-y-3'
  const dropClass = isDropActive ? 'ring-1 ring-inset ring-neutral-500/70' : ''

  return (
    <section
      className={`flex min-h-0 flex-col rounded-2xl border ${panelClass} ${dropClass} ${className}`}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onTaskDragOver(columnKey)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onTaskDrop(columnKey)
      }}
    >
      <header className={`flex items-center justify-between ${headerClass}`}>
        <h2 className={titleClass}>{title}</h2>
        <span className="text-xs text-neutral-500">{tasks.length}</span>
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClass}`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-neutral-500">No tasks.</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task._id}
              className={`overflow-hidden transition-all duration-300 ease-out ${
                exitingTaskIds.has(task._id)
                  ? 'max-h-0 opacity-0'
                  : 'max-h-28 opacity-100'
              }`}
              draggable={!exitingTaskIds.has(task._id)}
              onDragStart={() => onTaskDragStart(task._id)}
              onDragEnd={onTaskDragEnd}
            >
              <article className={`${cardClass} cursor-grab active:cursor-grabbing`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={exitingTaskIds.has(task._id)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onCheckTask(task._id)
                      }
                    }}
                    disabled={exitingTaskIds.has(task._id)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-600 bg-neutral-800 accent-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Mark ${task.title} as done`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm ${bodyTextClass}`}>{task.title}</p>
                    <p className={`mt-1 text-xs ${dueDateClass}`}>{formatDueDate(task.dueDate)}</p>
                  </div>
                </div>
              </article>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function App() {
  const taskQueryResult = useQuery(api.tasks.listPendingTasks)
  const ideaQueryResult = useQuery(api.ideas.listIdeas)
  const createTask = useMutation(api.tasks.createTask)
  const completeTask = useMutation(api.tasks.completeTask)
  const updateTaskDueDate = useMutation(api.tasks.updateTaskDueDate)

  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<Id<'tasks'>>>(new Set())
  const [draggedTaskId, setDraggedTaskId] = useState<Id<'tasks'> | null>(null)
  const [activeDropColumn, setActiveDropColumn] = useState<ColumnTarget | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isComposerOpen) return
    requestAnimationFrame(() => {
      titleInputRef.current?.focus()
    })
  }, [isComposerOpen])

  const taskBuckets = useMemo<TaskBuckets>(() => {
    const tasks = (taskQueryResult ?? []) as TaskDoc[]
    const { todayKey, tomorrowKey, dayAfterKey } = getHorizonDateKeys()

    const todayTasks: TaskDoc[] = []
    const tomorrowTasks: TaskDoc[] = []
    const dayAfterTasks: TaskDoc[] = []
    const unscheduledTasks: TaskDoc[] = []

    for (const task of tasks) {
      if (task.status !== 'pending') {
        continue
      }

      const dateKey = normalizeDueDateKey(task.dueDate)

      if (dateKey === null) {
        unscheduledTasks.push(task)
      } else if (dateKey === todayKey) {
        todayTasks.push(task)
      } else if (dateKey === tomorrowKey) {
        tomorrowTasks.push(task)
      } else if (dateKey === dayAfterKey) {
        dayAfterTasks.push(task)
      }
    }

    unscheduledTasks.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime()
      const bTime = new Date(b.createdAt).getTime()
      return bTime - aTime
    })

    return { todayTasks, tomorrowTasks, dayAfterTasks, unscheduledTasks }
  }, [taskQueryResult])

  const ideas = (ideaQueryResult ?? []) as IdeaDoc[]

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
      await createTask({
        title: trimmedTitle,
        dueDate: dueDate ? dueDate : null,
      })
      setTitle('')
      setDueDate('')
      setIsComposerOpen(false)
    } catch {
      setSubmitError('Could not create task right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCheckTask(taskId: Id<'tasks'>) {
    if (exitingTaskIds.has(taskId)) {
      return
    }

    setExitingTaskIds((previous) => {
      const next = new Set(previous)
      next.add(taskId)
      return next
    })

    window.setTimeout(async () => {
      try {
        await completeTask({ taskId })
        setExitingTaskIds((previous) => {
          const next = new Set(previous)
          next.delete(taskId)
          return next
        })
      } catch {
        setExitingTaskIds((previous) => {
          const next = new Set(previous)
          next.delete(taskId)
          return next
        })
      }
    }, 250)
  }

  function handleTaskDragStart(taskId: Id<'tasks'>) {
    setDraggedTaskId(taskId)
  }

  function handleTaskDragOver(column: ColumnTarget) {
    if (!draggedTaskId) return
    if (activeDropColumn !== column) {
      setActiveDropColumn(column)
    }
  }

  function handleTaskDragEnd() {
    setDraggedTaskId(null)
    setActiveDropColumn(null)
  }

  async function handleTaskDrop(column: ColumnTarget) {
    if (!draggedTaskId) {
      setActiveDropColumn(null)
      return
    }

    const { todayKey, tomorrowKey, dayAfterKey } = getHorizonDateKeys()
    const dueDateByColumn: Record<ColumnTarget, string | null> = {
      today: todayKey,
      tomorrow: tomorrowKey,
      dayAfter: dayAfterKey,
      unscheduled: null,
    }

    try {
      await updateTaskDueDate({
        taskId: draggedTaskId,
        dueDate: dueDateByColumn[column],
      })
    } finally {
      setDraggedTaskId(null)
      setActiveDropColumn(null)
    }
  }

  function openComposer() {
    setSubmitError('')
    setIsComposerOpen(true)
  }

  function closeComposer() {
    setIsComposerOpen(false)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <aside className="flex min-h-0 w-72 shrink-0 flex-col border-r border-neutral-800/90 bg-neutral-900/45 px-6 py-8">
        <h2 className="text-base font-medium text-neutral-300">Ideas</h2>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-lg border border-neutral-800 p-3">
          {ideas.length === 0 ? (
            <p className="p-2 text-sm text-neutral-500">No ideas yet.</p>
          ) : (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <article key={idea._id} className="rounded-md bg-neutral-800/70 px-3 py-2">
                  <p className="text-sm text-neutral-200">{idea.title}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-8 py-7">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-400">Calm OS</h1>
          <button
            type="button"
            onClick={openComposer}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700/90"
          >
            + Task
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 overflow-hidden pb-1">
          <TaskPanel
            columnKey="today"
            title="Today"
            tasks={taskBuckets.todayTasks}
            tone="primary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'today'}
            className="col-span-8 row-span-3"
          />
          <TaskPanel
            columnKey="tomorrow"
            title="Tomorrow"
            tasks={taskBuckets.tomorrowTasks}
            tone="secondary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'tomorrow'}
            compact
            className="col-span-4 row-span-1"
          />
          <TaskPanel
            columnKey="dayAfter"
            title="Day After"
            tasks={taskBuckets.dayAfterTasks}
            tone="secondary"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'dayAfter'}
            compact
            className="col-span-4 row-span-1"
          />
          <TaskPanel
            columnKey="unscheduled"
            title="Unscheduled"
            tasks={taskBuckets.unscheduledTasks}
            tone="muted"
            exitingTaskIds={exitingTaskIds}
            onCheckTask={handleCheckTask}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragEnd={handleTaskDragEnd}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            isDropActive={activeDropColumn === 'unscheduled'}
            compact
            className="col-span-4 row-span-1"
          />
        </div>
      </main>

      {isComposerOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-neutral-950/70 p-4"
          onClick={closeComposer}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-200">Add Task</h2>
              <button
                type="button"
                onClick={closeComposer}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700/90"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                ref={titleInputRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
            {submitError && <p className="mt-2 text-sm text-neutral-400">{submitError}</p>}
          </form>
        </div>
      )}
    </div>
  )
}

export default App

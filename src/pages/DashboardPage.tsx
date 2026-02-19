import { useCallback, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { getRelativeDueLabel, toLocalDateKey } from '../lib/date'
import type { DailyModel, PlannerSnapshot, TaskDoc, TaskId } from '../lib/domain'
import type { FocusStartPayload } from '../lib/focusBlockSession'
import TaskCard from '../components/tasks/TaskCard'
import { useDragAndDrop, type ColumnKey } from '../lib/useDragAndDrop'

function DashboardPage() {
  const localTodayKey = toLocalDateKey(new Date())
  const planner = useQuery(api.tasks.getPlannerSnapshot, {
    todayKey: localTodayKey,
  }) as PlannerSnapshot | undefined
  const dailyModel = useQuery(api.daily.getTodayDailyModel, {
    todayKey: localTodayKey,
  }) as DailyModel | undefined
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const updateTaskDueDate = useMutation(api.tasks.setTaskDueDate)
  const addCommitment = useMutation(api.daily.addCommitmentForDate)
  const removeCommitment = useMutation(api.daily.removeCommitmentForDate)

  const [tomorrowOpen, setTomorrowOpen] = useState(false)
  const [dayAfterOpen, setDayAfterOpen] = useState(false)
  const [focusTarget, setFocusTarget] = useState<{ taskId: TaskId; title: string } | null>(null)
  const [isStartingFocusBlock, setIsStartingFocusBlock] = useState(false)

  const todayKey = dailyModel?.todayKey ?? ''

  const handleDrop = useCallback(
    (taskId: TaskId, sourceColumn: ColumnKey, targetColumn: ColumnKey) => {
      if (!planner || !dailyModel) return

      const dateMap: Record<string, string | null> = {
        commitments: planner.todayKey,
        today: planner.todayKey,
        tomorrow: planner.tomorrowKey,
        dayAfter: planner.dayAfterKey,
        unscheduled: null,
        later: null,
      }

      const targetDate = dateMap[targetColumn]
      const sourceDate = dateMap[sourceColumn]

      if (targetColumn === 'commitments') {
        if (targetDate !== sourceDate) {
          void updateTaskDueDate({ taskId, dueDate: targetDate })
        }
        void addCommitment({ dateKey: planner.todayKey, taskId })
      } else {
        if (sourceColumn === 'commitments') {
          void removeCommitment({ dateKey: planner.todayKey, taskId })
        }
        if (targetDate !== sourceDate || sourceColumn === 'commitments') {
          void updateTaskDueDate({ taskId, dueDate: targetDate })
        }
      }
    },
    [planner, dailyModel, updateTaskDueDate, addCommitment, removeCommitment],
  )

  const {
    activeDropColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop: handleDropEvent,
    handleDragEnd,
  } = useDragAndDrop(handleDrop)

  if (!planner || !dailyModel) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading your calm dashboard...
      </div>
    )
  }

  const commitmentTasks = dailyModel.commitmentTasks.filter((t) => t.status === 'active')
  const commitmentTaskIds = new Set<TaskId>(commitmentTasks.map((t) => t._id))
  const dueTodayWithoutCommitments = planner.todayTasks.filter((t) => !commitmentTaskIds.has(t._id))

  async function handleMarkDone(taskId: TaskId) {
    await markTaskDone({ taskId })
  }

  function handleToggleFocus(taskId: TaskId) {
    if (commitmentTaskIds.has(taskId)) {
      void removeCommitment({ dateKey: todayKey, taskId })
    } else {
      void addCommitment({ dateKey: todayKey, taskId })
    }
  }

  function handleRequestStartFocus(task: TaskDoc) {
    if (!commitmentTaskIds.has(task._id)) return
    setFocusTarget({
      taskId: task._id,
      title: task.title,
    })
  }

  async function handleConfirmStartFocusBlock() {
    if (!focusTarget || isStartingFocusBlock) return
    setIsStartingFocusBlock(true)
    try {
      const payload: FocusStartPayload = {
        source: 'commitment-card',
        commitmentId: focusTarget.taskId,
        commitmentTitle: focusTarget.title,
      }
      await window.ipcRenderer?.invoke?.('focus:start', payload)
      setFocusTarget(null)
    } finally {
      setIsStartingFocusBlock(false)
    }
  }

  function dueLabelFor(task: TaskDoc) {
    return getRelativeDueLabel(task.dueDate, planner!.todayKey)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-3 pb-6">
        {/* Commitments block */}
        <div
          onDragOver={(e) => handleDragOver(e, 'commitments')}
          onDragLeave={(e) => handleDragLeave(e, 'commitments')}
          onDrop={(e) => handleDropEvent(e, 'commitments')}
          className={`rounded-xl border bg-indigo-50/30 p-4 shadow-sm ${activeDropColumn === 'commitments'
              ? 'border-indigo-300 drop-active'
              : 'border-indigo-100'
            }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700">Commitments</h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs tabular-nums font-medium text-indigo-600">
              {commitmentTasks.length}/3
            </span>
          </div>
          <div className="mt-3">
            {commitmentTasks.length === 0 ? (
              <p className="text-xs text-slate-400">
                No commitments yet. Use "Focus today" below to pick what matters.
              </p>
            ) : (
              <div className="space-y-2">
                {commitmentTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    columnKey="commitments"
                    dueLabel={dueLabelFor(task)}
                    isCommitment
                    showFocusButton
                    onMarkDone={handleMarkDone}
                    onToggleFocus={handleToggleFocus}
                    onStartFocusBlock={handleRequestStartFocus}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Due Today block */}
        {dueTodayWithoutCommitments.length > 0 && (
          <div
            onDragOver={(e) => handleDragOver(e, 'today')}
            onDragLeave={(e) => handleDragLeave(e, 'today')}
            onDrop={(e) => handleDropEvent(e, 'today')}
            className={`rounded-xl border bg-white p-4 shadow-sm ${activeDropColumn === 'today' ? 'border-slate-300 drop-active' : 'border-slate-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Due today</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                {dueTodayWithoutCommitments.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {dueTodayWithoutCommitments.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  columnKey="today"
                  dueLabel={dueLabelFor(task)}
                  showFocusButton
                  onMarkDone={handleMarkDone}
                  onToggleFocus={handleToggleFocus}
                  onStartFocusBlock={handleRequestStartFocus}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow + Day After: collapsed rows */}
        <div className="flex gap-3">
          <CollapsibleSection
            title="Tomorrow"
            count={planner.tomorrowTasks.length}
            isOpen={tomorrowOpen}
            onToggle={() => setTomorrowOpen(!tomorrowOpen)}
          />
          <CollapsibleSection
            title="Day after"
            count={planner.dayAfterTasks.length}
            isOpen={dayAfterOpen}
            onToggle={() => setDayAfterOpen(!dayAfterOpen)}
          />
        </div>

        {tomorrowOpen && planner.tomorrowTasks.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Tomorrow</h4>
            <div className="space-y-1.5">
              {planner.tomorrowTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  columnKey="tomorrow"
                  compact
                  dueLabel={dueLabelFor(task)}
                  showFocusButton
                  isCommitment={commitmentTaskIds.has(task._id)}
                  onMarkDone={handleMarkDone}
                  onToggleFocus={handleToggleFocus}
                  onStartFocusBlock={handleRequestStartFocus}
                />
              ))}
            </div>
          </div>
        )}

        {dayAfterOpen && planner.dayAfterTasks.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Day after</h4>
            <div className="space-y-1.5">
              {planner.dayAfterTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  columnKey="dayAfter"
                  compact
                  dueLabel={dueLabelFor(task)}
                  showFocusButton
                  isCommitment={commitmentTaskIds.has(task._id)}
                  onMarkDone={handleMarkDone}
                  onToggleFocus={handleToggleFocus}
                  onStartFocusBlock={handleRequestStartFocus}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unscheduled: tiny link */}
        {planner.unscheduledTasks.length > 0 && (
          <UnscheduledLink
            count={planner.unscheduledTasks.length}
            tasks={planner.unscheduledTasks}
            commitmentTaskIds={commitmentTaskIds}
            todayKey={planner.todayKey}
            onMarkDone={handleMarkDone}
            onToggleFocus={handleToggleFocus}
            onStartFocusBlock={handleRequestStartFocus}
          />
        )}
        {focusTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-800">Start focus block?</h3>
              <p className="mt-1 text-xs text-slate-500">
                Attach a 25-minute focus block to:
              </p>
              <p className="mt-2 rounded-md bg-indigo-50 px-2.5 py-2 text-sm font-medium text-indigo-700">
                {focusTarget.title}
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFocusTarget(null)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmStartFocusBlock()}
                  disabled={isStartingFocusBlock}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isStartingFocusBlock ? 'Starting...' : 'Start'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  count,
  isOpen,
  onToggle,
}: {
  title: string
  count: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-1 items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
    >
      <span>
        {title}{' '}
        <span className="tabular-nums text-slate-400">({count})</span>
      </span>
      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
    </button>
  )
}

function UnscheduledLink({
  count,
  tasks,
  commitmentTaskIds,
  todayKey,
  onMarkDone,
  onToggleFocus,
  onStartFocusBlock,
}: {
  count: number
  tasks: TaskDoc[]
  commitmentTaskIds: Set<TaskId>
  todayKey: string
  onMarkDone: (taskId: TaskId) => Promise<void>
  onToggleFocus: (taskId: TaskId) => void
  onStartFocusBlock: (task: TaskDoc) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Unscheduled ({count})
      </button>
      {isOpen && (
        <div className="mt-2 rounded-xl border border-slate-200/60 bg-slate-50/40 p-4">
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                columnKey="unscheduled"
                compact
                dueLabel={getRelativeDueLabel(task.dueDate, todayKey)}
                isCommitment={commitmentTaskIds.has(task._id)}
                showFocusButton
                onMarkDone={onMarkDone}
                onToggleFocus={onToggleFocus}
                onStartFocusBlock={onStartFocusBlock}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage

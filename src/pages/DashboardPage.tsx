import { useCallback, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Moon, Plus, RotateCcw, Sun } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import type { DailyModel, PlannerSnapshot, TaskId } from '../lib/domain'
import IdeasSidebar from '../components/ideas/IdeasSidebar'
import TaskPanel from '../components/tasks/TaskPanel'
import TaskCard from '../components/tasks/TaskCard'
import TaskComposerModal from '../components/tasks/TaskComposerModal'
import { useDragAndDrop, type ColumnKey } from '../lib/useDragAndDrop'

function DashboardPage() {
  const navigate = useNavigate()
  const planner = useQuery(api.tasks.getPlannerSnapshot) as PlannerSnapshot | undefined
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined
  const createTask = useMutation(api.tasks.createTask)
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const updateTaskDueDate = useMutation(api.tasks.setTaskDueDate)
  const addCommitment = useMutation(api.daily.addCommitmentForDate)
  const removeCommitment = useMutation(api.daily.removeCommitmentForDate)

  const [isComposerOpen, setIsComposerOpen] = useState(false)

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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">
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

  function handleCommitFromCard(taskId: TaskId) {
    void addCommitment({ dateKey: todayKey, taskId })
  }

  async function handleCreateTask(title: string, dueDate: string | null) {
    await createTask({ title, dueDate })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800">
      <IdeasSidebar />

      <main className="flex min-w-0 flex-1 flex-col px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Calm OS
            </h1>
            <div className="mt-1 flex gap-3">
              <Link to="/" className="text-xs font-medium text-indigo-600">Today</Link>
              <Link to="/ideas" className="text-xs font-medium text-slate-400 hover:text-slate-600">Ideas</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/ritual/morning')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs shadow-sm transition-colors ${dailyModel?.daily?.morningCompletedAt ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Sun size={13} />
              Morning
            </button>
            <button
              type="button"
              onClick={() => navigate('/ritual/evening')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs shadow-sm transition-colors ${dailyModel?.daily?.eveningCompletedAt ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Moon size={13} />
              Evening
            </button>
            <button
              type="button"
              onClick={() => navigate('/ritual/reset')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Plus size={14} />
              Task
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-3 overflow-hidden pb-1">
          {/* Today: full left column with commitments + due today */}
          <div
            className="col-span-8 row-span-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            {/* Commitments zone */}
            <div
              onDragOver={(e) => handleDragOver(e, 'commitments')}
              onDragLeave={(e) => handleDragLeave(e, 'commitments')}
              onDrop={(e) => handleDropEvent(e, 'commitments')}
              className={`flex min-h-0 flex-col border-b border-slate-100 ${activeDropColumn === 'commitments' ? 'drop-active' : ''}`}
              style={{ flex: '0 1 auto', maxHeight: '50%' }}
            >
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium text-slate-600">Commitments</h3>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs tabular-nums text-indigo-600">
                  {commitmentTasks.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {commitmentTasks.length === 0 ? (
                  <p className="p-2 text-sm text-slate-400">
                    Drag tasks here to commit, or click Commit.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {commitmentTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        columnKey="commitments"
                        onMarkDone={handleMarkDone}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Due Today zone */}
            <div
              onDragOver={(e) => handleDragOver(e, 'today')}
              onDragLeave={(e) => handleDragLeave(e, 'today')}
              onDrop={(e) => handleDropEvent(e, 'today')}
              className={`flex min-h-0 flex-1 flex-col ${activeDropColumn === 'today' ? 'drop-active' : ''}`}
            >
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium text-slate-600">Due Today</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                  {dueTodayWithoutCommitments.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {dueTodayWithoutCommitments.length === 0 ? (
                  <p className="p-2 text-sm text-slate-400">Nothing else due today.</p>
                ) : (
                  <div className="space-y-2">
                    {dueTodayWithoutCommitments.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        columnKey="today"
                        showCommitButton
                        onMarkDone={handleMarkDone}
                        onToggleCommitment={handleCommitFromCard}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <TaskPanel
            columnKey="tomorrow"
            title="Tomorrow"
            tasks={planner.tomorrowTasks}
            tone="secondary"
            compact
            isDropActive={activeDropColumn === 'tomorrow'}
            showCommitButton
            onMarkDone={handleMarkDone}
            onToggleCommitment={handleCommitFromCard}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropEvent}
            className="col-span-4 row-span-1"
          />

          <TaskPanel
            columnKey="dayAfter"
            title="Day After"
            tasks={planner.dayAfterTasks}
            tone="secondary"
            compact
            isDropActive={activeDropColumn === 'dayAfter'}
            showCommitButton
            onMarkDone={handleMarkDone}
            onToggleCommitment={handleCommitFromCard}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropEvent}
            className="col-span-4 row-span-1"
          />

          <TaskPanel
            columnKey="unscheduled"
            title="Unscheduled"
            tasks={planner.unscheduledTasks}
            tone="muted"
            compact
            isDropActive={activeDropColumn === 'unscheduled'}
            showCommitButton
            onMarkDone={handleMarkDone}
            onToggleCommitment={handleCommitFromCard}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropEvent}
            className="col-span-4 row-span-1"
          />
        </div>
      </main>

      <TaskComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  )
}

export default DashboardPage

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import DecisionTaskCard from '../components/ritual/DecisionTaskCard'
import RitualVariantFrame from '../components/ritual/RitualVariantFrame'
import SmartTaskInput from '../components/tasks/SmartTaskInput'
import { useSmartTaskInput } from '../lib/useSmartTaskInput'
import { addDays, formatDateKey, getRelativeDueLabel, toLocalDateKey } from '../lib/date'
import type { DailyModel, PlannerSnapshot, RitualKind, TaskDoc, TaskId } from '../lib/domain'

const RITUAL_COPY = {
  morning: {
    title: 'Morning check-in',
    subtitle: "Here's today. Want to focus anything?",
    finishLabel: 'Finish morning check-in',
  },
  evening: {
    title: 'Evening review',
    subtitle: 'Close loops — no shame, just decisions.',
    finishLabel: 'Finish evening review',
  },
  reset: {
    title: 'Reset review',
    subtitle: 'Re-enter gently. Focus only on now and the next two days.',
    finishLabel: 'Finish reset review',
  },
}

type RitualPageProps = {
  kind: RitualKind
}

function RitualPage({ kind }: RitualPageProps) {
  const navigate = useNavigate()
  const planner = useQuery(api.tasks.getPlannerSnapshot) as PlannerSnapshot | undefined
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined
  const setCommitmentsForDate = useMutation(api.daily.setCommitmentsForDate)
  const markRitualCompleted = useMutation(api.daily.markRitualCompleted)
  const createTask = useMutation(api.tasks.createTask)
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const setTaskDueDate = useMutation(api.tasks.setTaskDueDate)
  const dropTask = useMutation(api.tasks.dropTask)

  const [selectedCommitmentTaskIds, setSelectedCommitmentTaskIds] = useState<TaskId[]>([])
  const [initializedDateKey, setInitializedDateKey] = useState('')
  const quickAdd = useSmartTaskInput()
  const [ritualError, setRitualError] = useState('')
  const [isFinishing, setIsFinishing] = useState(false)
  const [hasCompletedRitual, setHasCompletedRitual] = useState(false)
  const [moveDateByTaskId, setMoveDateByTaskId] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!planner || !dailyModel) return
    if (initializedDateKey === dailyModel.todayKey) return

    const activeTaskIds = new Set(planner.activeTasks.map((task) => task._id))
    setInitializedDateKey(dailyModel.todayKey)
    setSelectedCommitmentTaskIds(
      (dailyModel.daily?.commitmentTaskIds ?? []).filter((taskId) => activeTaskIds.has(taskId)),
    )

    const tomorrowKey = toLocalDateKey(addDays(new Date(), 1))
    const defaults: Record<string, string> = {}
    for (const task of planner.activeTasks) {
      defaults[task._id] = tomorrowKey
    }
    setMoveDateByTaskId(defaults)
  }, [dailyModel, initializedDateKey, planner])

  useEffect(() => {
    return () => {
      if (!dailyModel || hasCompletedRitual) return
      void markRitualCompleted({
        dateKey: dailyModel.todayKey,
        ritual: kind,
      })
    }
  }, [dailyModel, hasCompletedRitual, kind, markRitualCompleted])

  if (!planner || !dailyModel) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading ritual...
      </div>
    )
  }

  const ritualDateKey = dailyModel.todayKey
  const ritualCopy = RITUAL_COPY[kind]
  const commitmentTasks = dailyModel.commitmentTasks
  const commitmentTaskIds = new Set((dailyModel.daily?.commitmentTaskIds ?? []).map((id) => id))
  const unfinishedCommitments = commitmentTasks.filter((task) => task.status === 'active')
  const finishedCommitments = commitmentTasks.filter((task) => task.status === 'done')
  const dueTodayWithoutCommitments = planner.todayTasks.filter(
    (task) => !commitmentTaskIds.has(task._id),
  )
  const commitmentSelectionSet = new Set(selectedCommitmentTaskIds)

  function dueLabelFor(task: TaskDoc) {
    return getRelativeDueLabel(task.dueDate, planner!.todayKey)
  }

  async function handleQuickAddTask() {
    const cleanTitle = quickAdd.getCleanTitle()
    if (!cleanTitle) return
    await createTask({ title: cleanTitle, dueDate: quickAdd.resolvedDate })
    quickAdd.reset()
  }

  function toggleSelectedCommitment(taskId: TaskId) {
    setSelectedCommitmentTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    )
  }

  function setMoveDate(taskId: TaskId, date: string) {
    setMoveDateByTaskId((prev) => ({ ...prev, [taskId]: date }))
  }

  async function resolveTaskAsDone(taskId: TaskId) {
    await markTaskDone({ taskId })
  }

  async function resolveTaskAsDrop(taskId: TaskId) {
    await dropTask({ taskId })
  }

  async function resolveTaskAsMove(taskId: TaskId, date: string) {
    const normalizedDate = date.trim()
    if (!normalizedDate) return
    await setTaskDueDate({ taskId, dueDate: normalizedDate })
  }

  async function batchMoveAllCommitmentsToTomorrow() {
    for (const task of unfinishedCommitments) {
      await setTaskDueDate({ taskId: task._id, dueDate: planner!.tomorrowKey })
    }
  }

  async function finishRitualAndExit() {
    try {
      setRitualError('')
      setIsFinishing(true)
      if (kind !== 'evening') {
        await setCommitmentsForDate({
          dateKey: ritualDateKey,
          taskIds: selectedCommitmentTaskIds,
        })
      }
      await markRitualCompleted({
        dateKey: ritualDateKey,
        ritual: kind,
      })
      setHasCompletedRitual(true)
      navigate('/')
    } catch {
      setRitualError('Could not save this ritual yet. Please try again.')
    } finally {
      setIsFinishing(false)
    }
  }

  // --- Morning check-in (compact panel) ---
  if (kind === 'morning') {
    const overdueTasks = planner.todayTasks.filter(
      (t) => t.dueDate && t.dueDate < planner.todayKey,
    )
    const dueTodayTasks = [
      ...overdueTasks,
      ...planner.todayTasks.filter((t) => t.dueDate === planner.todayKey),
    ]

    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 pb-6">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-slate-800">{ritualCopy.title}</h1>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                {formatDateKey(planner.todayKey)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{ritualCopy.subtitle}</p>
          </div>

          {/* Section 1: Due today */}
          {dueTodayTasks.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-slate-700">Due today</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Pick up to 3 things to focus on.
              </p>
              <div className="mt-3 space-y-2">
                {dueTodayTasks.map((task) => (
                  <MorningFocusCard
                    key={task._id}
                    task={task}
                    dueLabel={dueLabelFor(task)}
                    isFocused={commitmentSelectionSet.has(task._id)}
                    onToggleFocus={() => toggleSelectedCommitment(task._id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Due soon */}
          {(planner.tomorrowTasks.length > 0 || planner.dayAfterTasks.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-slate-700">Due soon</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Want to pull anything forward into today's focus?
              </p>

              {planner.tomorrowTasks.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Due tomorrow</p>
                  <div className="space-y-2">
                    {planner.tomorrowTasks.map((task) => (
                      <MorningFocusCard
                        key={task._id}
                        task={task}
                        dueLabel={dueLabelFor(task)}
                        isFocused={commitmentSelectionSet.has(task._id)}
                        onToggleFocus={() => toggleSelectedCommitment(task._id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {planner.dayAfterTasks.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Due in 2 days</p>
                  <div className="space-y-2">
                    {planner.dayAfterTasks.map((task) => (
                      <MorningFocusCard
                        key={task._id}
                        task={task}
                        dueLabel={dueLabelFor(task)}
                        isFocused={commitmentSelectionSet.has(task._id)}
                        onToggleFocus={() => toggleSelectedCommitment(task._id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Quick add */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium text-slate-700">Quick add</h3>
            <div className="flex gap-2">
              <SmartTaskInput
                value={quickAdd.title}
                onChange={quickAdd.setTitle}
                resolvedDate={quickAdd.resolvedDate}
                onResolvedDate={quickAdd.setResolvedDate}
                placeholder="Add a task... (try TD, TM, MON-SUN)"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => void handleQuickAddTask()}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {selectedCommitmentTaskIds.length > 3 && (
              <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                Gentle reminder: 1-3 commitments is often enough.
              </div>
            )}
            <p className="text-xs text-slate-400">
              Valid with zero commitments. This check-in is just for clarity.
            </p>
            {ritualError && (
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {ritualError}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={14} />
                Back to today
              </button>
              <button
                type="button"
                onClick={() => void finishRitualAndExit()}
                disabled={isFinishing}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {ritualCopy.finishLabel}
                <CornerDownLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Evening review (compact panel) ---
  if (kind === 'evening') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 pb-6">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-slate-800">{ritualCopy.title}</h1>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                {formatDateKey(planner.todayKey)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{ritualCopy.subtitle}</p>
            <div className="mt-2 text-xs text-slate-400">
              Completed: {finishedCommitments.length} · Still open: {unfinishedCommitments.length}
            </div>
          </div>

          {/* Group 1: Open commitments */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Open commitments</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                {unfinishedCommitments.length}
              </span>
            </div>
            {unfinishedCommitments.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">All clear — nothing open.</p>
            ) : (
              <>
                {unfinishedCommitments.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => void batchMoveAllCommitmentsToTomorrow()}
                    className="mt-2 flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <ArrowRight size={12} />
                    Move all open commitments to tomorrow
                  </button>
                )}
                <div className="mt-3 space-y-2">
                  {unfinishedCommitments.map((task) => (
                    <DecisionTaskCard
                      key={task._id}
                      task={task}
                      dueLabel={dueLabelFor(task)}
                      moveDate={moveDateByTaskId[task._id] ?? planner.tomorrowKey}
                      onMoveDateChange={setMoveDate}
                      onMarkDone={resolveTaskAsDone}
                      onMove={resolveTaskAsMove}
                      onDrop={resolveTaskAsDrop}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Group 2: Due today, not completed */}
          {dueTodayWithoutCommitments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-700">Due today, not completed</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                  {dueTodayWithoutCommitments.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {dueTodayWithoutCommitments.map((task) => (
                  <DecisionTaskCard
                    key={task._id}
                    task={task}
                    dueLabel={dueLabelFor(task)}
                    moveDate={moveDateByTaskId[task._id] ?? planner.tomorrowKey}
                    onMoveDateChange={setMoveDate}
                    onMarkDone={resolveTaskAsDone}
                    onMove={resolveTaskAsMove}
                    onDrop={resolveTaskAsDrop}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">
              You can finish even if you leave everything as-is.
            </p>
            {ritualError && (
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {ritualError}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={14} />
                Back to today
              </button>
              <button
                type="button"
                onClick={() => void finishRitualAndExit()}
                disabled={isFinishing}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                {ritualCopy.finishLabel}
                <CornerDownLeft size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Reset review (keeps RitualVariantFrame) ---
  const resetDecisionTasks = planner.priorTasks

  const summaryNode = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">{ritualCopy.title}</h2>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          {formatDateKey(planner.todayKey)}
        </span>
      </div>
      <p className="text-sm text-slate-500">{ritualCopy.subtitle}</p>
      <div className="flex flex-wrap gap-3">
        <StatCard label="Due today" value={planner.todayTasks.length} />
        <StatCard
          label="Tomorrow + day after"
          value={planner.tomorrowTasks.length + planner.dayAfterTasks.length}
        />
        <StatCard label="Completed yesterday" value={planner.yesterdayCompletedCount} />
      </div>
    </div>
  )

  const resetPrimaryNode = (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Pick up to 3 things to focus on</h3>
        <p className="text-xs text-slate-400">
          Keep it intentional. A short list usually feels better than a long one.
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {planner.activeTasks.map((task) => (
            <MorningFocusCard
              key={task._id}
              task={task}
              dueLabel={dueLabelFor(task)}
              isFocused={commitmentSelectionSet.has(task._id)}
              onToggleFocus={() => toggleSelectedCommitment(task._id)}
            />
          ))}
        </div>
        {selectedCommitmentTaskIds.length > 3 && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            Gentle reminder: 1-3 commitments is often enough.
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Quick add</h3>
        <div className="flex gap-2">
          <SmartTaskInput
            value={quickAdd.title}
            onChange={quickAdd.setTitle}
            resolvedDate={quickAdd.resolvedDate}
            onResolvedDate={quickAdd.setResolvedDate}
            placeholder="Add a task... (try TD, TM, MON-SUN)"
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={() => void handleQuickAddTask()}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )

  const resetDecisionNode = (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Reset decisions</h3>
      <p className="text-xs text-slate-400">
        Keep attention on today + next two days, then clear older items lightly.
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          Today: {planner.todayTasks.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          Tomorrow: {planner.tomorrowTasks.length}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          Day after: {planner.dayAfterTasks.length}
        </span>
      </div>
      <hr className="border-slate-100" />
      <p className="text-sm font-medium text-slate-600">Earlier items to review</p>
      <div className="space-y-2">
        {resetDecisionTasks.length === 0 ? (
          <p className="text-xs text-slate-400">No older dated items need decisions right now.</p>
        ) : (
          resetDecisionTasks.map((task) => (
            <DecisionTaskCard
              key={task._id}
              task={task}
              dueLabel={dueLabelFor(task)}
              moveDate={moveDateByTaskId[task._id] ?? planner.tomorrowKey}
              onMoveDateChange={setMoveDate}
              onMarkDone={resolveTaskAsDone}
              onMove={resolveTaskAsMove}
              onDrop={resolveTaskAsDrop}
            />
          ))
        )}
      </div>
    </div>
  )

  const footerNode = (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        You can complete this ritual even if you commit to nothing or leave everything unchanged.
      </p>
      {ritualError && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {ritualError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={14} />
          Back to today
        </button>
        <button
          type="button"
          onClick={() => void finishRitualAndExit()}
          disabled={isFinishing}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {ritualCopy.finishLabel}
          <CornerDownLeft size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 pb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">{ritualCopy.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{ritualCopy.subtitle}</p>
        </div>
        <RitualVariantFrame
          summary={summaryNode}
          primary={resetPrimaryNode}
          secondary={resetDecisionNode}
          footer={footerNode}
        />
      </div>
    </div>
  )
}

// --- Morning focus card (used in morning check-in and reset) ---
function MorningFocusCard({
  task,
  dueLabel,
  isFocused,
  onToggleFocus,
}: {
  task: TaskDoc
  dueLabel: ReturnType<typeof getRelativeDueLabel>
  isFocused: boolean
  onToggleFocus: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
        isFocused
          ? 'border-indigo-200 bg-indigo-50/40'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="text-sm font-medium text-slate-700">{task.title}</p>
        <DueBadgeInline label={dueLabel} />
      </div>
      <button
        type="button"
        onClick={onToggleFocus}
        className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          isFocused
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        {isFocused ? 'Focused' : 'Focus today'}
      </button>
    </div>
  )
}

function DueBadgeInline({ label }: { label: ReturnType<typeof getRelativeDueLabel> }) {
  if (label === 'No date') return null

  const styles: Record<string, string> = {
    'Overdue': 'bg-amber-50 text-amber-700',
    'Due today': 'bg-slate-100 text-slate-700',
    'Due tomorrow': 'bg-slate-100 text-slate-600',
    'Due in 2 days': 'bg-slate-50 text-slate-500',
  }

  return (
    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${styles[label] ?? ''}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-800">{value}</p>
    </div>
  )
}

export default RitualPage

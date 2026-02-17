import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowLeft, CheckCircle2, Clock, CornerDownLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import DecisionTaskCard from '../components/ritual/DecisionTaskCard'
import RitualVariantFrame from '../components/ritual/RitualVariantFrame'
import SmartTaskInput from '../components/tasks/SmartTaskInput'
import { useSmartTaskInput } from '../lib/useSmartTaskInput'
import { addDays, formatDateKey, formatDueDate, toLocalDateKey } from '../lib/date'
import type { DailyModel, PlannerSnapshot, RitualKind, TaskId } from '../lib/domain'

const RITUAL_COPY = {
  morning: {
    title: 'Morning check-in',
    subtitle: 'Look at today, choose intentionally, then continue calmly.',
    finishLabel: 'Finish morning check-in',
  },
  evening: {
    title: 'Evening review',
    subtitle: 'Close loops with neutral decisions: done, move, or drop.',
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
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-400">Loading ritual...</p>
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
  const resetDecisionTasks = planner.priorTasks
  const commitmentSelectionSet = new Set(selectedCommitmentTaskIds)
  const commitmentSelectionCandidates = planner.activeTasks

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

  // --- Section nodes ---

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

  const commitmentPickerNode = (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Choose commitments</h3>
      <p className="text-xs text-slate-400">
        Keep it intentional. A short list usually feels better than a long one.
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {commitmentSelectionCandidates.map((task) => (
          <div
            key={task._id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700">{task.title}</p>
              <p className="text-xs text-slate-400">
                {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'Unscheduled'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSelectedCommitment(task._id)}
              className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                commitmentSelectionSet.has(task._id)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {commitmentSelectionSet.has(task._id) ? 'Selected' : 'Select'}
            </button>
          </div>
        ))}
      </div>
      {selectedCommitmentTaskIds.length > 3 && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          Supportive reminder: 1-3 commitments is often enough.
        </div>
      )}
    </div>
  )

  const quickAddNode = (
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
  )

  const eveningDecisionNode = (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">What needs a decision?</h3>
      <p className="text-xs text-slate-400">
        For each item, choose what state it is in right now.
      </p>
      <div>
        <p className="text-sm font-medium text-slate-600">Commitments recap</p>
        <p className="text-xs text-slate-400">
          Completed: {finishedCommitments.length} &middot; Still open:{' '}
          {unfinishedCommitments.length}
        </p>
      </div>
      <div className="space-y-2">
        {unfinishedCommitments.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
            No unfinished commitments left.
          </div>
        ) : (
          unfinishedCommitments.map((task) => (
            <DecisionTaskCard
              key={task._id}
              task={task}
              moveDate={moveDateByTaskId[task._id] ?? planner.tomorrowKey}
              onMoveDateChange={setMoveDate}
              onMarkDone={resolveTaskAsDone}
              onMove={resolveTaskAsMove}
              onDrop={resolveTaskAsDrop}
            />
          ))
        )}
      </div>
      <hr className="border-slate-100" />
      <p className="text-sm font-medium text-slate-600">
        Due today that still need a decision
      </p>
      <div className="space-y-2">
        {dueTodayWithoutCommitments.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Nothing else due today needs attention.
          </div>
        ) : (
          dueTodayWithoutCommitments.map((task) => (
            <DecisionTaskCard
              key={task._id}
              task={task}
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
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
            No older dated items need decisions right now.
          </div>
        ) : (
          resetDecisionTasks.map((task) => (
            <DecisionTaskCard
              key={task._id}
              task={task}
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

  const primaryNode =
    kind === 'evening' ? (
      eveningDecisionNode
    ) : (
      <div className="space-y-5">
        {commitmentPickerNode}
        {quickAddNode}
      </div>
    )

  const secondaryNode =
    kind === 'reset' ? (
      resetDecisionNode
    ) : kind === 'evening' ? (
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500">
          Neutral language reminder: if something needs movement, just move it.
        </p>
      </div>
    ) : (
      <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5">
        <Clock size={15} className="mt-0.5 shrink-0 text-indigo-500" />
        <p className="text-xs text-indigo-700">
          Morning check-in is valid even with zero commitments today.
        </p>
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">{ritualCopy.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{ritualCopy.subtitle}</p>
      </div>
      <RitualVariantFrame
        summary={summaryNode}
        primary={primaryNode}
        secondary={secondaryNode}
        footer={footerNode}
      />
    </div>
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

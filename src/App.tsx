import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EnterIcon,
  MoveIcon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons'
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Container,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  SegmentedControl,
  Separator,
  Tabs,
  Text,
  TextField,
  Theme,
} from '@radix-ui/themes'
import { HashRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { api } from '../convex/_generated/api'
import type { Doc, Id } from '../convex/_generated/dataModel'

type TaskDoc = Doc<'tasks'>
type IdeaDoc = Doc<'ideas'>
type RitualKind = 'morning' | 'evening' | 'reset'
type RitualLayoutVariant = 'A' | 'B' | 'C' | 'D' | 'E'

type PlannerSnapshot = {
  todayKey: string
  tomorrowKey: string
  dayAfterKey: string
  yesterdayKey: string
  todayTasks: TaskDoc[]
  tomorrowTasks: TaskDoc[]
  dayAfterTasks: TaskDoc[]
  unscheduledTasks: TaskDoc[]
  laterTasks: TaskDoc[]
  priorTasks: TaskDoc[]
  activeTasks: TaskDoc[]
  yesterdayCompletedCount: number
}

type DailyModel = {
  todayKey: string
  daily: {
    commitmentTaskIds: Id<'tasks'>[]
    morningCompletedAt?: string
    eveningCompletedAt?: string
    resetCompletedAt?: string
  } | null
  commitmentTasks: TaskDoc[]
}

const RITUAL_VARIANT_KEY = 'calm-os.ritual-layout-variant'
const RITUAL_VARIANTS: RitualLayoutVariant[] = ['A', 'B', 'C', 'D', 'E']

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  copy.setDate(copy.getDate() + days)
  return copy
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function formatDateKey(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'Unscheduled'
  return parseDateKey(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function useRitualVariantState() {
  const [variant, setVariant] = useState<RitualLayoutVariant>(() => {
    const rawValue = window.localStorage.getItem(RITUAL_VARIANT_KEY)
    if (!rawValue || !RITUAL_VARIANTS.includes(rawValue as RitualLayoutVariant)) {
      return 'A'
    }
    return rawValue as RitualLayoutVariant
  })

  useEffect(() => {
    window.localStorage.setItem(RITUAL_VARIANT_KEY, variant)
  }, [variant])

  return { variant, setVariant }
}

function AppNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: 'none',
        color: isActive ? 'var(--blue-11)' : 'var(--gray-11)',
        fontWeight: isActive ? 600 : 500,
      })}
    >
      {label}
    </NavLink>
  )
}

function PlannerTaskRow({
  task,
  todayKey,
  isCommitted,
  onToggleCommitment,
  onMarkDone,
  onSetDueDate,
}: {
  task: TaskDoc
  todayKey: string
  isCommitted: boolean
  onToggleCommitment: (taskId: Id<'tasks'>, isCommitted: boolean) => Promise<void>
  onMarkDone: (taskId: Id<'tasks'>) => Promise<void>
  onSetDueDate: (taskId: Id<'tasks'>, dueDate: string | null) => Promise<void>
}) {
  const [isDueDateEditorOpen, setIsDueDateEditorOpen] = useState(false)
  const [dueDateInput, setDueDateInput] = useState(task.dueDate ?? '')
  const [isSavingDate, setIsSavingDate] = useState(false)

  useEffect(() => {
    setDueDateInput(task.dueDate ?? '')
  }, [task.dueDate])

  const dueLabel = task.dueDate === todayKey ? 'Today' : formatDueDate(task.dueDate)

  return (
    <Card size="2" style={{ borderColor: 'var(--gray-a4)' }}>
      <Flex direction="column" gap="2">
        <Flex align="start" justify="between" gap="3">
          <Flex align="start" gap="2">
            <IconButton
              size="1"
              variant="soft"
              aria-label={`Mark ${task.title} done`}
              onClick={() => void onMarkDone(task._id)}
            >
              <CheckCircledIcon />
            </IconButton>
            <Box>
              <Text size="2" weight="medium">
                {task.title}
              </Text>
              <Flex gap="2" mt="1" wrap="wrap">
                <Badge color={task.dueDate === todayKey ? 'blue' : 'gray'}>{dueLabel}</Badge>
                {isCommitted && <Badge color="blue">Committed</Badge>}
              </Flex>
            </Box>
          </Flex>
          <Flex gap="2">
            <Button
              size="1"
              variant={isCommitted ? 'soft' : 'outline'}
              onClick={() => void onToggleCommitment(task._id, isCommitted)}
            >
              {isCommitted ? 'Remove' : 'Commit'}
            </Button>
            <IconButton
              size="1"
              variant="ghost"
              aria-label="Edit due date"
              onClick={() => setIsDueDateEditorOpen((value) => !value)}
            >
              <CalendarIcon />
            </IconButton>
          </Flex>
        </Flex>
        {isDueDateEditorOpen && (
          <Flex align="center" gap="2" wrap="wrap">
            <input
              type="date"
              value={dueDateInput}
              onChange={(event) => setDueDateInput(event.target.value)}
              aria-label={`Due date for ${task.title}`}
              style={{
                border: '1px solid var(--gray-a6)',
                borderRadius: 8,
                padding: '6px 8px',
                background: 'var(--color-surface)',
                color: 'var(--gray-12)',
              }}
            />
            <Button
              size="1"
              variant="outline"
              loading={isSavingDate}
              onClick={async () => {
                try {
                  setIsSavingDate(true)
                  await onSetDueDate(task._id, dueDateInput || null)
                } finally {
                  setIsSavingDate(false)
                }
              }}
            >
              Save date
            </Button>
            <Button
              size="1"
              variant="ghost"
              onClick={async () => {
                try {
                  setIsSavingDate(true)
                  setDueDateInput('')
                  await onSetDueDate(task._id, null)
                } finally {
                  setIsSavingDate(false)
                }
              }}
            >
              Clear
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  )
}

function CollapsibleTaskSection({
  title,
  tasks,
  defaultOpen = false,
  todayKey,
  commitmentTaskIds,
  onToggleCommitment,
  onMarkDone,
  onSetDueDate,
}: {
  title: string
  tasks: TaskDoc[]
  defaultOpen?: boolean
  todayKey: string
  commitmentTaskIds: Set<Id<'tasks'>>
  onToggleCommitment: (taskId: Id<'tasks'>, isCommitted: boolean) => Promise<void>
  onMarkDone: (taskId: Id<'tasks'>) => Promise<void>
  onSetDueDate: (taskId: Id<'tasks'>, dueDate: string | null) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <Card>
      <Flex align="center" justify="between">
        <Button variant="ghost" onClick={() => setIsOpen((value) => !value)}>
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          {title}
        </Button>
        <Badge color="gray">{tasks.length}</Badge>
      </Flex>
      {isOpen && (
        <Flex direction="column" gap="2" mt="3">
          {tasks.length === 0 ? (
            <Text size="2" color="gray">
              Nothing here right now.
            </Text>
          ) : (
            tasks.map((task) => (
              <PlannerTaskRow
                key={task._id}
                task={task}
                todayKey={todayKey}
                isCommitted={commitmentTaskIds.has(task._id)}
                onToggleCommitment={onToggleCommitment}
                onMarkDone={onMarkDone}
                onSetDueDate={onSetDueDate}
              />
            ))
          )}
        </Flex>
      )}
    </Card>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const planner = useQuery(api.tasks.getPlannerSnapshot) as PlannerSnapshot | undefined
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined
  const reentryStatus = useQuery(api.daily.getReentryStatus)
  const createTask = useMutation(api.tasks.createTask)
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const setTaskDueDate = useMutation(api.tasks.setTaskDueDate)
  const addCommitment = useMutation(api.daily.addCommitmentForDate)
  const removeCommitment = useMutation(api.daily.removeCommitmentForDate)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [composerError, setComposerError] = useState('')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [selectedCommitmentCandidate, setSelectedCommitmentCandidate] = useState('')

  if (!planner || !dailyModel || !reentryStatus) {
    return (
      <Card>
        <Text color="gray">Loading your calm dashboard...</Text>
      </Card>
    )
  }

  const commitmentTasks = dailyModel.commitmentTasks.filter((task) => task.status === 'active')
  const completedCommitmentCount = dailyModel.commitmentTasks.filter(
    (task) => task.status === 'done',
  ).length
  const commitmentTaskIds = new Set(commitmentTasks.map((task) => task._id))
  const dueTodayWithoutCommitments = planner.todayTasks.filter((task) => !commitmentTaskIds.has(task._id))
  const hasMorningRitual = Boolean(dailyModel.daily?.morningCompletedAt)
  const hasEveningRitual = Boolean(dailyModel.daily?.eveningCompletedAt)
  const currentHour = new Date().getHours()

  const commitmentCandidates = planner.activeTasks.filter((task) => !commitmentTaskIds.has(task._id))
  const commitmentHint = commitmentTasks.length <= 3 ? '1-3 is plenty for calm focus.' : 'You can commit more, but a short list is gentler.'

  async function handleTaskCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setComposerError('')
    const title = taskTitle.trim()
    if (!title) {
      setComposerError('Add a short task title.')
      return
    }

    try {
      setIsCreatingTask(true)
      await createTask({ title, dueDate: taskDueDate || null })
      setTaskTitle('')
      setTaskDueDate('')
    } catch {
      setComposerError('Could not add that task right now.')
    } finally {
      setIsCreatingTask(false)
    }
  }

  async function handleToggleCommitment(taskId: Id<'tasks'>, isCommitted: boolean) {
    if (isCommitted) {
      await removeCommitment({ dateKey: dailyModel.todayKey, taskId })
    } else {
      await addCommitment({ dateKey: dailyModel.todayKey, taskId })
    }
  }

  async function handleMarkDone(taskId: Id<'tasks'>) {
    await markTaskDone({ taskId })
  }

  async function handleSetDueDate(taskId: Id<'tasks'>, dueDate: string | null) {
    await setTaskDueDate({ taskId, dueDate })
  }

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="3">
        {currentHour < 13 && !hasMorningRitual && (
          <Callout.Root color="blue" variant="soft">
            <Callout.Icon>
              <ClockIcon />
            </Callout.Icon>
            <Callout.Text>
              Want a gentle morning check-in?
              <Button ml="3" size="1" variant="outline" onClick={() => navigate('/ritual/morning')}>
                Start morning ritual
              </Button>
            </Callout.Text>
          </Callout.Root>
        )}
        {currentHour >= 17 && !hasEveningRitual && (
          <Callout.Root color="blue" variant="soft">
            <Callout.Icon>
              <ClockIcon />
            </Callout.Icon>
            <Callout.Text>
              Evening review helps you reset with less carry-over stress.
              <Button ml="3" size="1" variant="outline" onClick={() => navigate('/ritual/evening')}>
                Start evening review
              </Button>
            </Callout.Text>
          </Callout.Root>
        )}
        {reentryStatus.shouldShowResetBanner && (
          <Callout.Root color="blue" variant="surface">
            <Callout.Icon>
              <MoveIcon />
            </Callout.Icon>
            <Callout.Text>
              Want to reset and review what matters now?
              <Button ml="3" size="1" onClick={() => navigate('/ritual/reset')}>
                Open reset review
              </Button>
            </Callout.Text>
          </Callout.Root>
        )}
      </Flex>

      <Card>
        <form onSubmit={handleTaskCreate}>
          <Flex direction={{ initial: 'column', sm: 'row' }} align="end" gap="3">
            <Box grow="1">
              <Text as="label" size="1" color="gray">
                New task
              </Text>
              <TextField.Root
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Capture a task..."
              >
                <TextField.Slot>
                  <PlusIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Box>
              <Text as="label" size="1" color="gray">
                Due date (optional)
              </Text>
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
                style={{
                  border: '1px solid var(--gray-a6)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'var(--color-surface)',
                  color: 'var(--gray-12)',
                  minHeight: 36,
                }}
              />
            </Box>
            <Button type="submit" loading={isCreatingTask}>
              Add task
            </Button>
          </Flex>
          {composerError && (
            <Text size="1" color="gray" mt="2" as="p">
              {composerError}
            </Text>
          )}
        </form>
      </Card>

      <Flex direction={{ initial: 'column', lg: 'row' }} align="start" gap="4">
        <Box grow="1" width="100%">
          <Card>
            <Flex direction="column" gap="4">
              <Box>
                <Heading size="6">Today</Heading>
                <Text color="gray">Focus only on what you want to carry today.</Text>
              </Box>
              <Separator size="4" />
              <Box>
                <Flex align="center" justify="between" mb="2">
                  <Heading size="4">Commitments</Heading>
                  <Badge color="blue" size="2">
                    {commitmentTasks.length}
                  </Badge>
                </Flex>
                <Text size="2" color="gray">
                  {commitmentHint}
                </Text>
                <Flex gap="2" mt="3" wrap="wrap">
                  <select
                    value={selectedCommitmentCandidate}
                    onChange={(event) => setSelectedCommitmentCandidate(event.target.value)}
                    style={{
                      border: '1px solid var(--gray-a6)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      minWidth: 220,
                      background: 'var(--color-surface)',
                      color: 'var(--gray-12)',
                    }}
                  >
                    <option value="">Add a task to commitments...</option>
                    {commitmentCandidates.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!selectedCommitmentCandidate}
                    onClick={async () => {
                      if (!selectedCommitmentCandidate) return
                      await addCommitment({
                        dateKey: dailyModel.todayKey,
                        taskId: selectedCommitmentCandidate as Id<'tasks'>,
                      })
                      setSelectedCommitmentCandidate('')
                    }}
                  >
                    Add commitment
                  </Button>
                </Flex>
                <Flex direction="column" gap="2" mt="3">
                  {commitmentTasks.length === 0 ? (
                    <Card variant="surface">
                      <Text size="2" color="gray">
                        No commitments yet. You can still have a calm day with zero commitments.
                      </Text>
                    </Card>
                  ) : (
                    commitmentTasks.map((task) => (
                      <PlannerTaskRow
                        key={task._id}
                        task={task}
                        todayKey={planner.todayKey}
                        isCommitted
                        onToggleCommitment={handleToggleCommitment}
                        onMarkDone={handleMarkDone}
                        onSetDueDate={handleSetDueDate}
                      />
                    ))
                  )}
                  {completedCommitmentCount > 0 && (
                    <Text size="1" color="gray">
                      {completedCommitmentCount} commitment{completedCommitmentCount > 1 ? 's' : ''} already completed today.
                    </Text>
                  )}
                </Flex>
              </Box>
              <Separator size="4" />
              <Box>
                <Flex align="center" justify="between" mb="2">
                  <Heading size="4">Due today</Heading>
                  <Badge color="gray">{dueTodayWithoutCommitments.length}</Badge>
                </Flex>
                <Flex direction="column" gap="2">
                  {dueTodayWithoutCommitments.length === 0 ? (
                    <Card variant="surface">
                      <Text size="2" color="gray">
                        Nothing else due today.
                      </Text>
                    </Card>
                  ) : (
                    dueTodayWithoutCommitments.map((task) => (
                      <PlannerTaskRow
                        key={task._id}
                        task={task}
                        todayKey={planner.todayKey}
                        isCommitted={false}
                        onToggleCommitment={handleToggleCommitment}
                        onMarkDone={handleMarkDone}
                        onSetDueDate={handleSetDueDate}
                      />
                    ))
                  )}
                </Flex>
              </Box>
            </Flex>
          </Card>
        </Box>
        <Box width={{ initial: '100%', lg: '380px' }}>
          <Flex direction="column" gap="3">
            <CollapsibleTaskSection
              title={`Tomorrow (${formatDateKey(planner.tomorrowKey)})`}
              tasks={planner.tomorrowTasks}
              todayKey={planner.todayKey}
              commitmentTaskIds={commitmentTaskIds}
              onToggleCommitment={handleToggleCommitment}
              onMarkDone={handleMarkDone}
              onSetDueDate={handleSetDueDate}
            />
            <CollapsibleTaskSection
              title={`Day after (${formatDateKey(planner.dayAfterKey)})`}
              tasks={planner.dayAfterTasks}
              todayKey={planner.todayKey}
              commitmentTaskIds={commitmentTaskIds}
              onToggleCommitment={handleToggleCommitment}
              onMarkDone={handleMarkDone}
              onSetDueDate={handleSetDueDate}
            />
            <CollapsibleTaskSection
              title="Unscheduled"
              tasks={planner.unscheduledTasks}
              defaultOpen
              todayKey={planner.todayKey}
              commitmentTaskIds={commitmentTaskIds}
              onToggleCommitment={handleToggleCommitment}
              onMarkDone={handleMarkDone}
              onSetDueDate={handleSetDueDate}
            />
            <CollapsibleTaskSection
              title="Later"
              tasks={planner.laterTasks}
              todayKey={planner.todayKey}
              commitmentTaskIds={commitmentTaskIds}
              onToggleCommitment={handleToggleCommitment}
              onMarkDone={handleMarkDone}
              onSetDueDate={handleSetDueDate}
            />
            {planner.priorTasks.length > 0 && (
              <Callout.Root color="gray" variant="surface">
                <Callout.Icon>
                  <ClockIcon />
                </Callout.Icon>
                <Callout.Text>
                  {planner.priorTasks.length} earlier item
                  {planner.priorTasks.length > 1 ? 's are' : ' is'} waiting for a decision.
                  <Button ml="3" size="1" variant="outline" onClick={() => navigate('/ritual/reset')}>
                    Reset review
                  </Button>
                </Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Box>
      </Flex>
    </Flex>
  )
}

function IdeasPage() {
  const ideas = useQuery(api.ideas.listIdeas) as IdeaDoc[] | undefined
  const createIdea = useMutation(api.ideas.createIdea)
  const moveIdea = useMutation(api.ideas.moveIdea)
  const archiveIdea = useMutation(api.ideas.archiveIdea)

  const [ideaTitle, setIdeaTitle] = useState('')
  const [ideaError, setIdeaError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIdeaError('')
    const title = ideaTitle.trim()
    if (!title) {
      setIdeaError('Add an idea title first.')
      return
    }

    try {
      setIsSubmitting(true)
      await createIdea({ title })
      setIdeaTitle('')
    } catch {
      setIdeaError('Could not add that idea right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!ideas) {
    return (
      <Card>
        <Text color="gray">Loading ideas...</Text>
      </Card>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Heading size="5">Ideas</Heading>
        <Text color="gray" as="p" mt="1">
          Ideas are optional, incubating thoughts. Keep them light.
        </Text>
        <form onSubmit={handleCreateIdea}>
          <Flex direction={{ initial: 'column', sm: 'row' }} align="end" gap="2" mt="3">
            <Box grow="1">
              <Text as="label" size="1" color="gray">
                New idea
              </Text>
              <TextField.Root
                value={ideaTitle}
                onChange={(event) => setIdeaTitle(event.target.value)}
                placeholder="Capture an idea..."
              >
                <TextField.Slot>
                  <PlusIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Button type="submit" loading={isSubmitting}>
              Add idea
            </Button>
          </Flex>
        </form>
        {ideaError && (
          <Text size="1" color="gray" mt="2">
            {ideaError}
          </Text>
        )}
      </Card>
      <Card>
        <Flex align="center" justify="between" mb="3">
          <Heading size="4">Ranked list</Heading>
          <Badge color="blue">{ideas.length}</Badge>
        </Flex>
        {ideas.length === 0 ? (
          <Text size="2" color="gray">
            No ideas yet.
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {ideas.map((idea, index) => (
              <Card key={idea._id} variant="surface">
                <Flex align="start" justify="between" gap="3">
                  <Flex gap="2" align="start">
                    <Badge color="gray">#{index + 1}</Badge>
                    <Text>{idea.title}</Text>
                  </Flex>
                  <Flex gap="1">
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Move ${idea.title} up`}
                      disabled={index === 0}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'up' })}
                    >
                      <ArrowUpIcon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Move ${idea.title} down`}
                      disabled={index === ideas.length - 1}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'down' })}
                    >
                      <ArrowDownIcon />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Archive ${idea.title}`}
                      onClick={() => void archiveIdea({ ideaId: idea._id })}
                    >
                      <TrashIcon />
                    </IconButton>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  )
}

function DecisionTaskCard({
  task,
  moveDate,
  onMoveDateChange,
  onMarkDone,
  onMove,
  onDrop,
}: {
  task: TaskDoc
  moveDate: string
  onMoveDateChange: (taskId: Id<'tasks'>, date: string) => void
  onMarkDone: (taskId: Id<'tasks'>) => Promise<void>
  onMove: (taskId: Id<'tasks'>, date: string) => Promise<void>
  onDrop: (taskId: Id<'tasks'>) => Promise<void>
}) {
  return (
    <Card>
      <Flex direction="column" gap="2">
        <Text weight="medium">{task.title}</Text>
        <Text size="1" color="gray">
          {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'Unscheduled'}
        </Text>
        <Flex gap="2" wrap="wrap">
          <Button size="1" variant="outline" onClick={() => void onMarkDone(task._id)}>
            I did it
          </Button>
          <Button
            size="1"
            variant="outline"
            onClick={() => void onMove(task._id, moveDate)}
          >
            Move
          </Button>
          <Button size="1" variant="ghost" color="gray" onClick={() => void onDrop(task._id)}>
            Drop
          </Button>
          <input
            type="date"
            value={moveDate}
            onChange={(event) => onMoveDateChange(task._id, event.target.value)}
            style={{
              border: '1px solid var(--gray-a6)',
              borderRadius: 8,
              padding: '4px 8px',
              background: 'var(--color-surface)',
              color: 'var(--gray-12)',
              minHeight: 30,
            }}
          />
        </Flex>
      </Flex>
    </Card>
  )
}

function RitualLayoutSwitcher({
  variant,
  onVariantChange,
}: {
  variant: RitualLayoutVariant
  onVariantChange: (variant: RitualLayoutVariant) => void
}) {
  return (
    <Flex align="center" gap="2">
      <Text size="2" color="gray">
        Layout:
      </Text>
      <SegmentedControl.Root value={variant} onValueChange={(value) => onVariantChange(value as RitualLayoutVariant)}>
        {RITUAL_VARIANTS.map((option) => (
          <SegmentedControl.Item key={option} value={option}>
            {option}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </Flex>
  )
}

function RitualVariantFrame({
  variant,
  summary,
  primary,
  secondary,
  footer,
}: {
  variant: RitualLayoutVariant
  summary: ReactNode
  primary: ReactNode
  secondary: ReactNode
  footer: ReactNode
}) {
  if (variant === 'A') {
    return (
      <Flex direction="column" gap="4">
        <Card>{summary}</Card>
        <Card>{primary}</Card>
        <Card>{secondary}</Card>
        <Card>{footer}</Card>
      </Flex>
    )
  }

  if (variant === 'B') {
    return (
      <Card>
        <Tabs.Root defaultValue="scan">
          <Tabs.List>
            <Tabs.Trigger value="scan">Scan</Tabs.Trigger>
            <Tabs.Trigger value="choose">Choose</Tabs.Trigger>
            <Tabs.Trigger value="decide">Decide</Tabs.Trigger>
            <Tabs.Trigger value="finish">Finish</Tabs.Trigger>
          </Tabs.List>
          <Box pt="3">
            <Tabs.Content value="scan">{summary}</Tabs.Content>
            <Tabs.Content value="choose">{primary}</Tabs.Content>
            <Tabs.Content value="decide">{secondary}</Tabs.Content>
            <Tabs.Content value="finish">{footer}</Tabs.Content>
          </Box>
        </Tabs.Root>
      </Card>
    )
  }

  if (variant === 'C') {
    return (
      <Flex direction={{ initial: 'column', lg: 'row' }} gap="4">
        <Box width={{ initial: '100%', lg: '34%' }}>
          <Card>{summary}</Card>
        </Box>
        <Box grow="1">
          <Flex direction="column" gap="4">
            <Card>{primary}</Card>
            <Card>{secondary}</Card>
            <Card>{footer}</Card>
          </Flex>
        </Box>
      </Flex>
    )
  }

  if (variant === 'D') {
    return (
      <Flex direction="column" gap="3">
        <Card>
          <Flex gap="2" wrap="wrap">
            <Badge color="blue">1. Scan</Badge>
            <Badge color="blue">2. Choose</Badge>
            <Badge color="blue">3. Decide</Badge>
            <Badge color="blue">4. Close</Badge>
          </Flex>
        </Card>
        <Card>{summary}</Card>
        <Card>{primary}</Card>
        <Card>{secondary}</Card>
        <Card>{footer}</Card>
      </Flex>
    )
  }

  return (
    <Flex direction="column" align="center" gap="4">
      <Box width={{ initial: '100%', md: '80%', lg: '72%' }}>
        <Card>{summary}</Card>
      </Box>
      <Box width={{ initial: '100%', md: '80%', lg: '72%' }}>
        <Card>{primary}</Card>
      </Box>
      <Box width={{ initial: '100%', md: '80%', lg: '72%' }}>
        <Card>{secondary}</Card>
      </Box>
      <Box width={{ initial: '100%', md: '80%', lg: '72%' }}>
        <Card>{footer}</Card>
      </Box>
    </Flex>
  )
}

function RitualPage({ kind }: { kind: RitualKind }) {
  const navigate = useNavigate()
  const planner = useQuery(api.tasks.getPlannerSnapshot) as PlannerSnapshot | undefined
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined
  const setCommitmentsForDate = useMutation(api.daily.setCommitmentsForDate)
  const markRitualCompleted = useMutation(api.daily.markRitualCompleted)
  const createTask = useMutation(api.tasks.createTask)
  const markTaskDone = useMutation(api.tasks.markTaskDone)
  const setTaskDueDate = useMutation(api.tasks.setTaskDueDate)
  const dropTask = useMutation(api.tasks.dropTask)
  const { variant, setVariant } = useRitualVariantState()

  const [selectedCommitmentTaskIds, setSelectedCommitmentTaskIds] = useState<Id<'tasks'>[]>([])
  const [initializedDateKey, setInitializedDateKey] = useState('')
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddDueDate, setQuickAddDueDate] = useState('')
  const [ritualError, setRitualError] = useState('')
  const [isFinishing, setIsFinishing] = useState(false)
  const [moveDateByTaskId, setMoveDateByTaskId] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!planner || !dailyModel) {
      return
    }

    if (initializedDateKey === dailyModel.todayKey) {
      return
    }

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

  if (!planner || !dailyModel) {
    return (
      <Card>
        <Text color="gray">Loading ritual...</Text>
      </Card>
    )
  }

  const commitmentTasks = dailyModel.commitmentTasks
  const commitmentTaskIds = new Set((dailyModel.daily?.commitmentTaskIds ?? []).map((id) => id))
  const unfinishedCommitments = commitmentTasks.filter((task) => task.status === 'active')
  const finishedCommitments = commitmentTasks.filter((task) => task.status === 'done')
  const dueTodayWithoutCommitments = planner.todayTasks.filter((task) => !commitmentTaskIds.has(task._id))
  const resetDecisionTasks = planner.priorTasks
  const commitmentSelectionSet = new Set(selectedCommitmentTaskIds)

  const ritualCopy = {
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
  }[kind]

  const commitmentSelectionCandidates = planner.activeTasks

  async function handleQuickAddTask() {
    const title = quickAddTitle.trim()
    if (!title) return
    await createTask({ title, dueDate: quickAddDueDate || null })
    setQuickAddTitle('')
    setQuickAddDueDate('')
  }

  function toggleSelectedCommitment(taskId: Id<'tasks'>) {
    setSelectedCommitmentTaskIds((previous) =>
      previous.includes(taskId)
        ? previous.filter((id) => id !== taskId)
        : [...previous, taskId],
    )
  }

  function setMoveDate(taskId: Id<'tasks'>, date: string) {
    setMoveDateByTaskId((previous) => ({ ...previous, [taskId]: date }))
  }

  async function resolveTaskAsDone(taskId: Id<'tasks'>) {
    await markTaskDone({ taskId })
  }

  async function resolveTaskAsDrop(taskId: Id<'tasks'>) {
    await dropTask({ taskId })
  }

  async function resolveTaskAsMove(taskId: Id<'tasks'>, date: string) {
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
          dateKey: dailyModel.todayKey,
          taskIds: selectedCommitmentTaskIds,
        })
      }
      await markRitualCompleted({
        dateKey: dailyModel.todayKey,
        ritual: kind,
      })
      navigate('/')
    } catch {
      setRitualError('Could not save this ritual yet. Please try again.')
    } finally {
      setIsFinishing(false)
    }
  }

  const summaryNode = (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center" wrap="wrap" gap="2">
        <Heading size="5">{ritualCopy.title}</Heading>
        <Badge color="blue">{formatDateKey(planner.todayKey)}</Badge>
      </Flex>
      <Text color="gray">{ritualCopy.subtitle}</Text>
      <Flex gap="3" wrap="wrap">
        <Card variant="surface">
          <Text size="1" color="gray">
            Due today
          </Text>
          <Heading size="4">{planner.todayTasks.length}</Heading>
        </Card>
        <Card variant="surface">
          <Text size="1" color="gray">
            Tomorrow + day after
          </Text>
          <Heading size="4">{planner.tomorrowTasks.length + planner.dayAfterTasks.length}</Heading>
        </Card>
        <Card variant="surface">
          <Text size="1" color="gray">
            Completed yesterday
          </Text>
          <Heading size="4">{planner.yesterdayCompletedCount}</Heading>
        </Card>
      </Flex>
    </Flex>
  )

  const commitmentPickerNode = (
    <Flex direction="column" gap="3">
      <Heading size="4">Choose commitments</Heading>
      <Text size="2" color="gray">
        Keep it intentional. A short list usually feels better than a long one.
      </Text>
      <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 280 }}>
        <Flex direction="column" gap="2">
          {commitmentSelectionCandidates.map((task) => (
            <Card key={task._id} variant="surface">
              <Flex align="center" justify="between" gap="2">
                <Box>
                  <Text weight="medium">{task.title}</Text>
                  <Text size="1" color="gray">
                    {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'Unscheduled'}
                  </Text>
                </Box>
                <Button
                  size="1"
                  variant={commitmentSelectionSet.has(task._id) ? 'solid' : 'outline'}
                  onClick={() => toggleSelectedCommitment(task._id)}
                >
                  {commitmentSelectionSet.has(task._id) ? 'Selected' : 'Select'}
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      </ScrollArea>
      {selectedCommitmentTaskIds.length > 3 && (
        <Callout.Root color="blue" variant="soft">
          <Callout.Text>Supportive reminder: 1-3 commitments is often enough.</Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  )

  const quickAddNode = (
    <Flex direction="column" gap="2">
      <Heading size="3">Quick add</Heading>
      <Flex direction={{ initial: 'column', sm: 'row' }} gap="2">
        <TextField.Root
          value={quickAddTitle}
          onChange={(event) => setQuickAddTitle(event.target.value)}
          placeholder="Add a task while you review"
        >
          <TextField.Slot>
            <PlusIcon />
          </TextField.Slot>
        </TextField.Root>
        <input
          type="date"
          value={quickAddDueDate}
          onChange={(event) => setQuickAddDueDate(event.target.value)}
          style={{
            border: '1px solid var(--gray-a6)',
            borderRadius: 8,
            padding: '8px 10px',
            background: 'var(--color-surface)',
            color: 'var(--gray-12)',
            minHeight: 36,
          }}
        />
        <Button variant="outline" onClick={() => void handleQuickAddTask()}>
          <PlusIcon />
          Add
        </Button>
      </Flex>
    </Flex>
  )

  const eveningDecisionNode = (
    <Flex direction="column" gap="3">
      <Heading size="4">What needs a decision?</Heading>
      <Text size="2" color="gray">
        For each item, choose what state it is in right now.
      </Text>
      <Box>
        <Text size="2" weight="medium">
          Commitments recap
        </Text>
        <Text size="1" color="gray">
          Completed: {finishedCommitments.length} · Still open: {unfinishedCommitments.length}
        </Text>
      </Box>
      <Flex direction="column" gap="2">
        {unfinishedCommitments.length === 0 ? (
          <Card variant="surface">
            <Text size="2" color="gray">
              No unfinished commitments left.
            </Text>
          </Card>
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
      </Flex>
      <Separator size="4" />
      <Box>
        <Text size="2" weight="medium">
          Due today that still need a decision
        </Text>
      </Box>
      <Flex direction="column" gap="2">
        {dueTodayWithoutCommitments.length === 0 ? (
          <Card variant="surface">
            <Text size="2" color="gray">
              Nothing else due today needs attention.
            </Text>
          </Card>
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
      </Flex>
    </Flex>
  )

  const resetDecisionNode = (
    <Flex direction="column" gap="3">
      <Heading size="4">Reset decisions</Heading>
      <Text size="2" color="gray">
        Keep attention on today + next two days, then clear older items lightly.
      </Text>
      <Flex gap="3" wrap="wrap">
        <Badge color="gray">Today: {planner.todayTasks.length}</Badge>
        <Badge color="gray">Tomorrow: {planner.tomorrowTasks.length}</Badge>
        <Badge color="gray">Day after: {planner.dayAfterTasks.length}</Badge>
      </Flex>
      <Separator size="4" />
      <Text size="2" weight="medium">
        Earlier items to review
      </Text>
      <Flex direction="column" gap="2">
        {resetDecisionTasks.length === 0 ? (
          <Card variant="surface">
            <Text size="2" color="gray">
              No older dated items need decisions right now.
            </Text>
          </Card>
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
      </Flex>
    </Flex>
  )

  const footerNode = (
    <Flex direction="column" gap="3">
      <Text size="2" color="gray">
        You can complete this ritual even if you commit to nothing or leave everything unchanged.
      </Text>
      {ritualError && (
        <Callout.Root color="gray" variant="soft">
          <Callout.Text>{ritualError}</Callout.Text>
        </Callout.Root>
      )}
      <Flex align="center" justify="between">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeftIcon />
          Back to today
        </Button>
        <Button onClick={() => void finishRitualAndExit()} loading={isFinishing}>
          {ritualCopy.finishLabel}
          <EnterIcon />
        </Button>
      </Flex>
    </Flex>
  )

  const primaryNode = kind === 'evening' ? eveningDecisionNode : (
    <Flex direction="column" gap="4">
      {commitmentPickerNode}
      {quickAddNode}
    </Flex>
  )

  const secondaryNode = kind === 'reset' ? resetDecisionNode : kind === 'evening' ? (
    <Callout.Root color="gray" variant="surface">
      <Callout.Icon>
        <CheckCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        Neutral language reminder: if something needs movement, just move it.
      </Callout.Text>
    </Callout.Root>
  ) : (
    <Callout.Root color="blue" variant="soft">
      <Callout.Icon>
        <ClockIcon />
      </Callout.Icon>
      <Callout.Text>
        Morning check-in is valid even with zero commitments today.
      </Callout.Text>
    </Callout.Root>
  )

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction={{ initial: 'column', md: 'row' }} align={{ initial: 'start', md: 'center' }} justify="between" gap="3">
          <Box>
            <Heading size="6">{ritualCopy.title}</Heading>
            <Text color="gray">{ritualCopy.subtitle}</Text>
          </Box>
          <RitualLayoutSwitcher variant={variant} onVariantChange={setVariant} />
        </Flex>
      </Card>
      <RitualVariantFrame
        variant={variant}
        summary={summaryNode}
        primary={primaryNode}
        secondary={secondaryNode}
        footer={footerNode}
      />
    </Flex>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const dailyModel = useQuery(api.daily.getTodayDailyModel) as DailyModel | undefined

  return (
    <Flex direction="column" style={{ minHeight: '100vh', backgroundColor: 'var(--gray-2)' }}>
      <Box
        style={{
          borderBottom: '1px solid var(--gray-a5)',
          backgroundColor: 'var(--color-background)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}
      >
        <Container size="4">
          <Flex align="center" justify="between" py="3" gap="3" wrap="wrap">
            <Flex align="center" gap="4">
              <Heading size="4">Calm OS</Heading>
              <AppNavLink to="/" label="Today" />
              <AppNavLink to="/ideas" label="Ideas" />
            </Flex>
            <Flex align="center" gap="2" wrap="wrap">
              <Button
                size="2"
                variant={dailyModel?.daily?.morningCompletedAt ? 'soft' : 'outline'}
                onClick={() => navigate('/ritual/morning')}
              >
                <ArrowRightIcon />
                Morning check-in
              </Button>
              <Button
                size="2"
                variant={dailyModel?.daily?.eveningCompletedAt ? 'soft' : 'outline'}
                onClick={() => navigate('/ritual/evening')}
              >
                <ArrowRightIcon />
                Evening review
              </Button>
              <Button size="2" variant="ghost" onClick={() => navigate('/ritual/reset')}>
                <ClockIcon />
                Reset
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>
      <Container size="4" py="4">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/ritual/morning" element={<RitualPage kind="morning" />} />
          <Route path="/ritual/evening" element={<RitualPage kind="evening" />} />
          <Route path="/ritual/reset" element={<RitualPage kind="reset" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </Flex>
  )
}

function App() {
  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="large">
      <HashRouter>
        <AppShell />
      </HashRouter>
    </Theme>
  )
}

export default App

import type { Doc, Id } from '../../convex/_generated/dataModel'

export type TaskDoc = Doc<'tasks'>
export type IdeaDoc = Doc<'ideas'>
export type TaskId = Id<'tasks'>

export type RitualKind = 'morning' | 'evening' | 'reset'

export type PlannerSnapshot = {
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

export type DailyModel = {
  todayKey: string
  daily: {
    commitmentTaskIds: Id<'tasks'>[]
    morningCompletedAt?: string
    eveningCompletedAt?: string
    resetCompletedAt?: string
  } | null
  commitmentTasks: TaskDoc[]
}

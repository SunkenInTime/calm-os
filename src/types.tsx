export type TaskStatus = "pending" | "done" | "dropped"

export interface Task {
    id: string
    title: string
    dueDate: string | null // ISO string or null
    status: TaskStatus
    createdAt: string
}

export interface Idea {
    id: string
    title: string
    rank: number
    createdAt: string
}

export interface DailyCommitment {
    date: string // YYYY-MM-DD
    taskIds: string[]
}
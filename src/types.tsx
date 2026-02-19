export type TaskStatus = "active" | "done" | "dropped"

export interface Task {
    id: string
    title: string
    dueDate: string | null // YYYY-MM-DD or null
    status: TaskStatus
    createdAt: string
    updatedAt: string
    completedAt?: string
    droppedAt?: string
}

export interface Idea {
    id: string
    title: string
    rank: number
    status: "active" | "archived"
    createdAt: string
    updatedAt: string
    archivedAt?: string
}

export interface DailyCommitment {
    date: string // YYYY-MM-DD
    taskIds: string[]
}
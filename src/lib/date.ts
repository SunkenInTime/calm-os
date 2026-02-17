export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setHours(12, 0, 0, 0)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function formatDateKey(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'Unscheduled'
  return parseDateKey(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

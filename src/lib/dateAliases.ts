import { addDays, toLocalDateKey } from './date'

export type ParsedAlias = {
  alias: string
  dateKey: string
  label: string
  startIndex: number
  endIndex: number
}

const ALIAS_PATTERN =
  /\b(TD|TM|TODAY|TOMORROW|MON|MONDAY|TUE|TUES|TUESDAY|WED|WEDNESDAY|THU|THUR|THURS|THURSDAY|FRI|FRIDAY|SAT|SATURDAY|SUN|SUNDAY)\b/gi

const DAY_NAME_MAP: Record<string, number> = {
  SUN: 0,
  SUNDAY: 0,
  MON: 1,
  MONDAY: 1,
  TUE: 2,
  TUES: 2,
  TUESDAY: 2,
  WED: 3,
  WEDNESDAY: 3,
  THU: 4,
  THUR: 4,
  THURS: 4,
  THURSDAY: 4,
  FRI: 5,
  FRIDAY: 5,
  SAT: 6,
  SATURDAY: 6,
}

function resolveAlias(alias: string): { dateKey: string; label: string } {
  const upper = alias.toUpperCase()
  const now = new Date()

  if (upper === 'TD' || upper === 'TODAY') {
    return { dateKey: toLocalDateKey(now), label: 'Today' }
  }

  if (upper === 'TM' || upper === 'TOMORROW') {
    return { dateKey: toLocalDateKey(addDays(now, 1)), label: 'Tomorrow' }
  }

  const targetDay = DAY_NAME_MAP[upper]
  if (targetDay !== undefined) {
    const currentDay = now.getDay()
    let daysAhead = targetDay - currentDay
    if (daysAhead <= 0) daysAhead += 7
    const target = addDays(now, daysAhead)
    const label = target.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    return { dateKey: toLocalDateKey(target), label }
  }

  return { dateKey: toLocalDateKey(now), label: 'Today' }
}

export function parseDateAlias(input: string): ParsedAlias | null {
  let lastMatch: ParsedAlias | null = null
  let match: RegExpExecArray | null

  ALIAS_PATTERN.lastIndex = 0
  while ((match = ALIAS_PATTERN.exec(input)) !== null) {
    const { dateKey, label } = resolveAlias(match[1])
    lastMatch = {
      alias: match[1],
      dateKey,
      label,
      startIndex: match.index,
      endIndex: match.index + match[1].length,
    }
  }

  return lastMatch
}

export function stripAlias(input: string, alias: ParsedAlias): string {
  const before = input.slice(0, alias.startIndex)
  const after = input.slice(alias.endIndex)
  return (before + after).replace(/\s{2,}/g, ' ').trim()
}

export type ParsedSessionDuration = {
  cleanTitle: string
  sessionLengthMinutes: number | null
}

export type SessionDurationMatch = {
  value: string
  sessionLengthMinutes: number
  startIndex: number
  endIndex: number
}

const DURATION_PATTERN =
  /\b(?:for\s+)?(\d+)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m)\b/gi

function normalizeUnit(unit: string) {
  const lower = unit.toLowerCase()
  if (lower.startsWith('h')) {
    return 'hours'
  }
  return 'minutes'
}

function toMinutes(value: number, unit: string) {
  return normalizeUnit(unit) === 'hours' ? value * 60 : value
}

function cleanWhitespace(value: string) {
  return value.replace(/\s{2,}/g, ' ').trim()
}

export function findSessionDurationMatches(input: string): SessionDurationMatch[] {
  const matches: SessionDurationMatch[] = []
  let match: RegExpExecArray | null

  DURATION_PATTERN.lastIndex = 0
  while ((match = DURATION_PATTERN.exec(input)) !== null) {
    const amount = Number.parseInt(match[1], 10)
    if (!Number.isFinite(amount) || amount <= 0) {
      continue
    }

    matches.push({
      value: match[0],
      sessionLengthMinutes: toMinutes(amount, match[2]),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return matches
}

export function extractSessionDuration(input: string): ParsedSessionDuration {
  const trimmed = input.trim()
  if (!trimmed) {
    return { cleanTitle: '', sessionLengthMinutes: null }
  }

  const matches = findSessionDurationMatches(trimmed)
  const primaryMatch = matches[0]
  if (!primaryMatch) {
    return {
      cleanTitle: trimmed,
      sessionLengthMinutes: null,
    }
  }

  const withoutDuration = cleanWhitespace(
    `${trimmed.slice(0, primaryMatch.startIndex)} ${trimmed.slice(primaryMatch.endIndex)}`,
  )

  return {
    cleanTitle: withoutDuration,
    sessionLengthMinutes: primaryMatch.sessionLengthMinutes,
  }
}

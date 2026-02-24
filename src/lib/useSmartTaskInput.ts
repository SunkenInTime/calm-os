import { useState } from 'react'
import { parseDateAlias, stripAlias } from './dateAliases'
import { extractSessionDuration } from './sessionDuration'

type TaskDraft = {
  title: string
  dueDate: string | null
  sessionLengthMinutes: number | null
}

export function useSmartTaskInput() {
  const [title, setTitle] = useState('')
  const [resolvedDate, setResolvedDate] = useState<string | null>(null)

  function getCleanTitle(): string {
    const alias = parseDateAlias(title)
    return alias ? stripAlias(title, alias) : title.trim()
  }

  function getTaskDraft(): TaskDraft {
    const alias = parseDateAlias(title)
    const baseTitle = alias ? stripAlias(title, alias) : title.trim()
    const { cleanTitle, sessionLengthMinutes } = extractSessionDuration(baseTitle)
    return {
      title: cleanTitle,
      dueDate: alias ? alias.dateKey : resolvedDate,
      sessionLengthMinutes,
    }
  }

  function reset() {
    setTitle('')
    setResolvedDate(null)
  }

  return {
    title,
    setTitle,
    resolvedDate,
    setResolvedDate,
    getCleanTitle,
    getTaskDraft,
    reset,
  }
}

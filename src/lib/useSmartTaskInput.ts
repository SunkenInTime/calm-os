import { useState } from 'react'
import { parseDateAlias, stripAlias } from './dateAliases'

export function useSmartTaskInput() {
  const [title, setTitle] = useState('')
  const [resolvedDate, setResolvedDate] = useState<string | null>(null)

  function getCleanTitle(): string {
    const alias = parseDateAlias(title)
    return alias ? stripAlias(title, alias) : title.trim()
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
    reset,
  }
}

import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { TaskId } from './domain'

export type ColumnKey = 'commitments' | 'today' | 'tomorrow' | 'dayAfter' | 'unscheduled' | 'later'

export type DropHandler = (taskId: TaskId, sourceColumn: ColumnKey, targetColumn: ColumnKey) => void

export function useDragAndDrop(onDrop: DropHandler) {
  const [activeDropColumn, setActiveDropColumn] = useState<ColumnKey | null>(null)
  const draggedRef = useRef<{ taskId: TaskId; sourceColumn: ColumnKey } | null>(null)

  const handleDragStart = useCallback(
    (event: DragEvent, taskId: TaskId, sourceColumn: ColumnKey) => {
      draggedRef.current = { taskId, sourceColumn }
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', taskId)
    },
    [],
  )

  const handleDragOver = useCallback(
    (event: DragEvent, columnKey: ColumnKey) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setActiveDropColumn(columnKey)
    },
    [],
  )

  const handleDragLeave = useCallback(
    (event: DragEvent, columnKey: ColumnKey) => {
      const related = event.relatedTarget as Node | null
      const current = event.currentTarget as Node
      if (related && current.contains(related)) return
      setActiveDropColumn((prev) => (prev === columnKey ? null : prev))
    },
    [],
  )

  const handleDrop = useCallback(
    (event: DragEvent, targetColumn: ColumnKey) => {
      event.preventDefault()
      setActiveDropColumn(null)
      const dragged = draggedRef.current
      if (!dragged) return
      draggedRef.current = null
      if (dragged.sourceColumn === targetColumn) return
      onDrop(dragged.taskId, dragged.sourceColumn, targetColumn)
    },
    [onDrop],
  )

  const handleDragEnd = useCallback(() => {
    draggedRef.current = null
    setActiveDropColumn(null)
  }, [])

  return {
    activeDropColumn,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  }
}

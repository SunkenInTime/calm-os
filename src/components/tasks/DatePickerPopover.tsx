import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toLocalDateKey } from '../../lib/date'

type DatePickerPopoverProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (dateKey: string) => void
  selectedDate: string | null
  anchorRef: React.RefObject<HTMLElement | null>
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DatePickerPopover({
  isOpen,
  onClose,
  onSelect,
  selectedDate,
  anchorRef,
}: DatePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [viewDate, setViewDate] = useState(() => new Date())

  useEffect(() => {
    if (!isOpen) return
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number)
      setViewDate(new Date(y, m - 1, d))
    } else {
      setViewDate(new Date())
    }
  }, [isOpen, selectedDate])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toLocalDateKey(new Date())

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-medium text-slate-700">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-7 items-center justify-center text-[10px] font-medium text-slate-400"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-7" />
          }
          const dateKey = toLocalDateKey(new Date(year, month, day))
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => {
                onSelect(dateKey)
                onClose()
              }}
              className={`flex h-7 w-full items-center justify-center rounded-md text-xs transition-colors ${
                isSelected
                  ? 'bg-indigo-600 font-medium text-white'
                  : isToday
                    ? 'bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-100'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          onSelect(todayKey)
          onClose()
        }}
        className="mt-2 w-full rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
      >
        Today
      </button>
    </div>
  )
}

export default DatePickerPopover

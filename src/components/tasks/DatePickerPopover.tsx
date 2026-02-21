import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toLocalDateKey } from '../../lib/date'

type DatePickerPopoverProps = {
  isOpen: boolean
  onClose: () => void
  onSelect: (dateKey: string) => void
  selectedDate: string | null
  anchorRef: React.RefObject<HTMLElement | null>
  align?: 'left' | 'right'
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DatePickerPopover({
  isOpen,
  onClose,
  onSelect,
  selectedDate,
  anchorRef,
  align = 'right',
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
      className={`calm-datepicker absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full z-50 mt-1.5 w-72 rounded-xl border border-slate-200/80 bg-white p-3.5`}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="calm-datepicker-nav rounded-lg p-1.5 text-slate-400"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-semibold tracking-tight text-slate-700">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="calm-datepicker-nav rounded-lg p-1.5 text-slate-400"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-slate-400"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-8" />
          }
          const dateKey = toLocalDateKey(new Date(year, month, day))
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate

          return (
            <button
              key={dateKey}
              type="button"
              data-today={isToday}
              data-selected={isSelected}
              onClick={() => {
                onSelect(dateKey)
                onClose()
              }}
              className="calm-datepicker-day flex h-8 w-full items-center justify-center rounded-lg text-xs text-slate-700"
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={() => {
            onSelect(todayKey)
            onClose()
          }}
          className="calm-datepicker-today-btn w-full rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500"
        >
          Today
        </button>
      </div>
    </div>
  )
}

export default DatePickerPopover

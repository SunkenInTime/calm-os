import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { parseDateAlias, stripAlias, type ParsedAlias } from '../../lib/dateAliases'
import { formatDateKey } from '../../lib/date'
import AnimatedCaretInput from '../AnimatedCaretInput'
import DatePickerPopover from './DatePickerPopover'

type SmartTaskInputProps = {
  value: string
  onChange: (value: string) => void
  onResolvedDate: (dateKey: string | null) => void
  resolvedDate: string | null
  placeholder?: string
  inputRef?: React.RefObject<HTMLInputElement | null>
  className?: string
  compact?: boolean
}

function SmartTaskInput({
  value,
  onChange,
  onResolvedDate,
  resolvedDate,
  placeholder = 'Task title...',
  inputRef: externalRef,
  className = '',
  compact = false,
}: SmartTaskInputProps) {
  const [alias, setAlias] = useState<ParsedAlias | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarBtnRef = useRef<HTMLButtonElement>(null)
  const internalRef = useRef<HTMLInputElement | null>(null)

  const inputCallbackRef = useMemo(() => {
    return (node: HTMLInputElement | null) => {
      internalRef.current = node
      if (externalRef) {
        (externalRef as React.MutableRefObject<HTMLInputElement | null>).current = node
      }
    }
  }, [externalRef])

  const detectAlias = useCallback(
    (text: string) => {
      const parsed = parseDateAlias(text)
      setAlias((previousAlias) => {
        if (parsed) {
          onResolvedDate(parsed.dateKey)
          return parsed
        }

        // Only clear date when an inline keyword was previously driving it.
        if (previousAlias && resolvedDate === previousAlias.dateKey) {
          onResolvedDate(null)
        }
        return null
      })
    },
    [onResolvedDate, resolvedDate],
  )

  useEffect(() => {
    detectAlias(value)
  }, [value, detectAlias])

  function handleChange(newValue: string) {
    onChange(newValue)
  }

  function handleCalendarSelect(dateKey: string) {
    onResolvedDate(dateKey)
    if (alias) {
      onChange(stripAlias(value, alias))
      setAlias(null)
    }
  }

  function clearDate() {
    onResolvedDate(null)
    if (alias) {
      onChange(stripAlias(value, alias))
      setAlias(null)
    }
  }

  const dateLabel = resolvedDate
    ? alias
      ? alias.label
      : formatDateKey(resolvedDate)
    : null

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative flex min-w-0 flex-1 items-center">
        <AnimatedCaretInput
          inputRef={inputCallbackRef}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          inputClassName={`w-full rounded-lg border border-slate-200 bg-slate-50 pr-24 text-slate-800 focus:border-indigo-400 focus:outline-none ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
          textClassName={`${compact ? 'pl-2.5 py-1.5 text-xs' : 'pl-3 py-2 text-sm'} text-slate-800`}
          placeholderClassName="text-slate-400"
        />

        {/* Alias highlight overlay */}
        {alias && (
          <span
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 overflow-hidden"
            aria-hidden
          >
            <span className="invisible whitespace-pre" style={{ fontSize: compact ? 12 : 14 }}>
              {value.slice(0, alias.startIndex)}
            </span>
          </span>
        )}

        {/* Date badge + calendar icon cluster */}
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {dateLabel && (
            <span className="flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
              {dateLabel}
              <button
                type="button"
                onClick={clearDate}
                className="rounded-full p-0.5 hover:bg-indigo-200"
              >
                <X size={9} />
              </button>
            </span>
          )}
          <button
            ref={calendarBtnRef}
            type="button"
            onClick={() => setIsCalendarOpen((v) => !v)}
            className={`rounded-md p-1 transition-colors ${isCalendarOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            <CalendarDays size={compact ? 13 : 15} />
          </button>
        </div>
      </div>

      <DatePickerPopover
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={handleCalendarSelect}
        selectedDate={resolvedDate}
        anchorRef={calendarBtnRef}
      />
    </div>
  )
}

export default SmartTaskInput

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type AnimatedCaretInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'className'
> & {
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
  renderOverlayText?: (value: string) => React.ReactNode
  inputRef?: React.Ref<HTMLInputElement>
  className?: string
  inputClassName?: string
  textClassName?: string
  placeholderClassName?: string
}

function AnimatedCaretInput({
  value,
  onChange,
  renderOverlayText,
  inputRef: externalRef,
  className = '',
  inputClassName = '',
  textClassName = '',
  placeholderClassName = '',
  placeholder,
  onFocus,
  onBlur,
  onClick,
  onKeyDown,
  onKeyUp,
  onSelect,
  ...rest
}: AnimatedCaretInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const caretIndexRef = useRef(0)
  const bumpTimeoutRef = useRef<number | null>(null)

  const [isFocused, setIsFocused] = useState(false)
  const [caretIndex, setCaretIndex] = useState(0)
  const [caretX, setCaretX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [hasSelection, setHasSelection] = useState(false)
  const [caretBumpTick, setCaretBumpTick] = useState(0)

  const syncCaretMetrics = useCallback(() => {
    const input = inputRef.current
    if (!input) return

    const selectionStart = input.selectionStart ?? value.length
    const selectionEnd = input.selectionEnd ?? selectionStart
    const hasRangeSelection = selectionEnd !== selectionStart
    const nextScrollLeft = input.scrollLeft

    if (selectionStart !== caretIndexRef.current) {
      caretIndexRef.current = selectionStart
      setCaretIndex(selectionStart)
      setCaretBumpTick((prev) => prev + 1)

      if (bumpTimeoutRef.current !== null) {
        window.clearTimeout(bumpTimeoutRef.current)
      }
      bumpTimeoutRef.current = window.setTimeout(() => {
        setCaretBumpTick((prev) => prev + 1)
      }, 120)
    }

    if (selectionStart === caretIndexRef.current) {
      setCaretIndex(selectionStart)
    }

    setScrollLeft(nextScrollLeft)
    setHasSelection(hasRangeSelection)
  }, [value])

  useEffect(() => {
    syncCaretMetrics()
  }, [value, syncCaretMetrics])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const onDocumentSelectionChange = () => {
      if (document.activeElement === input) {
        syncCaretMetrics()
      }
    }

    document.addEventListener('selectionchange', onDocumentSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onDocumentSelectionChange)
      if (bumpTimeoutRef.current !== null) {
        window.clearTimeout(bumpTimeoutRef.current)
      }
    }
  }, [syncCaretMetrics])

  const mirroredText = useMemo(() => {
    if (value.length > 0) return value
    return null
  }, [value])
  const measuredPrefix = useMemo(() => value.slice(0, caretIndex), [caretIndex, value])

  const showCaret = isFocused && !hasSelection

  useLayoutEffect(() => {
    const measure = measureRef.current
    if (!measure) return
    setCaretX(measure.offsetWidth)
  }, [measuredPrefix, renderOverlayText, textClassName])

  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (!externalRef) return
      if (typeof externalRef === 'function') {
        externalRef(node)
      } else {
        externalRef.current = node
      }
    },
    [externalRef],
  )

  return (
    <div className={`animated-input-root ${className}`}>
      <input
        {...rest}
        ref={setInputRef}
        value={value}
        onChange={(event) => {
          onChange(event)
          syncCaretMetrics()
        }}
        onFocus={(event) => {
          setIsFocused(true)
          onFocus?.(event)
          syncCaretMetrics()
        }}
        onBlur={(event) => {
          setIsFocused(false)
          onBlur?.(event)
        }}
        onClick={(event) => {
          onClick?.(event)
          syncCaretMetrics()
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          syncCaretMetrics()
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event)
          syncCaretMetrics()
        }}
        onSelect={(event) => {
          onSelect?.(event)
          syncCaretMetrics()
        }}
        onScroll={syncCaretMetrics}
        className={`animated-input-native ${inputClassName}`}
      />

      <div aria-hidden className="animated-input-overlay">
        <span ref={measureRef} className={`animated-input-measure ${textClassName}`}>
          {renderOverlayText ? renderOverlayText(measuredPrefix) : measuredPrefix}
        </span>

        <span className="animated-input-track" style={{ transform: `translateX(${-scrollLeft}px)` }}>
          {mirroredText ? (
            <span className={textClassName}>{renderOverlayText ? renderOverlayText(mirroredText) : mirroredText}</span>
          ) : (
            <span className={`${textClassName} ${placeholderClassName}`}>{placeholder}</span>
          )}
        </span>

        {showCaret && (
          <span className="animated-input-caret" style={{ transform: `translate(${caretX - scrollLeft}px, -50%)` }}>
            <span key={caretBumpTick} className="animated-input-caret-body" />
          </span>
        )}
      </div>
    </div>
  )
}

export default AnimatedCaretInput

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import type React from 'react'
import { Button, Card, Flex, SegmentedControl, Text, Theme } from '@radix-ui/themes'
import SmartTaskInput from './components/tasks/SmartTaskInput'
import { parseDateAlias, stripAlias } from './lib/dateAliases'
import { Plus } from 'lucide-react'

type QuickAddMode = 'task' | 'idea'

function QuickAddOverlay() {
  const createTask = useMutation(api.tasks.createTask)
  const createIdea = useMutation(api.ideas.createIdea)
  const [mode, setMode] = useState<QuickAddMode>('task')
  const [title, setTitle] = useState('')
  const [resolvedDate, setResolvedDate] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const ideaInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusInput() {
      setMode('task')
      setTitle('')
      setResolvedDate(null)
      setSubmitError('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        ideaInputRef.current?.focus()
      })
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        window.ipcRenderer?.send?.('quick-add:close')
      }
    }

    focusInput()
    window.addEventListener('focus', focusInput)
    window.addEventListener('keydown', onEscape)

    return () => {
      window.removeEventListener('focus', focusInput)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setSubmitError('Title is required.')
      return
    }

    try {
      setIsSubmitting(true)
      if (mode === 'task') {
        const alias = parseDateAlias(trimmedTitle)
        const cleanTitle = alias ? stripAlias(trimmedTitle, alias) : trimmedTitle
        await createTask({
          title: cleanTitle,
          dueDate: resolvedDate,
        })
      } else {
        await createIdea({
          title: trimmedTitle,
        })
      }
      setTitle('')
      setResolvedDate(null)
      window.ipcRenderer?.send?.('quick-add:close')
    } catch {
      setSubmitError(`Could not create ${mode} right now.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleIdeaKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setMode((current) => (current === 'task' ? 'idea' : 'task'))
    }
  }

  return (
    <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(238, 243, 248, 0.92)',
          padding: 12,
        }}
      >
        <Card style={{ width: '100%' }}>
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between">
                <SegmentedControl.Root value={mode} onValueChange={(value) => setMode(value as QuickAddMode)}>
                  <SegmentedControl.Item value="task">Task</SegmentedControl.Item>
                  <SegmentedControl.Item value="idea">Idea</SegmentedControl.Item>
                </SegmentedControl.Root>
                <Text size="1" color="gray">
                  Tab toggles mode
                </Text>
              </Flex>
              {mode === 'task' ? (
                <SmartTaskInput
                  value={title}
                  onChange={setTitle}
                  resolvedDate={resolvedDate}
                  onResolvedDate={setResolvedDate}
                  placeholder="Add task... (try TD, TM, MON-SUN)"
                  inputRef={inputRef}
                />
              ) : (
                <Flex align="center" gap="2">
                  <Plus size={15} />
                  <input
                    ref={ideaInputRef}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={handleIdeaKeyDown}
                    placeholder="Capture idea..."
                    style={{
                      width: '100%',
                      border: '1px solid var(--gray-a6)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'var(--color-surface)',
                      color: 'var(--gray-12)',
                      fontSize: 15,
                    }}
                  />
                </Flex>
              )}
              <Flex align="center" justify="between">
                <Text size="1" color="gray">
                  Esc closes quick add
                </Text>
                <Button type="submit" size="1" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button>
              </Flex>
              {submitError && (
                <Text size="1" color="gray">
                  {submitError}
                </Text>
              )}
            </Flex>
          </form>
        </Card>
      </div>
    </Theme>
  )
}

export default QuickAddOverlay

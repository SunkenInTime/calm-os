import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import type React from 'react'
import { Button, Card, Flex, SegmentedControl, Text, Theme } from '@radix-ui/themes'
import { PlusIcon } from '@radix-ui/react-icons'

type QuickAddMode = 'task' | 'idea'

function QuickAddOverlay() {
  const createTask = useMutation(api.tasks.createTask)
  const createIdea = useMutation(api.ideas.createIdea)
  const [mode, setMode] = useState<QuickAddMode>('task')
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function focusInput() {
      setMode('task')
      setTitle('')
      setSubmitError('')
      requestAnimationFrame(() => {
        inputRef.current?.focus()
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
        await createTask({
          title: trimmedTitle,
          dueDate: null,
        })
      } else {
        await createIdea({
          title: trimmedTitle,
        })
      }
      setTitle('')
      window.ipcRenderer?.send?.('quick-add:close')
    } catch {
      setSubmitError(`Could not create ${mode} right now.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setMode((current) => (current === 'task' ? 'idea' : 'task'))
    }
  }

  const placeholder = mode === 'task' ? 'Add task...' : 'Capture idea...'

  return (
    <Theme appearance="light" accentColor="blue" grayColor="slate" radius="large">
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
              <Flex align="center" gap="2">
                <PlusIcon />
                <input
                  ref={inputRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholder}
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

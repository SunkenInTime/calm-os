import { FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Badge, Box, Button, Card, Flex, Heading, IconButton, Text, TextField } from '@radix-ui/themes'
import { api } from '../../convex/_generated/api'
import type { IdeaDoc } from '../lib/domain'

function IdeasPage() {
  const ideas = useQuery(api.ideas.listIdeas) as IdeaDoc[] | undefined
  const createIdea = useMutation(api.ideas.createIdea)
  const moveIdea = useMutation(api.ideas.moveIdea)
  const archiveIdea = useMutation(api.ideas.archiveIdea)

  const [ideaTitle, setIdeaTitle] = useState('')
  const [ideaError, setIdeaError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIdeaError('')
    const title = ideaTitle.trim()
    if (!title) {
      setIdeaError('Add an idea title first.')
      return
    }

    try {
      setIsSubmitting(true)
      await createIdea({ title })
      setIdeaTitle('')
    } catch {
      setIdeaError('Could not add that idea right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!ideas) {
    return (
      <Card>
        <Text color="gray">Loading ideas...</Text>
      </Card>
    )
  }

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Heading size="5">Ideas</Heading>
        <Text color="gray" as="p" mt="1">
          Ideas are optional, incubating thoughts. Keep them light.
        </Text>
        <form onSubmit={handleCreateIdea}>
          <Flex direction={{ initial: 'column', sm: 'row' }} align="end" gap="2" mt="3">
            <Box style={{ flexGrow: 1 }}>
              <Text as="label" size="1" color="gray">
                New idea
              </Text>
              <TextField.Root
                value={ideaTitle}
                onChange={(event) => setIdeaTitle(event.target.value)}
                placeholder="Capture an idea..."
              >
                <TextField.Slot>
                  <Plus size={15} />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Button type="submit" loading={isSubmitting}>
              Add idea
            </Button>
          </Flex>
        </form>
        {ideaError && (
          <Text size="1" color="gray" mt="2">
            {ideaError}
          </Text>
        )}
      </Card>
      <Card>
        <Flex align="center" justify="between" mb="3">
          <Heading size="4">Ranked list</Heading>
          <Badge color="indigo">{ideas.length}</Badge>
        </Flex>
        {ideas.length === 0 ? (
          <Text size="2" color="gray">
            No ideas yet.
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {ideas.map((idea, index) => (
              <Card key={idea._id} variant="surface">
                <Flex align="start" justify="between" gap="3">
                  <Flex gap="2" align="start">
                    <Badge color="gray">#{index + 1}</Badge>
                    <Text>{idea.title}</Text>
                  </Flex>
                  <Flex gap="1">
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Move ${idea.title} up`}
                      disabled={index === 0}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'up' })}
                    >
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Move ${idea.title} down`}
                      disabled={index === ideas.length - 1}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'down' })}
                    >
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Archive ${idea.title}`}
                      onClick={() => void archiveIdea({ ideaId: idea._id })}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Card>
    </Flex>
  )
}

export default IdeasPage

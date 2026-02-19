import { FormEvent, useState, type DragEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronUp, Link, Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { IdeaDoc } from '../lib/domain'

function IdeasPage() {
  const ideas = useQuery(api.ideas.listIdeas) as IdeaDoc[] | undefined
  const createIdea = useMutation(api.ideas.createIdea)
  const moveIdea = useMutation(api.ideas.moveIdea)
  const reorderIdea = useMutation(api.ideas.reorderIdea)
  const archiveIdea = useMutation(api.ideas.archiveIdea)

  const [ideaTitle, setIdeaTitle] = useState('')
  const [ideaError, setIdeaError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draggedIdeaId, setDraggedIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

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

  function handleDragStart(event: DragEvent<HTMLElement>, ideaId: IdeaDoc['_id']) {
    setDraggedIdeaId(ideaId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(ideaId))
  }

  function handleDragOver(event: DragEvent<HTMLElement>, index: number) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetIndex(index)
  }

  function handleDragEnd() {
    setDraggedIdeaId(null)
    setDropTargetIndex(null)
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetIndex: number) {
    event.preventDefault()
    if (!ideas || !draggedIdeaId) {
      handleDragEnd()
      return
    }

    const currentIndex = ideas.findIndex((idea) => idea._id === draggedIdeaId)
    handleDragEnd()
    if (currentIndex < 0 || currentIndex === targetIndex) {
      return
    }
    void reorderIdea({ ideaId: draggedIdeaId, targetIndex })
  }

  function handleOpenReference(event: React.MouseEvent<HTMLButtonElement>, url: string) {
    event.stopPropagation()
    void window.ipcRenderer?.invoke?.('shell:open-external-url', url)
  }

  if (!ideas) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading ideas...
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Add idea form */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-600">Capture an idea</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Ideas are optional, incubating thoughts. Keep them light.
        </p>
        <form onSubmit={handleCreateIdea} className="mt-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
              <Plus size={13} className="text-slate-400" />
            </div>
            <input
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="What's on your mind..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} />
            {isSubmitting ? 'Adding...' : 'Add idea'}
          </button>
        </form>
        {ideaError && (
          <p className="mt-2 text-xs text-slate-400">{ideaError}</p>
        )}
      </div>

      {/* Ideas list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex shrink-0 items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium text-slate-600">Ranked list</h3>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs tabular-nums text-indigo-600">
            {ideas.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {ideas.length === 0 ? (
            <p className="p-2 text-sm text-slate-400">No ideas yet.</p>
          ) : (
            <div className="space-y-2">
              {ideas.map((idea, index) => (
                <article
                  key={idea._id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, idea._id)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    dropTargetIndex === index
                      ? 'border-indigo-300 bg-indigo-50/70'
                      : 'border-slate-100 bg-slate-50/50'
                  } ${draggedIdeaId === idea._id ? 'cursor-grabbing opacity-80' : 'cursor-grab active:cursor-grabbing'}`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="min-w-0 text-sm text-slate-700">{idea.title}</span>
                    {idea.referenceUrl && (
                      <button
                        type="button"
                        onClick={(event) => handleOpenReference(event, idea.referenceUrl!)}
                        className="mt-px shrink-0 text-slate-400 transition-colors hover:text-indigo-600"
                        aria-label={`Open reference for ${idea.title}`}
                      >
                        <Link size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'up' })}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={index === ideas.length - 1}
                      onClick={() => void moveIdea({ ideaId: idea._id, direction: 'down' })}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void archiveIdea({ ideaId: idea._id })}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                      aria-label="Archive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IdeasPage

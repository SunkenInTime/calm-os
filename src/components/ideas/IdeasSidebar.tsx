import { FormEvent, useState, type DragEvent } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronUp, Link, Plus, Trash2 } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { IdeaDoc } from '../../lib/domain'

function IdeasSidebar() {
  const ideas = useQuery(api.ideas.listIdeas) as IdeaDoc[] | undefined
  const createIdea = useMutation(api.ideas.createIdea)
  const moveIdea = useMutation(api.ideas.moveIdea)
  const reorderIdea = useMutation(api.ideas.reorderIdea)
  const archiveIdea = useMutation(api.ideas.archiveIdea)

  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draggedIdeaId, setDraggedIdeaId] = useState<IdeaDoc['_id'] | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      setIsSubmitting(true)
      await createIdea({ title: trimmed })
      setTitle('')
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

  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 px-4 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Ideas</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-400">
          {ideas?.length ?? 0}
        </span>
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex gap-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add idea..."
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="shrink-0 rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <Plus size={13} />
        </button>
      </form>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {!ideas ? (
          <p className="p-2 text-xs text-slate-400">Loading...</p>
        ) : ideas.length === 0 ? (
          <p className="p-2 text-xs text-slate-400">No ideas yet.</p>
        ) : (
          <div className="space-y-1">
            {ideas.map((idea, index) => (
              <article
                key={idea._id}
                draggable
                onDragStart={(event) => handleDragStart(event, idea._id)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-start gap-1.5 rounded-md border px-2 py-1.5 shadow-sm transition-colors ${
                  dropTargetIndex === index
                    ? 'border-indigo-300 bg-indigo-50/80'
                    : 'border-transparent bg-white'
                } ${draggedIdeaId === idea._id ? 'cursor-grabbing opacity-80' : 'cursor-grab active:cursor-grabbing'}`}
              >
                <span className="mt-px shrink-0 text-[10px] font-medium tabular-nums text-slate-400">
                  #{index + 1}
                </span>
                <span className="min-w-0 flex-1 text-xs text-slate-700">
                  {idea.title}
                </span>
                {idea.referenceUrl && (
                  <button
                    type="button"
                    onClick={(event) => handleOpenReference(event, idea.referenceUrl!)}
                    className="mt-px shrink-0 text-slate-400 transition-colors hover:text-indigo-600"
                    aria-label={`Open reference for ${idea.title}`}
                  >
                    <Link size={11} />
                  </button>
                )}
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => void moveIdea({ ideaId: idea._id, direction: 'up' })}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={ideas.length > 0 && index === ideas.length - 1}
                    onClick={() => void moveIdea({ ideaId: idea._id, direction: 'down' })}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void archiveIdea({ ideaId: idea._id })}
                    className="rounded p-0.5 text-slate-400 hover:text-red-500"
                    aria-label="Archive"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default IdeasSidebar

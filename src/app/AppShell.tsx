import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Moon, Plus, RotateCcw, Sun } from 'lucide-react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import IdeasSidebar from '../components/ideas/IdeasSidebar'
import TaskComposerModal from '../components/tasks/TaskComposerModal'
import DashboardPage from '../pages/DashboardPage'
import IdeasPage from '../pages/IdeasPage'
import RitualPage from '../pages/RitualPage'
import { toLocalDateKey } from '../lib/date'
import type { DailyModel } from '../lib/domain'

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const localTodayKey = toLocalDateKey(new Date())
  const dailyModel = useQuery(api.daily.getTodayDailyModel, {
    todayKey: localTodayKey,
  }) as DailyModel | undefined
  const createTask = useMutation(api.tasks.createTask)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  async function handleCreateTask(title: string, dueDate: string | null) {
    await createTask({ title, dueDate })
  }

  const isToday = location.pathname === '/'
  const isIdeas = location.pathname === '/ideas'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-800">
      <IdeasSidebar />

      <main className="flex min-w-0 flex-1 flex-col px-6 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Calm OS
            </h1>
            <div className="mt-1 flex gap-3">
              <Link
                to="/"
                className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Today
              </Link>
              <Link
                to="/ideas"
                className={`text-xs font-medium ${isIdeas ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Ideas
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/ritual/morning')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs shadow-sm transition-colors ${dailyModel?.daily?.morningCompletedAt ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Sun size={13} />
              Morning
            </button>
            <button
              type="button"
              onClick={() => navigate('/ritual/evening')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs shadow-sm transition-colors ${dailyModel?.daily?.eveningCompletedAt ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <Moon size={13} />
              Evening
            </button>
            <button
              type="button"
              onClick={() => navigate('/ritual/reset')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Plus size={14} />
              Task
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/ritual/morning" element={<RitualPage kind="morning" />} />
            <Route path="/ritual/evening" element={<RitualPage kind="evening" />} />
            <Route path="/ritual/reset" element={<RitualPage kind="reset" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <TaskComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={handleCreateTask}
      />
    </div>
  )
}

export default AppShell

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, parseTask, updateTask, deleteTask } from './api'
import type { Task } from './api'
import {
  Send, Trash2, CheckCircle, Clock, Circle,
  Moon, Sun, LayoutDashboard, ChevronDown
} from 'lucide-react'

const STATUS_COLUMNS = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}
const PRIORITY_COLORS_LIGHT: Record<number, string> = {
  1: 'bg-red-50 border-red-400',
  2: 'bg-orange-50 border-orange-400',
  3: 'bg-blue-50 border-blue-400',
  4: 'bg-gray-50 border-gray-300',
  5: 'bg-gray-50 border-gray-200',
}
const PRIORITY_COLORS_DARK: Record<number, string> = {
  1: 'bg-red-950 border-red-500',
  2: 'bg-orange-950 border-orange-500',
  3: 'bg-blue-950 border-blue-500',
  4: 'bg-zinc-800 border-zinc-600',
  5: 'bg-zinc-900 border-zinc-700',
}
const PRIORITY_LABELS: Record<number, string> = {
  1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low', 5: 'Someday',
}
const PRIORITY_BADGE: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  3: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  4: 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300',
  5: 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500',
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'done') return <CheckCircle className="w-4 h-4 text-emerald-500" />
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-amber-500" />
  return <Circle className="w-4 h-4 text-gray-400" />
}

const TaskCard = ({
  task, onStatusChange, onDelete, dark,
}: {
  task: Task
  onStatusChange: (id: number, status: string) => void
  onDelete: (id: number) => void
  dark: boolean
}) => {
  const colorClass = dark
    ? PRIORITY_COLORS_DARK[task.priority] || 'bg-zinc-800 border-zinc-600'
    : PRIORITY_COLORS_LIGHT[task.priority] || 'bg-white border-gray-300'

  return (
    <div className={`border-l-4 rounded-xl p-4 mb-3 shadow-sm transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-snug truncate ${dark ? 'text-zinc-100' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-zinc-400' : 'text-gray-500'}`}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.client_name && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dark ? 'bg-violet-900 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
                {task.client_name}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className={`shrink-0 p-1 rounded-lg transition-colors ${dark ? 'text-zinc-600 hover:text-red-400 hover:bg-zinc-700' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 relative">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className={`w-full text-xs border rounded-lg px-3 py-1.5 pr-7 appearance-none cursor-pointer font-medium transition-colors ${dark
            ? 'bg-zinc-800 border-zinc-600 text-zinc-300 focus:border-violet-500'
            : 'bg-white border-gray-200 text-gray-600 focus:border-violet-400'
          } focus:outline-none`}
        >
          {STATUS_COLUMNS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <ChevronDown className={`w-3 h-3 absolute right-2 top-2 pointer-events-none ${dark ? 'text-zinc-500' : 'text-gray-400'}`} />
      </div>
    </div>
  )
}

export default function App() {
  const [input, setInput] = useState('')
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  })

  const parseMutation = useMutation({
    mutationFn: parseTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setInput('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => updateTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleSubmit = () => {
    if (!input.trim() || parseMutation.isPending) return
    parseMutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<string, Task[]>)

  const bg = dark ? 'bg-zinc-950' : 'bg-slate-50'
  const headerBg = dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
  const colBg = dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
  const inputBg = dark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
  const colHeaderText = dark ? 'text-zinc-300' : 'text-gray-700'
  const colCountBg = dark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'
  const emptyText = dark ? 'text-zinc-700' : 'text-gray-300'

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>

      {/* Header */}
      <header className={`border-b ${headerBg} sticky top-0 z-10 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${dark ? 'bg-violet-900' : 'bg-violet-100'}`}>
              <LayoutDashboard className={`w-4 h-4 sm:w-5 sm:h-5 ${dark ? 'text-violet-300' : 'text-violet-600'}`} />
            </div>
            <div>
              <h1 className={`text-sm sm:text-base font-bold tracking-tight ${dark ? 'text-zinc-100' : 'text-gray-900'}`}>
                VA Support Tool
              </h1>
              <p className={`text-xs hidden sm:block ${dark ? 'text-zinc-500' : 'text-gray-400'}`}>
                Smart Task & Context Hub
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full hidden sm:inline-block ${dark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setDark(!dark)}
              className={`p-2 rounded-lg transition-colors ${dark ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* AI Input */}
        <div className={`border-t ${dark ? 'border-zinc-800' : 'border-gray-100'} px-4 sm:px-6 py-3`}>
          <div className="max-w-7xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "Email John about invoice urgently"'
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors ${inputBg}`}
              disabled={parseMutation.isPending}
            />
            <button
              onClick={handleSubmit}
              disabled={parseMutation.isPending || !input.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">
                {parseMutation.isPending ? 'Thinking...' : 'Add Task'}
              </span>
            </button>
          </div>
          {parseMutation.isError && (
            <p className="text-red-500 text-xs mt-1.5 max-w-7xl mx-auto">
              Something went wrong. Try again.
            </p>
          )}
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className={`sm:hidden flex border-b ${dark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>
        {STATUS_COLUMNS.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(activeTab === status ? null : status)}
            className={`flex-1 py-2.5 text-xs font-semibold flex flex-col items-center gap-1 transition-colors ${activeTab === status
              ? dark ? 'text-violet-400 border-b-2 border-violet-500' : 'text-violet-600 border-b-2 border-violet-600'
              : dark ? 'text-zinc-500' : 'text-gray-400'
            }`}
          >
            <StatusIcon status={status} />
            <span>{STATUS_LABELS[status]}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${colCountBg}`}>
              {tasksByStatus[status]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Board */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {isLoading ? (
          <div className={`text-center py-20 text-sm ${dark ? 'text-zinc-600' : 'text-gray-400'}`}>
            Loading tasks...
          </div>
        ) : (
          <>
            {/* Desktop: 3 columns */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-4">
              {STATUS_COLUMNS.map((status) => (
                <div key={status} className={`rounded-2xl border ${colBg} p-4 transition-colors duration-300`}>
                  <div className="flex items-center gap-2 mb-4">
                    <StatusIcon status={status} />
                    <h2 className={`font-semibold text-sm ${colHeaderText}`}>
                      {STATUS_LABELS[status]}
                    </h2>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${colCountBg}`}>
                      {tasksByStatus[status]?.length || 0}
                    </span>
                  </div>
                  <div>
                    {tasksByStatus[status]?.length === 0 ? (
                      <p className={`text-xs text-center py-10 ${emptyText}`}>No tasks</p>
                    ) : (
                      tasksByStatus[status].map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          dark={dark}
                          onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: single column with tabs */}
            <div className="sm:hidden">
              {(activeTab ? [activeTab] : STATUS_COLUMNS).map((status) => (
                <div key={status} className={`rounded-2xl border ${colBg} p-4 mb-4 transition-colors duration-300`}>
                  <div className="flex items-center gap-2 mb-3">
                    <StatusIcon status={status} />
                    <h2 className={`font-semibold text-sm ${colHeaderText}`}>
                      {STATUS_LABELS[status]}
                    </h2>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${colCountBg}`}>
                      {tasksByStatus[status]?.length || 0}
                    </span>
                  </div>
                  {tasksByStatus[status]?.length === 0 ? (
                    <p className={`text-xs text-center py-8 ${emptyText}`}>No tasks</p>
                  ) : (
                    tasksByStatus[status].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        dark={dark}
                        onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
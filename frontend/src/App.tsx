import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, parseTask, updateTask, deleteTask } from './api'
import type { Task } from './api'
import { Send, Trash2, CheckCircle, Clock, Circle } from 'lucide-react'

const STATUS_COLUMNS = ['todo', 'in_progress', 'done']

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-red-100 border-red-400',
  2: 'bg-orange-100 border-orange-400',
  3: 'bg-blue-100 border-blue-400',
  4: 'bg-gray-100 border-gray-300',
  5: 'bg-gray-50 border-gray-200',
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Urgent',
  2: 'High',
  3: 'Normal',
  4: 'Low',
  5: 'Someday',
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'done') return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-yellow-500" />
  return <Circle className="w-4 h-4 text-gray-400" />
}

const TaskCard = ({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task
  onStatusChange: (id: number, status: string) => void
  onDelete: (id: number) => void
}) => {
  return (
    <div className={`border-l-4 rounded-lg p-3 mb-2 shadow-sm ${PRIORITY_COLORS[task.priority] || 'bg-white border-gray-300'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-gray-800 text-sm">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.client_name && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {task.client_name}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600"
        >
          {STATUS_COLUMNS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function App() {
  const [input, setInput] = useState('')
  // const [isTyping, setIsTyping] = useState(false)
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(),
  })

  const parseMutation = useMutation({
    mutationFn: parseTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setInput('')
      // setIsTyping(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      updateTask(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const handleSubmit = () => {
    if (!input.trim()) return
    // setIsTyping(true)
    parseMutation.mutate(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">VA Support Tool</h1>
            <p className="text-sm text-gray-500">Smart Task & Context Hub</p>
          </div>
          <div className="text-sm text-gray-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "Remind me to email John about the contract urgently"'
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              disabled={parseMutation.isPending}
            />
            <button
              onClick={handleSubmit}
              disabled={parseMutation.isPending || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {parseMutation.isPending ? 'Thinking...' : 'Add'}
            </button>
          </div>
          {parseMutation.isError && (
            <p className="text-red-500 text-xs mt-1">Something went wrong. Try again.</p>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12">Loading tasks...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {STATUS_COLUMNS.map((status) => (
              <div key={status} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <StatusIcon status={status} />
                  <h2 className="font-semibold text-gray-700 text-sm">
                    {STATUS_LABELS[status]}
                  </h2>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {tasksByStatus[status]?.length || 0}
                  </span>
                </div>
                <div>
                  {tasksByStatus[status]?.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-6">No tasks</p>
                  ) : (
                    tasksByStatus[status].map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(id, status) =>
                          updateMutation.mutate({ id, data: { status } })
                        }
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
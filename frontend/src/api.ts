import axios from 'axios'

const api = axios.create({
  baseURL: 'https://va-tool.onrender.com',
})

export interface Task {
  id: number
  title: string
  description: string | null
  status: string
  priority: number
  client_name: string | null
  created_at: string
}

export const getTasks = async (status?: string): Promise<Task[]> => {
  const res = await api.get('/tasks/', { params: status ? { status } : {} })
  return res.data
}

export const createTask = async (data: {
  title: string
  description?: string
  status?: string
  priority?: number
  client_name?: string
}): Promise<Task> => {
  const res = await api.post('/tasks/', data)
  return res.data
}

export const parseTask = async (text: string): Promise<Task> => {
  const res = await api.post('/tasks/parse', { text })
  return res.data
}

export const updateTask = async (id: number, data: Partial<Task>): Promise<Task> => {
  const res = await api.patch(`/tasks/${id}`, data)
  return res.data
}

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasks/${id}`)
}

export const createNote = async (client_name: string, content: string) => {
  const res = await api.post('/notes/', { client_name, content })
  return res.data
}
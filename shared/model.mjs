export const SCHEMA_VERSION = 2

export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(key, amount) {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return dayKey(date)
}

export function createInitialData() {
  return {
    version: SCHEMA_VERSION, tasks: [], notes: [],
    settings: { theme: 'light', confetti: true, reduceMotion: false, compact: false, notifications: false },
  }
}

export function validateData(value) {
  // Version 1 backups are migrated by preserving every task and dropping category metadata.
  if (!value || typeof value !== 'object' || ![1, SCHEMA_VERSION].includes(value.version) || !Array.isArray(value.tasks) || !Array.isArray(value.notes)) {
    throw new Error('这不是有效的留白备份文件。')
  }
  if (value.tasks.length > 50000 || value.notes.length > 10000) throw new Error('文件内容过多，暂时无法导入。')
  const dateOkay = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00`)) && dayKey(new Date(`${date}T12:00:00`)) === date
  const tasks = value.tasks.map((t) => {
    if (!t || typeof t.id !== 'string' || typeof t.title !== 'string' || !t.title.trim()) throw new Error('待办信息不完整。')
    return {
      id: t.id.slice(0, 100), title: t.title.trim().slice(0, 500), notes: typeof t.notes === 'string' ? t.notes.slice(0, 20000) : '',
      dueDate: dateOkay(t.dueDate) ? t.dueDate : null,
      dueTime: typeof t.dueTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime) ? t.dueTime : '',
      starred: Boolean(t.starred), completed: Boolean(t.completed),
      createdAt: Number.isFinite(Date.parse(t.createdAt)) ? t.createdAt : new Date().toISOString(),
      completedAt: t.completed && Number.isFinite(Date.parse(t.completedAt)) ? t.completedAt : null,
    }
  })
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw new Error('待办编号重复。')
  const notes = value.notes.map((n) => {
    if (!n || typeof n.id !== 'string' || typeof n.title !== 'string' || typeof n.body !== 'string') throw new Error('笔记信息不完整。')
    return { id: n.id.slice(0, 100), title: n.title.slice(0, 300), body: n.body.slice(0, 100000), updatedAt: Number.isFinite(Date.parse(n.updatedAt)) ? n.updatedAt : new Date().toISOString() }
  })
  if (new Set(notes.map((n) => n.id)).size !== notes.length) throw new Error('笔记编号重复。')
  const settings = value.settings || {}
  return {
    version: SCHEMA_VERSION, tasks, notes,
    settings: {
      theme: ['light', 'dark', 'system'].includes(settings.theme) ? settings.theme : 'light',
      confetti: settings.confetti !== false, reduceMotion: Boolean(settings.reduceMotion),
      compact: Boolean(settings.compact), notifications: Boolean(settings.notifications),
    },
  }
}

export function taskMatchesView(task, view, today = dayKey()) {
  if (view === 'today') return task.dueDate === today || (!task.completed && task.dueDate && task.dueDate < today)
  if (view === 'upcoming') return !task.completed && task.dueDate && task.dueDate > today
  if (view === 'completed') return task.completed
  return true
}

export function sortTasks(tasks, sort = 'manual') {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    if (sort === 'date') return (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (a.dueTime || '99').localeCompare(b.dueTime || '99')
    if (sort === 'created') return b.createdAt.localeCompare(a.createdAt)
    if (a.starred !== b.starred) return Number(b.starred) - Number(a.starred)
    if (a.completed) return (b.completedAt || '').localeCompare(a.completedAt || '')
    return 0
  })
}

import { SCHEMA_VERSION, dayKey, addDays } from '../shared/model.mjs'

export function sampleData(today = dayKey()) {
  const now = new Date().toISOString()
  const task = (id, title, dueDate, extra = {}) => ({
    id, title, dueDate, dueTime: '', notes: '', starred: false,
    completed: false, completedAt: null, createdAt: now, ...extra,
  })
  return {
    version: SCHEMA_VERSION,
    tasks: [
      task('welcome-1', '测试待办 A', today, { starred: true, notes: '测试任务备注。' }),
      task('welcome-2', '测试待办 B', today, { dueTime: '18:00' }),
      task('welcome-3', '测试待办 C', today, { notes: '测试备注。' }),
      task('welcome-4', '测试待办 D', today),
      task('welcome-5', '测试待办 E', addDays(today, 1)),
      task('welcome-6', '测试待办 F', addDays(today, 2)),
      task('welcome-7', '测试待办 G', today, { completed: true, completedAt: now }),
      task('welcome-8', '测试待办 H', today, { completed: true, completedAt: now }),
    ],
    notes: [
      { id: 'note-welcome', title: '测试笔记 A', body: '测试笔记正文 A。', updatedAt: now },
      { id: 'note-ideas', title: '测试笔记 B', body: '测试笔记正文 B。', updatedAt: now },
    ],
    settings: { theme: 'light', confetti: true, reduceMotion: false, compact: false, notifications: false },
  }
}

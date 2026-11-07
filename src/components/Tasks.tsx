import { useRef, useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Plus, Star, Clock3, X, ArrowUp, StickyNote, Trash2, Check } from 'lucide-react'
import { DatePicker, IconButton } from './Primitives'
import { dateLabel, dayKey } from '../lib'
import type { Task } from '../types'

type RowProps = { task: Task; celebrating: boolean; selected: boolean; onToggle: (task: Task, element: HTMLElement) => void; onSelect: () => void; onStar: () => void }
export function TaskRow({ task, celebrating, selected, onToggle, onSelect, onStar }: RowProps) {
  const overdue = !task.completed && task.dueDate && task.dueDate < dayKey()
  return <motion.div layout="position" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, margin: 0 }} transition={{ layout: { type: 'spring', stiffness: 410, damping: 36 }, opacity: { duration: .2 } }} className={`task-row ${task.completed ? 'is-completed' : ''} ${celebrating ? 'is-celebrating' : ''} ${selected ? 'is-selected' : ''}`} data-task-id={task.id}>
    <motion.button type="button" role="checkbox" aria-checked={task.completed} aria-label={`${task.completed ? '恢复' : '完成'}：${task.title}`} className="task-checkbox" whileTap={{ scale: .83 }} animate={{ scale: celebrating ? [1, 1.12, 1] : 1 }} transition={{ duration: .35 }} onClick={e => onToggle(task, e.currentTarget)}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><motion.path d="m3.2 8 3.1 3.2 6.5-6.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: task.completed ? 1 : 0, opacity: task.completed ? 1 : 0 }} transition={{ duration: .22 }} /></svg>
    </motion.button>
    <button type="button" className="task-content" onClick={onSelect} aria-label={`编辑：${task.title}`}>
      <span className="task-title"><span>{task.title}</span></span>
      {task.notes && <span className="task-meta"><StickyNote size={11} /><span className="note-preview">{task.notes.split('\n')[0]}</span></span>}
    </button>
    {task.dueDate && !task.completed && <span className={`task-date ${overdue ? 'overdue' : ''} ${task.dueTime ? 'timed' : ''}`}>{task.dueTime ? <Clock3 size={12} /> : null}{overdue ? `${dateLabel(task.dueDate)} · 已过期` : task.dueTime || dateLabel(task.dueDate)}</span>}
    <button type="button" className={`task-star ${task.starred ? 'starred' : ''}`} aria-label={task.starred ? '取消重要' : '标为重要'} title={task.starred ? '取消重要' : '标为重要'} onClick={onStar}><Star size={15} fill={task.starred ? 'currentColor' : 'none'} strokeWidth={1.6} /></button>
  </motion.div>
}

export function Composer({ defaultDate, onCreate, onClose }: { defaultDate: string | null; onCreate: (task: Pick<Task, 'title' | 'dueDate' | 'starred'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(defaultDate)
  const [starred, setStarred] = useState(false)
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onCreate({ title: title.trim(), dueDate, starred }) }
  return <motion.form className="composer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .2 }} onSubmit={submit} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }}>
    <div className="composer-top"><span className="composer-square" /><input autoFocus aria-label="待办内容" placeholder="接下来，想做些什么？" value={title} maxLength={500} onChange={e => setTitle(e.target.value)} /><IconButton label="取消新增" onClick={onClose}><X size={15} /></IconButton></div>
    <div className="composer-bottom"><div className="composer-options"><DatePicker value={dueDate} onChange={setDueDate} compact /><button type="button" className={`chip star-option ${starred ? 'active' : ''}`} title="标为重要" aria-label="新待办标为重要" aria-pressed={starred} onClick={() => setStarred(s => !s)}><Star size={13} fill={starred ? 'currentColor' : 'none'} /></button></div><button type="submit" className="add-submit" disabled={!title.trim()}><ArrowUp size={15} /><span>添加</span></button></div>
    <div className="composer-hint">Enter 添加<span>Esc 取消</span></div>
  </motion.form>
}

export function QuickAdd({ onClick }: { onClick: () => void }) {
  return <button className="quick-add" onClick={onClick}><span className="quick-add-icon"><Plus size={17} strokeWidth={1.5} /></span><span>添加一件小事</span><kbd>Enter ↵</kbd></button>
}

export function Inspector({ task, onUpdate, onClose, onDelete, onToggle }: { task: Task; onUpdate: (patch: Partial<Task>) => void; onClose: () => void; onDelete: () => void; onToggle: (task: Task, element: HTMLElement) => void }) {
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [draftTitle, setDraftTitle] = useState(task.title)
  return <motion.aside aria-label="待办详情" className="inspector" initial={{ x: 28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 28, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }}>
    <div className="inspector-top"><span>待办详情</span><IconButton label="关闭详情" onClick={onClose}><X size={17} /></IconButton></div>
    <div className="inspector-content"><div className="inspector-status"><button className={`detail-checkbox ${task.completed ? 'checked' : ''}`} onClick={e => onToggle(task, e.currentTarget)}><span className="task-checkbox"><Check size={12} /></span>{task.completed ? '已完成' : '进行中'}</button><button className={`task-star ${task.starred ? 'starred' : ''}`} aria-label={task.starred ? '取消重要' : '标为重要'} onClick={() => onUpdate({ starred: !task.starred })}><Star size={18} fill={task.starred ? 'currentColor' : 'none'} /></button></div>
      <textarea ref={titleRef} className="detail-title" aria-label="编辑待办标题" value={draftTitle} rows={3} maxLength={500} onChange={e => { setDraftTitle(e.target.value); if (e.target.value.trim()) onUpdate({ title: e.target.value.trim() }) }} onBlur={e => { const title = e.target.value.trim() || task.title; setDraftTitle(title); onUpdate({ title }) }} />
      <div className="detail-fields"><div className="detail-field"><label>日期</label><DatePicker value={task.dueDate} onChange={dueDate => onUpdate({ dueDate, dueTime: dueDate ? task.dueTime : '' })} /></div>
        {task.dueDate && <div className="detail-field"><label htmlFor="task-time">时间</label><div className="time-field"><Clock3 size={14} /><input id="task-time" type="time" value={task.dueTime} onChange={e => onUpdate({ dueTime: e.target.value })} />{task.dueTime && <IconButton label="清除时间" onClick={() => onUpdate({ dueTime: '' })}><X size={12} /></IconButton>}</div></div>}
      </div>
      <label className="detail-notes-label" htmlFor="task-notes"><StickyNote size={14} />备注</label><textarea id="task-notes" className="detail-notes" placeholder="补充一些想法，或记下第一步…" value={task.notes} maxLength={20000} onChange={e => onUpdate({ notes: e.target.value })} />
    </div>
    <div className="inspector-footer"><span>修改会自动保存</span><IconButton label="删除待办" className="delete-button" onClick={onDelete}><Trash2 size={15} /></IconButton></div>
  </motion.aside>
}

import { useState } from 'react'
import { motion } from 'motion/react'
import { Plus, ArrowUpRight, FileText, Trash2, ArrowLeft } from 'lucide-react'
import { EmptyState, IconButton } from './Primitives'
import { dateLabel, dayKey } from '../lib'
import type { Note } from '../types'

export default function Notes({ notes, selectedId, onSelect, onUpdate, onDelete, onCreate }: { notes: Note[]; selectedId: string | null; onSelect: (id: string | null) => void; onUpdate: (id: string, patch: Partial<Note>) => void; onDelete: (id: string) => void; onCreate: () => void }) {
  const [query, setQuery] = useState('')
  const selected = notes.find(n => n.id === selectedId)
  if (selected) return <motion.div className="note-editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={selected.id}><div className="note-editor-bar"><button onClick={() => onSelect(null)}><ArrowLeft size={15} />所有笔记</button><span>已自动保存</span><IconButton label="删除笔记" className="delete-button" onClick={() => onDelete(selected.id)}><Trash2 size={16} /></IconButton></div><input autoFocus className="note-editor-title" aria-label="笔记标题" placeholder="无标题笔记" value={selected.title} maxLength={300} onChange={e => onUpdate(selected.id, { title: e.target.value })} /><div className="note-editor-date">{dateLabel(dayKey(new Date(selected.updatedAt)))} · {new Date(selected.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div><textarea className="note-editor-body" aria-label="笔记正文" placeholder="从这里开始，留住一个想法…" value={selected.body} maxLength={100000} onChange={e => onUpdate(selected.id, { body: e.target.value })} /></motion.div>
  const visible = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()))
  return <><div className="notes-toolbar"><span>所有笔记 <b>{notes.length}</b></span><input aria-label="筛选笔记" placeholder="查找笔记…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="notes-grid">{visible.map((note, index) => <motion.button className="note-card" key={note.id} onClick={() => onSelect(note.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}><FileText size={17} strokeWidth={1.4} /><h3>{note.title || '无标题笔记'}</h3><p>{note.body || '还没有写下内容'}</p><div><span>{dateLabel(dayKey(new Date(note.updatedAt)))}</span><ArrowUpRight size={14} /></div></motion.button>)}{!query && <button className="note-card new-note-card" onClick={onCreate}><Plus size={23} strokeWidth={1.4} /><span>记下一个想法</span></button>}</div>{!visible.length && query && <EmptyState title="没有找到这条笔记" description="换个关键词，再找找看。" />}</>
}

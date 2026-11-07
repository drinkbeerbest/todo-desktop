import { useMemo, useRef, useState } from 'react'
import { Search as SearchIcon, CornerDownLeft, FileText, Check, Circle, ArrowRight } from 'lucide-react'
import { Modal } from './Primitives'
import type { AppData } from '../types'

export default function Search({ data, onClose, onTask, onNote }: { data: AppData; onClose: () => void; onTask: (id: string) => void; onNote: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [
      ...data.tasks.filter(t => !q ? !t.completed : `${t.title} ${t.notes}`.toLowerCase().includes(q)).map(t => ({ id: t.id, title: t.title, description: t.completed ? '已完成' : '待办', type: 'task', completed: t.completed })),
      ...data.notes.filter(n => q && `${n.title} ${n.body}`.toLowerCase().includes(q)).map(n => ({ id: n.id, title: n.title || '无标题笔记', description: '笔记', type: 'note', completed: false })),
    ].slice(0, 40)
  }, [data, query])
  const select = (result: typeof results[number]) => result.type === 'task' ? onTask(result.id) : onNote(result.id)
  return <Modal title="搜索" className="search-modal" onClose={onClose}><div className="search-input-wrap"><SearchIcon size={20} strokeWidth={1.6} /><input ref={ref} autoFocus aria-label="搜索待办与笔记" placeholder="搜索待办、笔记，或一个想法…" value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(results.length - 1, i + 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)) } if (e.key === 'Enter' && results[index]) select(results[index]) }} /><kbd>Esc</kbd></div><div className="search-results-label">{query ? `搜索结果 · ${results.length}` : '接下来要做的事'}</div><div className="search-results">{results.map((r, i) => <button key={r.id} className={index === i ? 'selected' : ''} onMouseMove={() => setIndex(i)} onClick={() => select(r)}>{r.type === 'note' ? <FileText size={16} /> : r.completed ? <Check size={16} /> : <Circle size={15} />}<span><strong>{r.title}</strong><small>{r.description}</small></span><ArrowRight size={14} /></button>)}{!results.length && <div className="search-empty"><SearchIcon size={27} strokeWidth={1.2} /><p>还没有找到，换个关键词试试。</p></div>}</div><div className="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><CornerDownLeft size={12} /> 打开</span><span>给每个想法，一个落点。</span></div></Modal>
}

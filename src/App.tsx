import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { Sun, Layers, CalendarDays, SquareCheck, FileText, Search as SearchIcon, Plus, Settings as SettingsIcon, ChevronRight, ArrowDownWideNarrow, Check, Minus, Square, Copy, X, MoreHorizontal, Flower2, CircleCheck, FolderOpen, RotateCcw, AlertCircle } from 'lucide-react'
import { createInitialData, validateData, taskMatchesView, sortTasks } from '../shared/model.mjs'
import { addDays, dayKey, dateLabel, uid, useLatest, weekdays } from './lib'
import type { AppData, Task, View, Sort, Settings as SettingValues } from './types'
import { Modal, ModalHeader, Popover, IconButton, EmptyState } from './components/Primitives'
import { Composer, Inspector, QuickAdd, TaskRow } from './components/Tasks'
import Confetti, { type Burst } from './components/Confetti'
import Settings from './components/Settings'
import Notes from './components/Notes'
import Search from './components/Search'

type Toast = { id: number; message: string; undo?: () => void; error?: boolean }
const navigation = [{ id: 'today', label: '今天', Icon: Sun }, { id: 'all', label: '全部待办', Icon: Layers }, { id: 'upcoming', label: '即将到来', Icon: CalendarDays }, { id: 'completed', label: '已完成', Icon: SquareCheck }] as const

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [fatal, setFatal] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [saveAttempt, setSaveAttempt] = useState(0)
  const [view, setView] = useState<View>('today')
  const [today, setToday] = useState(dayKey())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [composer, setComposer] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [sort, setSort] = useState<Sort>('manual')
  const [sortOpen, setSortOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [importConfirm, setImportConfirm] = useState<AppData | null>(null)
  const [celebrating, setCelebrating] = useState<Set<string>>(new Set())
  const [burst, setBurst] = useState<Burst | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [maximized, setMaximized] = useState(false)
  const systemReduced = useReducedMotion()
  const reduced = Boolean(systemReduced || data?.settings.reduceMotion)
  const sortAnchor = useRef<HTMLButtonElement>(null)
  const moreAnchor = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveNumber = useRef(0)
  const timers = useRef<Map<string, number>>(new Map())
  const dataRef = useLatest(data)
  const viewRef = useLatest(view)
  const notify = useCallback((message: string, undo?: () => void, error = false) => setToast({ id: Date.now(), message, undo, error }), [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (window.desktop) {
          const { data: stored, warning } = await window.desktop.load()
          if (alive) { setData(stored ? validateData(stored) as AppData : createInitialData() as AppData); if (warning) notify(warning) }
        } else {
          const text = localStorage.getItem('liubai-data-v1')
          if (alive) setData(text ? validateData(JSON.parse(text)) as AppData : createInitialData() as AppData)
        }
      } catch (error) { if (alive) setFatal(error instanceof Error ? error.message : '本地数据暂时无法读取。') }
    }
    void load()
    return () => { alive = false }
  }, [notify])

  useEffect(() => {
    if (!data) return
    const number = ++saveNumber.current
    setSaveState('saving')
    const save = async () => {
      try {
        if (window.desktop) await window.desktop.save(data)
        else localStorage.setItem('liubai-data-v1', JSON.stringify(data))
        if (number === saveNumber.current) setSaveState('saved')
      } catch { if (number === saveNumber.current) setSaveState('error') }
    }
    void save()
  }, [data, saveAttempt])

  useEffect(() => {
    const tick = window.setInterval(() => setToday(dayKey()), 30000)
    const unsubscribe = window.desktop?.onMaximize(setMaximized)
    return () => { clearInterval(tick); unsubscribe?.() }
  }, [])
  useEffect(() => { const current = timers.current; return () => current.forEach(clearTimeout) }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.undo ? 6500 : 3500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.theme = data?.settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : data?.settings.theme || 'light' }
    apply(); media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [data?.settings.theme])

  const navigate = useCallback((next: View) => {
    setView(next); setComposer(false); setSelectedId(null); setNoteId(null); setMoreOpen(false)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  const updateTask = useCallback((id: string, patch: Partial<Task>) => setData(current => current ? { ...current, tasks: current.tasks.map(t => t.id === id ? { ...t, ...patch } : t) } : current), [])
  const createNote = useCallback(() => {
    const id = uid()
    setData(current => current ? { ...current, notes: [{ id, title: '', body: '', updatedAt: new Date().toISOString() }, ...current.notes] } : current)
    setView('notes'); setNoteId(id); setSelectedId(null)
  }, [])
  const openTask = useCallback((id: string) => { setSearchOpen(false); setView('all'); setSelectedId(id); setComposer(false) }, [])
  useEffect(() => window.desktop?.onTask(openTask), [openTask])

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).matches('input, textarea, select, [contenteditable="true"]')
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!settingsOpen && !importConfirm) setSearchOpen(v => !v); return }
      if ((event.ctrlKey || event.metaKey) && event.key === ',') { event.preventDefault(); if (!searchOpen && !importConfirm) setSettingsOpen(v => !v); return }
      if (settingsOpen || searchOpen || importConfirm) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); if (viewRef.current === 'notes') createNote(); else { if (viewRef.current === 'completed') setView('today'); setComposer(true) }; return }
      if (event.altKey && event.key === '1') { event.preventDefault(); navigate('today') }
      if (event.altKey && event.key === '2') { event.preventDefault(); navigate('all') }
      if (event.key === 'Escape') { setComposer(false); setSelectedId(null); setNoteId(null) }
      if (!typing && !(event.target as HTMLElement).closest('button, a, [role="checkbox"]') && event.key === 'Enter' && !selectedId && viewRef.current !== 'notes' && viewRef.current !== 'completed') { event.preventDefault(); setComposer(true) }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [settingsOpen, searchOpen, importConfirm, selectedId, navigate, createNote, viewRef])

  const toggleTask = useCallback((task: Task, element: HTMLElement) => {
    const next = !task.completed
    if (next && dataRef.current?.settings.confetti && !reduced) {
      const rect = element.getBoundingClientRect()
      setBurst({ id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    clearTimeout(timers.current.get(task.id))
    if (next) {
      setCelebrating(ids => new Set([...ids, task.id]))
      timers.current.set(task.id, window.setTimeout(() => { setCelebrating(ids => { const copy = new Set(ids); copy.delete(task.id); return copy }); timers.current.delete(task.id) }, reduced ? 80 : 780))
    } else setCelebrating(ids => { const copy = new Set(ids); copy.delete(task.id); return copy })
    updateTask(task.id, { completed: next, completedAt: next ? new Date().toISOString() : null })
    notify(next ? '又完成了一件事，真好。' : '已放回待办清单', () => { clearTimeout(timers.current.get(task.id)); setCelebrating(ids => { const copy = new Set(ids); copy.delete(task.id); return copy }); updateTask(task.id, { completed: task.completed, completedAt: task.completedAt }) })
  }, [dataRef, reduced, updateTask, notify])

  const deleteTask = (task: Task) => {
    const index = data!.tasks.findIndex(t => t.id === task.id)
    setData(current => current ? { ...current, tasks: current.tasks.filter(t => t.id !== task.id) } : current)
    setSelectedId(null)
    notify('待办已删除', () => setData(current => { if (!current) return current; const tasks = [...current.tasks]; tasks.splice(index, 0, task); return { ...current, tasks } }))
  }
  const exportData = async () => {
    if (!data) return
    try {
      if (window.desktop) { if (await window.desktop.exportData(data)) notify('备份已保存，安心收好。') }
      else { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `留白备份-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('备份已导出') }
    } catch { notify('备份未能保存，请重试。', undefined, true) }
  }
  const importData = async () => {
    try { if (window.desktop) { const imported = await window.desktop.importData(); if (imported) setImportConfirm(imported) } else fileInput.current?.click() }
    catch (error) { notify(error instanceof Error ? error.message : '无法读取此备份。', undefined, true) }
  }
  const updateSettings = (patch: Partial<SettingValues>) => setData(current => current ? { ...current, settings: { ...current.settings, ...patch } } : current)

  const filtered = useMemo(() => {
    if (!data) return []
    const matching = data.tasks.filter(t => taskMatchesView(t, view, today))
    const lookup = new Map(matching.map(t => [t.id, t]))
    return (sortTasks(matching.map(t => celebrating.has(t.id) ? { ...t, completed: false } : t), sort) as Task[]).map(t => lookup.get(t.id)!)
  }, [data, view, today, sort, celebrating])
  const pending = filtered.filter(t => !t.completed || celebrating.has(t.id))
  const done = filtered.filter(t => t.completed && !celebrating.has(t.id))
  const title = (view === 'notes' ? '笔记' : navigation.find(n => n.id === view)?.label) || '今天'
  const selectedTask = data?.tasks.find(t => t.id === selectedId)
  const todayTasks = data?.tasks.filter(t => t.dueDate === today) || []
  const todayDone = todayTasks.filter(t => t.completed).length
  const descriptions: Record<string, string> = { today: '把心思留给此刻，把事情一件件做好。', all: '所有的计划，都在这里慢慢发生。', upcoming: '给未来的日子，留一点期待。', completed: '每一个小小的完成，都值得被看见。', notes: '让一闪而过的想法，有处可放。' }
  const newTask = (input: Pick<Task, 'title' | 'dueDate' | 'starred'>) => {
    const task: Task = { id: uid(), notes: '', dueTime: '', completed: false, completedAt: null, createdAt: new Date().toISOString(), ...input }
    setData(current => current ? { ...current, tasks: [...current.tasks, task] } : current); setComposer(false)
    notify('新的一件小事，记下了。')
  }
  const row = (task: Task) => <TaskRow key={task.id} task={task} celebrating={celebrating.has(task.id)} selected={selectedId === task.id} onToggle={toggleTask} onSelect={() => setSelectedId(task.id)} onStar={() => updateTask(task.id, { starred: !task.starred })} />

  if (fatal) return <div className="fatal-screen"><AlertCircle size={30} /><h2>先让重要的内容，稳稳留住</h2><p>{fatal}</p><button className="primary-button" onClick={() => location.reload()}>重新读取</button></div>
  if (!data) return <div className="loading-screen"><img src="./icon.svg" alt="" /><span>留白</span><div className="loading-dot" /></div>

  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={{ duration: .2 }}><div className={`desktop-app ${data.settings.compact ? 'compact' : ''} ${reduced ? 'reduce-motion' : ''}`}>
    <aside className="sidebar"><div className="brand app-drag"><img src="./icon.svg" alt="留白图标" /><div><strong>留白</strong><span>给重要的事，一点空间。</span></div></div>
      <button className="sidebar-search" onClick={() => setSearchOpen(true)}><SearchIcon size={15} strokeWidth={1.6} /><span>搜索</span><kbd>Ctrl K</kbd></button>
      <div className="sidebar-navigation"><nav className="main-nav" aria-label="待办导航">{navigation.map(({ id, label, Icon }) => { const count = data.tasks.filter(t => taskMatchesView(t, id, today) && (id === 'completed' || !t.completed)).length; return <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => navigate(id)}>{view === id && <motion.span className="nav-selection" layoutId="navigation-active" transition={{ type: 'spring', stiffness: 430, damping: 36 }} />}<Icon size={18} strokeWidth={1.65} /><span>{label}</span>{count > 0 && <span className="nav-count">{count}</span>}</button> })}</nav>
      <div className="sidebar-divider" /><button className={`nav-item notes-nav ${view === 'notes' ? 'active' : ''}`} onClick={() => navigate('notes')}>{view === 'notes' && <motion.span className="nav-selection" layoutId="navigation-active" />}<FileText size={18} strokeWidth={1.65} /><span>笔记</span><span className="nav-count">{data.notes.length}</span></button></div>
      <div className="sidebar-bottom"><div className="sidebar-small-art" aria-hidden="true"><Flower2 size={31} strokeWidth={.8} /><span>慢慢来，也很好。</span></div><div className="sidebar-bottom-row"><button className="settings-trigger" title="设置 · Ctrl+," onClick={() => setSettingsOpen(true)}><SettingsIcon size={17} strokeWidth={1.5} /><span>设置</span></button><span className={`local-status ${saveState}`} title={saveState === 'saved' ? '内容已保存在此设备，可离线使用' : saveState === 'saving' ? '正在保存到本机' : '保存失败，点击重试'} onClick={() => { if (saveState === 'error') setSaveAttempt(n => n + 1) }}><span />{saveState === 'saved' ? '本地已保存' : saveState === 'saving' ? '保存中' : '重试保存'}</span></div></div>
    </aside>
    <section className="app-main"><header className="titlebar app-drag"><div className="breadcrumb"><span>我的空间</span><ChevronRight size={11} /><span>{title}</span></div><div className="window-controls"><button aria-label="最小化" onClick={() => window.desktop?.minimize()}><Minus size={15} /></button><button aria-label={maximized ? '还原窗口' : '最大化'} onClick={() => window.desktop?.maximize()}>{maximized ? <Copy size={12} /> : <Square size={12} />}</button><button className="window-close" aria-label="关闭窗口" onClick={() => window.desktop?.close()}><X size={16} /></button></div></header>
      <div className="workspace"><div className="main-scroll" ref={scrollRef}><main className={`content ${selectedTask ? 'with-inspector' : ''}`}><AnimatePresence mode="wait"><motion.div key={view} initial={{ opacity: 0, y: reduced ? 0 : 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: .16 }}>
        <div className="page-eyebrow">{view === 'today' ? <><span className="eyebrow-line" />{new Date(`${today}T12:00:00`).getMonth() + 1}月{new Date(`${today}T12:00:00`).getDate()}日<span className="eyebrow-dot">·</span>{weekdays[new Date(`${today}T12:00:00`).getDay()]}</> : <><span className="eyebrow-line" />{view === 'notes' ? '灵感与日常' : view === 'completed' ? '一点一滴，都算数' : '有条不紊，从容向前'}</>}</div>
        <div className="page-heading"><div><h1>{title}</h1><p>{descriptions[view] || '为在意的事情，留一份专注。'}</p></div>{view === 'today' && <div className="daily-progress" title={`今日已完成 ${todayDone} / ${todayTasks.length} 项`}><div className="progress-ring"><svg viewBox="0 0 46 46"><circle className="ring-track" cx="23" cy="23" r="19" /><motion.circle className="ring-fill" cx="23" cy="23" r="19" initial={false} animate={{ pathLength: todayTasks.length ? todayDone / todayTasks.length : 0 }} transition={{ duration: .6, ease: 'easeOut' }} /></svg><span>{todayDone}<small>/{todayTasks.length}</small></span></div><div><span>今日进度</span><strong>{todayTasks.length && todayDone === todayTasks.length ? '都完成啦' : '每一步都算数'}</strong></div></div>}</div>
        <div className="page-actions"><div className="view-caption">{view === 'notes' ? <FileText size={14} /> : view === 'completed' ? <CircleCheck size={14} /> : <SquareCheck size={14} />}<span>{view === 'notes' ? '随手记，慢慢想' : view === 'completed' ? `${done.length} 件已完成的小事` : <>{pending.length} 件待办<span className="caption-dot">·</span>不急，一件件来</>}</span></div><div className="toolbar-actions">{view !== 'notes' && <><button ref={sortAnchor} className={`sort-button ${sortOpen ? 'active' : ''}`} aria-label="排序方式" title="排序方式" onClick={() => setSortOpen(v => !v)}><ArrowDownWideNarrow size={15} /><span>排序</span></button><button ref={moreAnchor} className="icon-button more-button" aria-label="更多选项" title="更多选项" onClick={() => setMoreOpen(v => !v)}><MoreHorizontal size={18} /></button><span className="toolbar-divider" /></>}{view !== 'completed' && <button className="primary-button new-task-button" onClick={() => view === 'notes' ? createNote() : setComposer(v => !v)}><Plus size={15} /><span>{view === 'notes' ? '新建笔记' : '新建待办'}</span></button>}</div></div>
        {view === 'notes' ? <Notes notes={data.notes} selectedId={noteId} onSelect={setNoteId} onCreate={createNote} onUpdate={(id, patch) => setData(current => current ? { ...current, notes: current.notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n) } : current)} onDelete={id => { const note = data.notes.find(n => n.id === id)!; setData(current => current ? { ...current, notes: current.notes.filter(n => n.id !== id) } : current); setNoteId(null); notify('笔记已删除', () => setData(current => current ? { ...current, notes: [...current.notes, note] } : current)) }} /> : <>
          {view === 'completed' ? (done.length ? <div className="task-card completed-card"><AnimatePresence initial={false}>{done.map(row)}</AnimatePresence></div> : <EmptyState title="每个完成，都值得期待" description="勾选一件待办，你的进展就会留在这里。" />) : <>
            {view === 'upcoming' && pending.length ? <div className="upcoming-groups">{Array.from(new Set(pending.map(t => t.dueDate))).sort().map(date => <section key={date}><div className="group-heading"><CalendarDays size={13} />{dateLabel(date)}<span>{weekdays[new Date(`${date}T12:00:00`).getDay()]}</span></div><div className="task-card"><AnimatePresence initial={false}>{pending.filter(t => t.dueDate === date).map(row)}</AnimatePresence></div></section>)}</div> : pending.length ? <div className="task-card"><AnimatePresence initial={false}>{pending.map(row)}</AnimatePresence></div> : !composer && <EmptyState title={view === 'today' && todayDone > 0 ? '今天的事，都好好完成了' : view === 'upcoming' ? '未来，留一点空白也很好' : '给一个想法，留个位置'} description={view === 'today' && todayDone > 0 ? '把剩下的时间，留给喜欢的自己。' : view === 'upcoming' ? '设置未来的日期，待办就会出现在这里。' : '从一件简单的小事开始吧。'} />}
            <AnimatePresence initial={false}>{composer ? <Composer key="composer" defaultDate={view === 'today' ? today : view === 'upcoming' ? addDays(today, 1) : null} onCreate={newTask} onClose={() => setComposer(false)} /> : <QuickAdd key="quick-add" onClick={() => setComposer(true)} />}</AnimatePresence>
            {done.length > 0 && <section className="completed-section"><button className="completed-toggle" aria-expanded={showCompleted} onClick={() => setShowCompleted(v => !v)}><motion.span animate={{ rotate: showCompleted ? 90 : 0 }}><ChevronRight size={13} /></motion.span><span>已完成</span><span className="completed-count">{done.length}</span><span className="completed-line" /></button><AnimatePresence initial={false}>{showCompleted && <motion.div className="completed-rows" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><AnimatePresence initial={false}>{done.map(row)}</AnimatePresence></motion.div>}</AnimatePresence></section>}
          </>}
          <div className="page-footer"><Flower2 size={16} strokeWidth={1.1} /><span>{view === 'completed' ? '走过的每一步，都悄悄算数。' : '留一点空白，让美好慢慢发生。'}</span><span className="footer-rule" /></div>
        </>}
      </motion.div></AnimatePresence></main></div><AnimatePresence>{selectedTask && view !== 'notes' && <Inspector key={selectedTask.id} task={selectedTask} onUpdate={patch => updateTask(selectedTask.id, patch)} onClose={() => setSelectedId(null)} onDelete={() => deleteTask(selectedTask)} onToggle={toggleTask} />}</AnimatePresence></div>
    </section>
    {sortOpen && <Popover anchor={sortAnchor} onClose={() => setSortOpen(false)} className="menu-popover" width={190}><div className="menu-label">排序方式</div>{([{ id: 'manual', label: '重要事项优先' }, { id: 'date', label: '按日期排序' }, { id: 'created', label: '最近添加优先' }] as const).map(s => <button key={s.id} onClick={() => { setSort(s.id); setSortOpen(false) }}>{s.label}{sort === s.id && <Check size={14} />}</button>)}</Popover>}
    {moreOpen && <Popover anchor={moreAnchor} onClose={() => setMoreOpen(false)} className="menu-popover" width={210}><button onClick={() => { setShowCompleted(v => !v); setMoreOpen(false) }}><SquareCheck size={14} />{showCompleted ? '收起已完成' : '展开已完成'}</button><button onClick={() => { void exportData(); setMoreOpen(false) }}><FolderOpen size={14} />导出全部数据</button></Popover>}
    <AnimatePresence>{settingsOpen && <Settings data={data} onUpdate={updateSettings} onClose={() => setSettingsOpen(false)} onExport={() => void exportData()} onImport={() => void importData()} />}{searchOpen && <Search data={data} onClose={() => setSearchOpen(false)} onTask={openTask} onNote={id => { setSearchOpen(false); setView('notes'); setNoteId(id); setSelectedId(null) }} />}
      {importConfirm && <Modal title="恢复备份" onClose={() => setImportConfirm(null)} className="confirm-modal"><ModalHeader title="用这份备份恢复留白？" onClose={() => setImportConfirm(null)} /><p>备份中包含 {importConfirm.tasks.length} 件待办和 {importConfirm.notes.length} 篇笔记。恢复会替换当前内容，建议先导出当前数据。</p><div className="confirm-actions"><button className="secondary-button" onClick={() => void exportData()}>先备份当前数据</button><button className="primary-button" onClick={() => { setData(importConfirm); setImportConfirm(null); setSettingsOpen(false); navigate('today'); notify('备份已恢复，欢迎回来。') }}>恢复备份</button></div></Modal>}
    </AnimatePresence>
    <AnimatePresence>{toast && <motion.div className={`toast ${toast.error ? 'error' : ''}`} role="status" key="feedback" initial={{ opacity: 0, y: 12, x: '-50%', scale: .97 }} animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }} exit={{ opacity: 0, y: 6, x: '-50%', scale: .98 }}><span className="toast-icon">{toast.error ? <AlertCircle size={15} /> : <Check size={14} />}</span><span>{toast.message}</span>{toast.undo && <button className="toast-undo" onClick={() => { toast.undo?.(); setToast(null) }}><RotateCcw size={12} />撤销</button>}<button className="toast-dismiss" aria-label="关闭提示" onClick={() => setToast(null)}><X size={12} /></button></motion.div>}</AnimatePresence>
    <input ref={fileInput} className="hidden-file" type="file" accept=".json" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 25 * 1024 * 1024) throw new Error('备份文件超过 25 MB。'); setImportConfirm(validateData(JSON.parse(await file.text())) as AppData) } catch (error) { notify(error instanceof Error ? error.message : '无法读取此备份。', undefined, true) }; e.target.value = '' }} />
  </div><Confetti burst={burst} /></MotionConfig>
}

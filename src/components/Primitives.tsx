import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Sun, CalendarDays, Minus, X } from 'lucide-react'
import { addDays, dayKey, dateLabel } from '../lib'
import { useLatest } from '../lib'

export function IconButton({ label, children, onClick, className = '', ...props }: { label: string; children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean; 'aria-expanded'?: boolean }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick} {...props}>{children}</button>
}

export function Modal({ children, onClose, title, className = '' }: { children: ReactNode; onClose: () => void; title: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useLatest(onClose)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const el = ref.current!
    const timer = window.setTimeout(() => (el.querySelector('[autofocus], input, button, textarea') as HTMLElement)?.focus(), 40)
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current() }
      if (event.key === 'Tab') {
        const nodes = Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]')).filter(n => n.offsetParent !== null)
        if (!nodes.length) { event.preventDefault(); return }
        if (event.shiftKey && (document.activeElement === nodes[0] || !el.contains(document.activeElement))) { event.preventDefault(); nodes.at(-1)?.focus() }
        if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus() }
      }
    }
    el.addEventListener('keydown', key)
    return () => { clearTimeout(timer); el.removeEventListener('keydown', key); previous?.focus() }
  }, [closeRef])
  return createPortal(<motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`modal ${className}`} initial={{ opacity: 0, scale: .975, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 8 }} transition={{ type: 'spring', stiffness: 430, damping: 35 }}>{children}</motion.div>
  </motion.div>, document.body)
}

export function Popover({ anchor, children, onClose, className = '', width = 260 }: { anchor: RefObject<HTMLElement | null>; children: ReactNode; onClose: () => void; className?: string; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  useLayoutEffect(() => {
    const rect = anchor.current?.getBoundingClientRect()
    if (!rect) return
    const height = ref.current?.offsetHeight || 300
    setPosition({ left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)), top: rect.bottom + height + 10 > innerHeight ? Math.max(12, rect.top - height - 8) : rect.bottom + 8 })
  }, [anchor, width])
  useEffect(() => {
    const click = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) onClose() }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopImmediatePropagation(); onClose(); anchor.current?.focus() } }
    const resize = () => onClose()
    document.addEventListener('pointerdown', click)
    document.addEventListener('keydown', key, true)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', click); document.removeEventListener('keydown', key, true); window.removeEventListener('resize', resize) }
  }, [anchor, onClose])
  return createPortal(<motion.div ref={ref} role="dialog" className={`popover ${className}`} style={{ ...position, width }} initial={{ opacity: 0, y: -4, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .14 }}>{children}</motion.div>, document.body)
}

export function DatePicker({ value, onChange, className = '', compact = false }: { value: string | null; onChange: (value: string | null) => void; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date(`${value || dayKey()}T12:00:00`))
  const anchor = useRef<HTMLButtonElement>(null)
  const today = dayKey()
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 12)
  const offset = (start.getDay() + 6) % 7
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(index - offset + 1)
    return date
  })
  const choose = (key: string | null) => { onChange(key); setOpen(false) }
  return <>
    <button type="button" ref={anchor} className={`${compact ? 'chip' : 'field-button'} ${value ? 'has-date' : ''} ${className}`} aria-label="设置日期" aria-expanded={open} onClick={() => { setMonth(new Date(`${value || today}T12:00:00`)); setOpen(v => !v) }}><CalendarDays size={14} /><span>{dateLabel(value)}</span></button>
    {open && <Popover anchor={anchor} onClose={() => setOpen(false)} className="calendar-popover" width={280}>
      <div className="calendar-shortcuts"><button onClick={() => choose(today)}><Sun size={15} />今天<span>{new Date().getDate()}日</span></button><button onClick={() => choose(addDays(today, 1))}><CalendarDays size={15} />明天</button></div>
      <div className="calendar-heading"><strong>{month.getFullYear()}年{month.getMonth() + 1}月</strong><div><IconButton label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><ChevronLeft size={15} /></IconButton><IconButton label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><ChevronRight size={15} /></IconButton></div></div>
      <div className="calendar-grid">{'一二三四五六日'.split('').map(d => <span className="week-label" key={d}>{d}</span>)}{cells.map(date => { const key = dayKey(date); return <button type="button" key={key} aria-label={key} aria-pressed={value === key} className={`${date.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === today ? 'today' : ''} ${key === value ? 'selected' : ''}`} onClick={() => choose(key)}>{date.getDate()}</button> })}</div>
      <button className="calendar-clear" onClick={() => choose(null)}><Minus size={14} />不设日期</button>
    </Popover>}
  </>
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={onChange}><motion.span layout transition={{ type: 'spring', stiffness: 560, damping: 32 }} /></button>
}

export function EmptyState({ title, description, kind = 'tasks' }: { title: string; description: string; kind?: string }) {
  return <motion.div className="empty-state" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className={`empty-illustration ${kind}`}><div className="empty-square"><Check size={29} strokeWidth={1.5} /></div><span className="empty-spark s1" /><span className="empty-spark s2" /><span className="empty-spark s3" /></div><h3>{title}</h3><p>{description}</p></motion.div>
}

export function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return <div className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></div>
}

export { AnimatePresence }

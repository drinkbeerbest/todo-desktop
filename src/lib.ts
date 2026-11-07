import { useEffect, useRef } from 'react'
import { addDays, dayKey } from '../shared/model.mjs'

export { dayKey, addDays }
export const uid = () => crypto.randomUUID()
export const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
export function dateLabel(key: string | null, today = dayKey()) {
  if (!key) return '不设日期'
  if (key === today) return '今天'
  if (key === addDays(today, 1)) return '明天'
  if (key === addDays(today, -1)) return '昨天'
  const date = new Date(`${key}T12:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}
export function useDay() {
  const ref = useRef(dayKey())
  return ref.current
}
export function useEscape(callback: () => void) {
  const latest = useLatest(callback)
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); latest.current() } }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [latest])
}

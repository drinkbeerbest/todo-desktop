import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
export type Burst = { id: number; x: number; y: number }
type Particle = { x: number; y: number; vx: number; vy: number; rotation: number; spin: number; color: string; width: number; height: number; age: number }
const colors = ['#d9a14a', '#c6ae79', '#95af9b', '#a29dbf', '#c98e80', '#e8c66c']

export default function Confetti({ burst }: { burst: Burst | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const frame = useRef(0)
  useEffect(() => {
    if (!burst) return
    const el = canvas.current!
    const ratio = window.devicePixelRatio || 1
    el.width = innerWidth * ratio; el.height = innerHeight * ratio
    el.style.width = `${innerWidth}px`; el.style.height = `${innerHeight}px`
    const ctx = el.getContext('2d')!
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    for (let i = 0; i < 25; i++) {
      const angle = -Math.PI + Math.random() * Math.PI
      const speed = 1.9 + Math.random() * 3.3
      particles.current.push({ x: burst.x, y: burst.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - .8, rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * .22, color: colors[i % colors.length], width: 3 + Math.random() * 3, height: 2 + Math.random() * 4, age: 0 })
    }
    cancelAnimationFrame(frame.current)
    let last = performance.now()
    const draw = (now: number) => {
      const step = Math.min(2.5, (now - last) / 16.67); last = now
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      particles.current = particles.current.filter(p => p.age < 62)
      for (const p of particles.current) {
        p.age += step; p.x += p.vx * step; p.y += p.vy * step; p.vy += .105 * step; p.vx *= .985 ** step; p.rotation += p.spin * step
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.globalAlpha = Math.min(1, (62 - p.age) / 22); ctx.fillStyle = p.color
        ctx.beginPath(); ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height * (.65 + .35 * Math.cos(p.age / 5)), .9); ctx.fill(); ctx.restore()
      }
      if (particles.current.length) frame.current = requestAnimationFrame(draw)
    }
    frame.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame.current)
  }, [burst])
  return createPortal(<canvas className="confetti-canvas" aria-hidden="true" ref={canvas} />, document.body)
}

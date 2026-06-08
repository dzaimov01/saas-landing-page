import { useEffect, useRef, useState } from 'react'

export default function Counter({ to, suffix = '', decimals = 0, duration = 1400 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const tick = (now) => {
            const p = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setVal(to * eased)
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [to, duration])

  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  )
}

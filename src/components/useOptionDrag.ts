import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { moveOption } from '../editor/designs'

/** How far a mouse moves with the button down before it's a drag and not a click */
const MOUSE_SLOP = 5
/** How long a finger rests on a card before it picks the card up. Moving sooner scrolls the strip instead. */
const HOLD_MS = 350
const TOUCH_SLOP = 8
/** Near either end of the strip, a dragged card scrolls it */
const EDGE = 40

interface Drag {
  id: string
  /** How far the card has moved, in px */
  dx: number
  from: number
  to: number
  /** How far the other cards slide to make room: the dragged card's width and the gap */
  step: number
}

interface Gesture {
  id: string
  el: HTMLElement
  strip: HTMLElement
  pointerId: number
  touch: boolean
  startX: number
  startY: number
  /** The pointer's start, measured along the strip's content, so scrolling the strip moves the card too */
  startContent: number
  lastX: number
  active: boolean
  /** Each card's left edge along the strip's content and its width, as they were when the drag began */
  slots: { left: number; width: number }[]
  from: number
  /** Where the card would land if let go now */
  to: number
  step: number
  timer?: number
  raf?: number
  cleanup: () => void
}

/**
 * Lets the color option cards be dragged to a new place in the strip, with a mouse or a finger. A mouse drags as soon
 * as it moves; a finger holds still on a card for a moment first, so swiping still scrolls the strip. The other cards
 * slide aside to show where it will land, and letting go saves the new order with the design.
 */
export function useOptionDrag(ids: string[], enabled: boolean) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const g = useRef<Gesture | null>(null)
  /** After a drop, the card glides from where it was let go into its slot */
  const settle = useRef<{ el: HTMLElement; id: string; to: number; center: number; at: number } | null>(null)
  /** Clicks right after a drop are the end of the drag, not a click on an option */
  const quietUntil = useRef(0)
  const order = ids.join('\n')

  const stop = (commit: boolean) => {
    const s = g.current
    if (!s) return
    g.current = null
    s.cleanup()
    if (!s.active) return
    const to = commit ? s.to : s.from
    const r = s.el.getBoundingClientRect()
    settle.current = { el: s.el, id: s.id, to, center: r.left + r.width / 2, at: performance.now() }
    quietUntil.current = performance.now() + 400
    document.body.classList.remove('option-dragging')
    setDrag(null)
    if (to !== s.from) moveOption(s.id, to)
  }
  // The window listeners and timers call the latest `stop` through this
  const stopRef = useRef(stop)
  stopRef.current = stop

  const measure = (s: Gesture) => {
    const box = s.strip.getBoundingClientRect()
    const content = s.lastX - box.left + s.strip.scrollLeft
    const first = s.slots[0].left - s.slots[s.from].left
    const last = s.slots[s.slots.length - 1].left - s.slots[s.from].left
    // Keep the card within the row of options, off the "Save as new option" button
    const dx = Math.min(last, Math.max(first, content - s.startContent))
    const center = s.slots[s.from].left + s.slots[s.from].width / 2 + dx
    s.to = s.slots.filter((slot, i) => i !== s.from && slot.left + slot.width / 2 < center).length
    setDrag({ id: s.id, dx, from: s.from, to: s.to, step: s.step })
  }

  const activate = (s: Gesture) => {
    window.clearTimeout(s.timer)
    const box = s.strip.getBoundingClientRect()
    const cards = Array.from(s.strip.querySelectorAll<HTMLElement>('[data-option-id]'))
    s.slots = cards.map((c) => {
      const r = c.getBoundingClientRect()
      return { left: r.left - box.left + s.strip.scrollLeft, width: r.width }
    })
    s.from = s.to = cards.indexOf(s.el)
    if (s.from < 0 || s.slots.length !== ids.length) return stopRef.current(false)
    s.active = true
    const gap = parseFloat(getComputedStyle(s.strip).columnGap) || 8
    s.step = s.slots[s.from].width + gap
    try {
      s.el.setPointerCapture(s.pointerId)
    } catch {
      // The pointer is already gone; the next move or release ends the drag
    }
    if (s.touch) {
      try {
        navigator.vibrate?.(8)
      } catch {
        // Not every browser lets a page buzz
      }
    }
    document.body.classList.add('option-dragging')
    const scroll = () => {
      if (g.current !== s) return
      const b = s.strip.getBoundingClientRect()
      const speed = s.lastX < b.left + EDGE ? -(b.left + EDGE - s.lastX) / 3
        : s.lastX > b.right - EDGE ? (s.lastX - (b.right - EDGE)) / 3 : 0
      if (speed) {
        const was = s.strip.scrollLeft
        s.strip.scrollLeft += Math.max(-16, Math.min(16, speed))
        if (s.strip.scrollLeft !== was) measure(s)
      }
      s.raf = requestAnimationFrame(scroll)
    }
    s.raf = requestAnimationFrame(scroll)
    measure(s)
  }

  /** Starts watching a press on a card; it becomes a drag once the mouse moves or the finger has held still */
  const start = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    stopRef.current(false)
    if (!enabled || ids.length < 2 || e.button !== 0 || !e.isPrimary) return
    if ((e.target as HTMLElement).closest('button, input')) return
    const el = e.currentTarget
    const strip = el.parentElement
    if (!strip) return
    const box = strip.getBoundingClientRect()
    const touch = e.pointerType !== 'mouse'
    const onMove = (ev: PointerEvent) => {
      const s = g.current
      if (!s || ev.pointerId !== s.pointerId) return
      s.lastX = ev.clientX
      if (s.active) return measure(s)
      const moved = Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY)
      if (!s.touch && moved > MOUSE_SLOP) activate(s)
      // A finger that moves before the hold is a swipe: let the strip scroll
      else if (s.touch && moved > TOUCH_SLOP) stopRef.current(false)
    }
    const onUp = (ev: PointerEvent) => ev.pointerId === g.current?.pointerId && stopRef.current(true)
    const onCancel = (ev: PointerEvent) => ev.pointerId === g.current?.pointerId && stopRef.current(false)
    // Once a finger has picked a card up, moving it drags the card instead of scrolling the page
    const onTouchMove = (ev: TouchEvent) => g.current?.active && ev.cancelable && ev.preventDefault()
    // A long press would open the browser's menu for the picture
    const onMenu = (ev: Event) => g.current?.active && ev.preventDefault()
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !g.current?.active) return
      ev.preventDefault()
      ev.stopPropagation()
      stopRef.current(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('contextmenu', onMenu)
    window.addEventListener('keydown', onKey, true)
    const s: Gesture = {
      id, el, strip, pointerId: e.pointerId, touch, startX: e.clientX, startY: e.clientY, lastX: e.clientX,
      startContent: e.clientX - box.left + strip.scrollLeft, active: false, slots: [], from: -1, to: -1, step: 0,
      cleanup: () => {
        window.clearTimeout(s.timer)
        if (s.raf) cancelAnimationFrame(s.raf)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('contextmenu', onMenu)
        window.removeEventListener('keydown', onKey, true)
        try {
          if (el.hasPointerCapture(s.pointerId)) el.releasePointerCapture(s.pointerId)
        } catch {
          // Already released
        }
      },
    }
    g.current = s
    if (touch) s.timer = window.setTimeout(() => g.current === s && activate(s), HOLD_MS)
  }

  // The options changed under the drag (saved elsewhere, another design opened): drop it where it was
  useEffect(() => () => stopRef.current(false), [order])
  useEffect(() => {
    if (!enabled) stopRef.current(false)
  }, [enabled])

  // Glide the dropped card from where it was let go into its slot, once the strip shows the new order
  useLayoutEffect(() => {
    const s = settle.current
    if (!s || drag) return
    // The save didn't go through: forget it, so a later change doesn't animate this card
    if (performance.now() - s.at > 1000) settle.current = null
    if (ids.indexOf(s.id) !== s.to) return
    settle.current = null
    if (!s.el.isConnected) return
    const r = s.el.getBoundingClientRect()
    const dx = s.center - (r.left + r.width / 2)
    if (Math.abs(dx) < 1) return
    const st = s.el.style
    st.transition = 'none'
    st.zIndex = '3'
    st.transform = `translateX(${dx}px) scale(1.04)`
    void s.el.offsetWidth
    st.transition = 'transform 160ms ease-out'
    st.transform = ''
    const done = () => {
      st.transition = ''
      st.zIndex = ''
      s.el.removeEventListener('transitionend', done)
    }
    s.el.addEventListener('transitionend', done)
    window.setTimeout(done, 300)
  })

  /** Where each card sits while one is dragged: the dragged one follows the pointer, the rest slide aside */
  const style = (id: string, i: number): CSSProperties | undefined => {
    if (!drag) return undefined
    if (id === drag.id) return { transform: `translateX(${drag.dx}px) scale(1.04)`, zIndex: 3, transition: 'none' }
    const shift = drag.from < drag.to && i > drag.from && i <= drag.to ? -drag.step
      : drag.from > drag.to && i >= drag.to && i < drag.from ? drag.step : 0
    return { transform: shift ? `translateX(${shift}px)` : undefined, transition: 'transform 150ms ease' }
  }

  return {
    start,
    style,
    /** The card being dragged, if any */
    dragging: drag?.id ?? null,
    /** True for the click that ends a drag, which shouldn't switch options */
    justDropped: () => performance.now() < quietUntil.current,
  }
}

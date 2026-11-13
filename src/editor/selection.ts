import { Mask, Rect } from './pixels'

export type SelectMode = 'replace' | 'add' | 'subtract' | 'intersect'

export function rectMask(w: number, h: number, r: Rect): Mask {
  const m = new Uint8Array(w * h)
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y))
  const x1 = Math.min(w, Math.round(r.x + r.w)), y1 = Math.min(h, Math.round(r.y + r.h))
  for (let y = y0; y < y1; y++) m.fill(255, y * w + x0, y * w + x1)
  return m
}

export function invertMask(m: Mask): Mask {
  const out = new Uint8Array(m.length)
  for (let i = 0; i < m.length; i++) out[i] = m[i] ? 0 : 255
  return out
}

/** Combines a new selection with the old one. A null old selection is nothing selected. */
export function combine(old: Mask | null, next: Mask, mode: SelectMode): Mask {
  if (mode === 'replace') return next
  if (!old) return mode === 'add' ? next : new Uint8Array(next.length)
  const out = new Uint8Array(next.length)
  for (let i = 0; i < next.length; i++) {
    const a = old[i] !== 0, b = next[i] !== 0
    const on = mode === 'add' ? a || b : mode === 'subtract' ? a && !b : a && b
    out[i] = on ? 255 : 0
  }
  return out
}

export function isEmpty(m: Mask): boolean {
  for (let i = 0; i < m.length; i++) if (m[i]) return false
  return true
}

export function maskBounds(m: Mask, w: number, h: number): Rect | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Distance from every pixel to the nearest pixel that's on, in 3-4 chamfer units (3 per straight step, 4 per
 * diagonal), which is close to round. Two passes, so it's quick at any radius.
 */
function chamfer(m: Mask, w: number, h: number): Uint32Array {
  const INF = 0x3fffffff
  const d = new Uint32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? 0 : INF
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      let v = d[p]
      if (v === 0) continue
      if (x > 0) v = Math.min(v, d[p - 1] + 3)
      if (y > 0) {
        v = Math.min(v, d[p - w] + 3)
        if (x > 0) v = Math.min(v, d[p - w - 1] + 4)
        if (x < w - 1) v = Math.min(v, d[p - w + 1] + 4)
      }
      d[p] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x
      let v = d[p]
      if (v === 0) continue
      if (x < w - 1) v = Math.min(v, d[p + 1] + 3)
      if (y < h - 1) {
        v = Math.min(v, d[p + w] + 3)
        if (x < w - 1) v = Math.min(v, d[p + w + 1] + 4)
        if (x > 0) v = Math.min(v, d[p + w - 1] + 4)
      }
      d[p] = v
    }
  }
  return d
}

/** Widens the selection by `px` pixels all round */
export function growMask(m: Mask, w: number, h: number, px: number): Mask {
  if (px <= 0) return m
  const d = chamfer(m, w, h)
  const limit = px * 3
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = d[i] <= limit ? 255 : 0
  return out
}

/** Narrows the selection by `px` pixels all round. The image's edges don't count as outside. */
export function shrinkMask(m: Mask, w: number, h: number, px: number): Mask {
  if (px <= 0) return m
  return invertMask(growMask(invertMask(m), w, h, px))
}

/**
 * The selection's outline as line segments in pixel coordinates, [x0, y0, x1, y1, ...], with runs along a row or
 * column joined, for drawing marching ants.
 */
export function outlineSegments(m: Mask, w: number, h: number): Float32Array {
  const segs: number[] = []
  // Horizontal edges, between row y-1 and row y
  for (let y = 0; y <= h; y++) {
    let start = -1
    for (let x = 0; x <= w; x++) {
      const a = y > 0 && x < w ? m[(y - 1) * w + x] !== 0 : false
      const b = y < h && x < w ? m[y * w + x] !== 0 : false
      const edge = x < w && a !== b
      if (edge && start < 0) start = x
      if (!edge && start >= 0) {
        segs.push(start, y, x, y)
        start = -1
      }
    }
  }
  // Vertical edges, between column x-1 and column x
  for (let x = 0; x <= w; x++) {
    let start = -1
    for (let y = 0; y <= h; y++) {
      const a = x > 0 && y < h ? m[y * w + x - 1] !== 0 : false
      const b = x < w && y < h ? m[y * w + x] !== 0 : false
      const edge = y < h && a !== b
      if (edge && start < 0) start = y
      if (!edge && start >= 0) {
        segs.push(x, start, x, y)
        start = -1
      }
    }
  }
  return new Float32Array(segs)
}

export function cropMask(m: Mask, w: number, r: Rect): Mask {
  const out = new Uint8Array(r.w * r.h)
  for (let y = 0; y < r.h; y++) out.set(m.subarray((r.y + y) * w + r.x, (r.y + y) * w + r.x + r.w), y * r.w)
  return out
}

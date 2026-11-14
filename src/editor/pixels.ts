import { RGBA } from '../lib/color'

/** ImageData's shape, so the pure code runs in tests without a DOM */
export interface Pixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

/** One byte per pixel: 0 out, 255 in. Partial values aren't used. */
export type Mask = Uint8Array

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function makePixels(width: number, height: number): Pixels {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) }
}

function close(d: Uint8ClampedArray, i: number, r: number, g: number, b: number, a: number, tol: number): boolean {
  // Fully clear pixels match each other whatever their RGB, since it doesn't show
  if (a === 0 && d[i + 3] === 0) return true
  return (
    Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol &&
    Math.abs(d[i + 3] - a) <= tol
  )
}

/**
 * The pixels like the one at (x, y), within `tolerance` (0–255) on every channel. Contiguous follows 4-connected
 * neighbors with a scanline fill; otherwise every matching pixel in the image counts.
 */
export function regionAt(src: Pixels, x: number, y: number, tolerance: number, contiguous: boolean): Mask {
  const { width: w, height: h, data: d } = src
  const mask = new Uint8Array(w * h)
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || y < 0 || x >= w || y >= h) return mask
  const s = (y * w + x) * 4
  const r = d[s], g = d[s + 1], b = d[s + 2], a = d[s + 3]
  if (!contiguous) {
    for (let p = 0, i = 0; p < w * h; p++, i += 4) if (close(d, i, r, g, b, a, tolerance)) mask[p] = 255
    return mask
  }
  const stack: number[] = [x, y]
  while (stack.length) {
    const sy = stack.pop()!
    let sx = stack.pop()!
    const row = sy * w
    while (sx > 0 && !mask[row + sx - 1] && close(d, (row + sx - 1) * 4, r, g, b, a, tolerance)) sx--
    let upOpen = false
    let downOpen = false
    for (let cx = sx; cx < w; cx++) {
      const p = row + cx
      if (mask[p] || !close(d, p * 4, r, g, b, a, tolerance)) break
      mask[p] = 255
      if (sy > 0) {
        const q = p - w
        const ok = !mask[q] && close(d, q * 4, r, g, b, a, tolerance)
        if (ok && !upOpen) stack.push(cx, sy - 1)
        upOpen = ok
      }
      if (sy < h - 1) {
        const q = p + w
        const ok = !mask[q] && close(d, q * 4, r, g, b, a, tolerance)
        if (ok && !downOpen) stack.push(cx, sy + 1)
        downOpen = ok
      }
    }
  }
  return mask
}

/** Paints `color` into `dst` wherever `mask` (and the selection, if any) is on. Returns the box it changed, or null. */
export function paintMask(dst: Pixels, mask: Mask, color: RGBA, selection: Mask | null): Rect | null {
  const { width: w, height: h, data: d } = dst
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      if (!mask[p] || (selection && !selection[p])) continue
      const i = p * 4
      d[i] = color[0]
      d[i + 1] = color[1]
      d[i + 2] = color[2]
      d[i + 3] = color[3]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Swaps one color for another wherever it appears, keeping each pixel's alpha so soft edges stay soft. Pixels
 * within `tolerance` of `from` count. Returns how many changed.
 */
export function replaceColor(px: Pixels, from: RGBA, to: RGBA, tolerance: number, selection: Mask | null): number {
  const d = px.data
  let n = 0
  for (let p = 0, i = 0; i < d.length; p++, i += 4) {
    if (d[i + 3] === 0 || (selection && !selection[p])) continue
    if (
      Math.abs(d[i] - from[0]) <= tolerance && Math.abs(d[i + 1] - from[1]) <= tolerance &&
      Math.abs(d[i + 2] - from[2]) <= tolerance
    ) {
      d[i] = to[0]
      d[i + 1] = to[1]
      d[i + 2] = to[2]
      n++
    }
  }
  return n
}

/**
 * Changes one ink to `to`: every pixel closer to `from` than to any of the design's `others`, and within
 * `maxDistance` of it (RGB distance, so slight noise around the ink still moves with it). Other inks never change,
 * however near they are. Returns how many pixels changed.
 */
export function replaceInk(px: Pixels, from: RGBA, others: RGBA[], to: RGBA, selection: Mask | null, maxDistance = 60): number {
  const d = px.data
  const max2 = maxDistance * maxDistance
  const rest = others.filter((o) => o[0] !== from[0] || o[1] !== from[1] || o[2] !== from[2])
  let n = 0
  for (let p = 0, i = 0; i < d.length; p++, i += 4) {
    if (d[i + 3] === 0 || (selection && !selection[p])) continue
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const own = (r - from[0]) ** 2 + (g - from[1]) ** 2 + (b - from[2]) ** 2
    if (own > max2) continue
    let mine = true
    for (const o of rest) {
      if ((r - o[0]) ** 2 + (g - o[1]) ** 2 + (b - o[2]) ** 2 < own) {
        mine = false
        break
      }
    }
    if (!mine) continue
    d[i] = to[0]
    d[i + 1] = to[1]
    d[i + 2] = to[2]
    n++
  }
  return n
}

/**
 * Clears every pixel that belongs to one of the `hidden` inks: nearer to it than to any other ink, and within
 * `maxDistance`. Only for showing art without those inks; layers themselves are never changed. Returns how many.
 */
export function hideInks(px: Pixels, hidden: RGBA[], inks: RGBA[], maxDistance = 60): number {
  if (!hidden.length) return 0
  const d = px.data
  const max2 = maxDistance * maxDistance
  const same = (a: RGBA, b: RGBA) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
  const rest = inks.filter((o) => !hidden.some((h) => same(h, o)))
  let n = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const r = d[i], g = d[i + 1], b = d[i + 2]
    let near = Infinity
    for (const h of hidden) near = Math.min(near, (r - h[0]) ** 2 + (g - h[1]) ** 2 + (b - h[2]) ** 2)
    if (near > max2) continue
    let mine = true
    for (const o of rest) {
      if ((r - o[0]) ** 2 + (g - o[1]) ** 2 + (b - o[2]) ** 2 < near) {
        mine = false
        break
      }
    }
    if (!mine) continue
    d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0
    n++
  }
  return n
}

/** A filled circle of `color` at (cx, cy), inside the selection. Returns the box it covers, clipped to the image. */
export function stamp(px: Pixels, cx: number, cy: number, size: number, color: RGBA, selection: Mask | null): Rect | null {
  const { width: w, height: h, data: d } = px
  const r = size / 2
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r))
  if (x0 > x1 || y0 > y1) return null
  const r2 = size <= 1.5 ? 0.5 : r * r
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy
      if (size > 1.5 && dx * dx + dy * dy > r2) continue
      if (size <= 1.5 && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) continue
      const p = y * w + x
      if (selection && !selection[p]) continue
      const i = p * 4
      d[i] = color[0]
      d[i + 1] = color[1]
      d[i + 2] = color[2]
      d[i + 3] = color[3]
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Stamps along a line, close enough together to leave no gaps */
export function strokeLine(
  px: Pixels, ax: number, ay: number, bx: number, by: number, size: number, color: RGBA, selection: Mask | null,
): Rect | null {
  const dist = Math.hypot(bx - ax, by - ay)
  const steps = Math.max(1, Math.ceil(dist / Math.max(0.5, size / 4)))
  let box: Rect | null = null
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    box = unionRect(box, stamp(px, ax + (bx - ax) * t, ay + (by - ay) * t, size, color, selection))
  }
  return box
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b
  if (!b) return a
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** The box around every pixel that isn't fully clear, or null for an empty image */
export function contentBounds(px: Pixels): Rect | null {
  const { width: w, height: h, data: d } = px
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] === 0) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** The box where two same-sized images differ, or null if they're the same */
export function diffBounds(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number): Rect | null {
  const ua = new Uint32Array(a.buffer, a.byteOffset, w * h)
  const ub = new Uint32Array(b.buffer, b.byteOffset, w * h)
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      if (ua[row + x] === ub[row + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** A copy of part of an image. The rect must be inside it. */
export function cropPixels(px: Pixels, r: Rect): Pixels {
  const out = makePixels(r.w, r.h)
  for (let y = 0; y < r.h; y++) {
    const start = ((r.y + y) * px.width + r.x) * 4
    out.data.set(px.data.subarray(start, start + r.w * 4), y * r.w * 4)
  }
  return out
}

/** Nearest-neighbor resize: keeps edges hard and adds no new colors, which suits spot-color screen printing */
export function resizeNearest(px: Pixels, w: number, h: number): Pixels {
  const out = makePixels(w, h)
  const s = new Uint32Array(px.data.buffer, px.data.byteOffset, px.width * px.height)
  const o = new Uint32Array(out.data.buffer)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(px.height - 1, Math.floor(((y + 0.5) * px.height) / h))
    for (let x = 0; x < w; x++) {
      const sx = Math.min(px.width - 1, Math.floor(((x + 0.5) * px.width) / w))
      o[y * w + x] = s[sy * px.width + sx]
    }
  }
  return out
}

export interface ColorCount {
  hex: string
  rgba: RGBA
  /** Share of the design's opaque pixels, 0–1 */
  share: number
}

/**
 * The main colors in an image, most used first. Samples at most ~250k pixels, merges colors within `merge` of each
 * other, and drops ones under `minShare` of the opaque area, like antialiased edges.
 */
export function dominantColors(px: Pixels, max = 12, merge = 24, minShare = 0.004): ColorCount[] {
  const { width: w, height: h, data: d } = px
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 250000)))
  const counts = new Map<number, number>()
  let total = 0
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      if (d[i + 3] < 200) continue
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
      total++
    }
  }
  if (!total) return []
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const groups: { rgb: [number, number, number]; n: number }[] = []
  for (const [key, n] of sorted) {
    const rgb: [number, number, number] = [(key >> 16) & 255, (key >> 8) & 255, key & 255]
    const g = groups.find(
      (g) => Math.abs(g.rgb[0] - rgb[0]) <= merge && Math.abs(g.rgb[1] - rgb[1]) <= merge &&
        Math.abs(g.rgb[2] - rgb[2]) <= merge,
    )
    if (g) g.n += n
    else groups.push({ rgb, n })
  }
  return groups
    .filter((g) => g.n / total >= minShare)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((g) => ({
      hex: '#' + g.rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase(),
      rgba: [g.rgb[0], g.rgb[1], g.rgb[2], 255] as RGBA,
      share: g.n / total,
    }))
}

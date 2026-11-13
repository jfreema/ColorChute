/** An RGBA color with 0–255 channels */
export type RGBA = [number, number, number, number]

export function hexToRgba(hex: string): RGBA {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0, 0, 0, 255]
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

export function rgbaToHex([r, g, b]: RGBA | number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function isHex(s: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim())
}

export function normalizeHex(s: string): string {
  return rgbaToHex(hexToRgba(s))
}

/** Black or white, whichever reads better on top of the color */
export function contrastInk(hex: string): string {
  const [r, g, b] = hexToRgba(hex)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#171F3D' : '#FFFFFF'
}

/** Largest per-channel difference between two colors, alpha included */
export function colorDistance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), Math.abs(a[3] - b[3]))
}

function toLab(hex: string): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgba(hex).slice(0, 3).map(lin)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** How different two colors look (CIE76 ΔE): about 2 is just noticeable, 10 or more is clearly another color */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a), [l2, a2, b2] = toLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

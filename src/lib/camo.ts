/**
 * Sport-Tek's Digi Camo shirts are a base color with a darker digital camo printed over about half of it. This draws
 * a look-alike: small square cells in clumps that run a little up and down, made from tileable noise with a fixed
 * seed, so every preview and mockup shows the same pattern. It is a stand-in for the real print, not a copy of it.
 *
 * The tile is CAMO_CELLS cells square. Each cell is CAMO_CELL shirt units, about 0.05 in, the size of the squares in
 * Ninja's ST460 photos at the shirt drawings' scale.
 */

export const CAMO_CELLS = 160
export const CAMO_CELL = 1.75
/** The tile's size in shirt units */
export const CAMO_TILE = CAMO_CELLS * CAMO_CELL
/** The share of cells in the darker color, as in Ninja's photos */
const COVER = 0.47

/** Small seeded random numbers (mulberry32), so the pattern is the same every time */
function random(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Value noise that wraps at the tile's edges, with lattice points every `sx` cells across and `sy` down */
function noise(rand: () => number, sx: number, sy: number, out: Float32Array, weight: number) {
  const gx = CAMO_CELLS / sx, gy = CAMO_CELLS / sy
  const lattice = Array.from({ length: gx * gy }, rand)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < CAMO_CELLS; y++) {
    const y0 = Math.floor(y / sy), y1 = (y0 + 1) % gy, ty = smooth(y / sy - y0)
    for (let x = 0; x < CAMO_CELLS; x++) {
      const x0 = Math.floor(x / sx), x1 = (x0 + 1) % gx, tx = smooth(x / sx - x0)
      const a = lattice[y0 * gx + x0] + (lattice[y0 * gx + x1] - lattice[y0 * gx + x0]) * tx
      const b = lattice[y1 * gx + x0] + (lattice[y1 * gx + x1] - lattice[y1 * gx + x0]) * tx
      out[y * CAMO_CELLS + x] += weight * (a + (b - a) * ty)
    }
  }
}

/** Which cells are the darker color, row by row */
export function camoCells(): Uint8Array {
  const rand = random(7)
  const v = new Float32Array(CAMO_CELLS * CAMO_CELLS)
  noise(rand, 4, 8, v, 0.4)
  noise(rand, 2, 4, v, 0.35)
  noise(rand, 2, 2, v, 0.15)
  for (let i = 0; i < v.length; i++) v[i] += 0.2 * rand()
  const threshold = Float32Array.from(v).sort()[Math.floor(v.length * (1 - COVER))]
  return Uint8Array.from(v, (n) => (n > threshold ? 1 : 0))
}

let path: string | undefined

/** The darker cells as one SVG path in cell units, each row's runs as rectangles */
export function camoPath(): string {
  if (path) return path
  const cells = camoCells()
  const parts: string[] = []
  for (let y = 0; y < CAMO_CELLS; y++) {
    for (let x = 0; x < CAMO_CELLS; x++) {
      if (!cells[y * CAMO_CELLS + x]) continue
      let end = x
      while (end + 1 < CAMO_CELLS && cells[y * CAMO_CELLS + end + 1]) end++
      parts.push(`M${x} ${y}h${end - x + 1}v1h${-(end - x + 1)}z`)
      x = end
    }
  }
  return (path = parts.join(''))
}

const cellsSvg = (base: string, tone: string) =>
  `<rect width="${CAMO_CELLS}" height="${CAMO_CELLS}" fill="${base}"/><path d="${camoPath()}" fill="${tone}"/>`

/** One tile as a standalone SVG, `size` pixels square, for CSS backgrounds and canvas patterns */
export function camoTileSvg(base: string, tone: string, size: number = CAMO_CELLS): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAMO_CELLS} ${CAMO_CELLS}" width="${size}" ` +
    `height="${size}" shape-rendering="crispEdges">${cellsSvg(base, tone)}</svg>`
}

/** One tile as a data URL */
export const camoTileUrl = (base: string, tone: string, size?: number) =>
  'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(camoTileSvg(base, tone, size))

/** An SVG <pattern> in shirt units, to fill a shirt drawing with `fill="url(#id)"` */
export function camoPatternDef(id: string, base: string, tone: string): string {
  return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${CAMO_TILE}" height="${CAMO_TILE}">` +
    `<g transform="scale(${CAMO_CELL})" shape-rendering="crispEdges">${cellsSvg(base, tone)}</g></pattern>`
}

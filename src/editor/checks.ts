import { EPIC_MATCH, nearestEpicColor } from '../lib/palettes'
import { EPIC } from '../lib/printSpecs'
import { ctx2d, makeCanvas, readPixels } from './doc'
import { ColorCount, dominantColors, Pixels } from './pixels'

export type CheckStatus = 'pass' | 'warn' | 'block'

export interface Check {
  label: string
  status: CheckStatus
  detail: string
}

/** The design's inks: solid colors covering at least 0.5% of the art, so antialiased edges don't count */
export function inkColors(px: Pixels): ColorCount[] {
  return dominantColors(px, 12, 24, EPIC.inkMinShare)
}

/** The inks in flattened art, from a copy shrunk without smoothing so no in-between colors appear */
export function designInks(src: HTMLCanvasElement): ColorCount[] {
  const k = Math.min(1, 500 / Math.max(src.width, src.height))
  const c = makeCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)))
  const g = ctx2d(c)
  g.imageSmoothingEnabled = false
  g.drawImage(src, 0, 0, c.width, c.height)
  const inks = inkColors(readPixels(c))
  c.width = 0
  return inks
}

interface ArtStats {
  /** Share of the image's outermost pixels that are solid. Near 1 means a box behind the art. */
  solidBorder: number
  /** Semi-transparent pixels surrounded by art, as a share of the art */
  innerPartial: number
  opaque: number
}

function artStats(px: Pixels): ArtStats {
  const { width: w, height: h, data: d } = px
  let opaque = 0, inner = 0, border = 0, solidBorder = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = d[(y * w + x) * 4 + 3]
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1
      if (edge) {
        border++
        if (a >= 250) solidBorder++
      }
      if (!a) continue
      opaque++
      if (a >= 250 || edge) continue
      const i = (y * w + x) * 4
      if (d[i - 4 + 3] && d[i + 4 + 3] && d[i - w * 4 + 3] && d[i + w * 4 + 3]) inner++
    }
  }
  return { solidBorder: border ? solidBorder / border : 0, innerPartial: opaque ? inner / opaque : 0, opaque }
}

/** Epic Sports' pre-export checks from the Shirt Image Spec */
export function shirtChecks(px: Pixels, dpi: number): Check[] {
  const { width: w, height: h } = px
  const long = Math.max(w, h)
  const inches = (n: number) => `${(n / 300).toFixed(2).replace(/\.?0+$/, '')} in`
  const stats = artStats(px)
  const inks = inkColors(px)
  const checks: Check[] = []
  checks.push(
    w > EPIC.maxSide || h > EPIC.maxSide
      ? { label: 'Size', status: 'block', detail: `${w} × ${h} px is over Epic's ${EPIC.maxSide} px (11 in) limit` }
      : { label: 'Size', status: 'pass', detail: `${w} × ${h} px, ${inches(w)} × ${inches(h)} at 300 DPI` },
  )
  checks.push(
    long < EPIC.minLongSide
      ? { label: 'Long side', status: 'block', detail: `${long} px is under Epic's ${EPIC.minLongSide} px minimum` }
      : long < EPIC.goodLongSide
        ? { label: 'Long side', status: 'warn', detail: `${long} px; ${EPIC.goodLongSide} px or more prints better` }
        : { label: 'Long side', status: 'pass', detail: `${long} px` },
  )
  checks.push(
    dpi === 300
      ? { label: 'DPI tag', status: 'pass', detail: '300 DPI written into the PNG' }
      : { label: 'DPI tag', status: 'warn', detail: `${dpi} DPI; Epic sizes art at 300 DPI` },
  )
  checks.push(
    !stats.opaque
      ? { label: 'Background', status: 'block', detail: 'The design is empty' }
      : stats.solidBorder > 0.9
        ? { label: 'Background', status: 'warn', detail: 'Solid all the way to the edges. Is there a background box to remove?' }
        : { label: 'Background', status: 'pass', detail: 'Transparent around the art' },
  )
  checks.push(
    inks.length <= EPIC.maxInks
      ? { label: 'Inks', status: 'pass', detail: `${inks.length} solid color${inks.length === 1 ? '' : 's'}` }
      : inks.length === EPIC.maxInks + 1
        ? { label: 'Inks', status: 'warn', detail: `${inks.length} colors; the spec is ${EPIC.maxInks} or fewer` }
        : { label: 'Inks', status: 'block', detail: `${inks.length} colors, or a gradient; the spec is ${EPIC.maxInks}` },
  )
  const off = inks
    .map((k) => ({ hex: k.hex, near: nearestEpicColor(k.hex) }))
    .filter((k) => k.near.distance >= EPIC_MATCH)
  if (inks.length && inks.length <= EPIC.maxInks + 1) {
    checks.push(
      off.length
        ? {
            label: 'Epic colors', status: 'warn',
            detail: off.map((k) => `${k.hex} isn't on Epic's wheel (closest: ${k.near.swatch.name})`).join('; '),
          }
        : { label: 'Epic colors', status: 'pass', detail: "Every ink is on Epic's color wheel" },
    )
  }
  checks.push(
    stats.innerPartial > 0.005
      ? { label: 'See-through areas', status: 'warn', detail: 'Semi-transparent pixels inside the art, not just edges' }
      : { label: 'See-through areas', status: 'pass', detail: 'Edges only' },
  )
  return checks
}

/** Checks for the screen logos: transparent, and under the file size limit */
export function screenChecks(px: Pixels, bytes: number, maxBytes: number): Check[] {
  const stats = artStats(px)
  const kb = Math.round(bytes / 1024)
  return [
    { label: 'Size', status: 'pass', detail: `${px.width} × ${px.height} px` },
    bytes > maxBytes
      ? { label: 'File size', status: 'warn', detail: `${kb} KB; keep it under ${Math.round(maxBytes / 1024)} KB` }
      : { label: 'File size', status: 'pass', detail: `${kb} KB` },
    !stats.opaque
      ? { label: 'Background', status: 'block', detail: 'The design is empty' }
      : stats.solidBorder > 0.9
        ? { label: 'Background', status: 'warn', detail: 'Solid all the way to the edges. Is there a background box to remove?' }
        : { label: 'Background', status: 'pass', detail: 'Transparent around the art' },
  ]
}

export function worst(checks: Check[]): CheckStatus {
  return checks.some((c) => c.status === 'block') ? 'block' : checks.some((c) => c.status === 'warn') ? 'warn' : 'pass'
}

/** The order note from the Shirt Image Spec, filled in */
export function orderNote(w: number, h: number, inks: { name?: string; hex: string }[]): string {
  const inch = (n: number) => (n / 300).toFixed(2).replace(/\.?0+$/, '')
  return (
    `Artwork: transparent PNG, ${w} x ${h} px at 300 DPI (${inch(w)} x ${inch(h)} in). ` +
    `Please print centered on the chest at that size.\n\n` +
    `Colors, please keep as submitted:\n` +
    inks.map((c, i) => `- ${c.name ?? `Ink ${i + 1}`}: ${c.hex}`).join('\n') +
    `\n\nIf any color or detail needs to change for this garment, please send a proof before production. Thank you!\n`
  )
}

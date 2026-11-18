/**
 * The rules for a person's Custom print colors, shared by the app and the Worker that saves them. Plain code only:
 * the Worker typechecks this file without the browser's types.
 */

/** A color in someone's Custom group (the same shape as a palette Swatch) */
export interface CustomColor {
  name: string
  hex: string
}

/** Plenty for a personal palette, and keeps a saved list a few KB */
export const MAX_CUSTOM_COLORS = 120
const MAX_NAME = 40
export const UNNAMED_CUSTOM = 'Custom color'

/**
 * A saved Custom list made safe: #RRGGBB colors in capitals, short names, no color twice, at most MAX_CUSTOM_COLORS.
 * Null when it isn't a list at all.
 */
export function cleanCustomColors(input: unknown): CustomColor[] | null {
  if (!Array.isArray(input)) return null
  const out: CustomColor[] = []
  const seen = new Set<string>()
  for (const item of input) {
    if (out.length >= MAX_CUSTOM_COLORS) break
    if (!item || typeof item !== 'object') continue
    const { name, hex } = item as Record<string, unknown>
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) continue
    const h = hex.toUpperCase()
    if (seen.has(h)) continue
    seen.add(h)
    const n = typeof name === 'string' ? name.trim().slice(0, MAX_NAME) : ''
    out.push({ name: n || UNNAMED_CUSTOM, hex: h })
  }
  return out
}

/**
 * A saved list brought up to date with starter batches added since it was saved: `seen` is how many batches the list
 * had seen. New colors go on the end, skipping any already there; colors someone removed from older batches stay out.
 */
export function addNewStarters(list: CustomColor[], seen: number, batches: CustomColor[][]): CustomColor[] {
  const out = [...list]
  const have = new Set(list.map((c) => c.hex.toUpperCase()))
  for (const c of batches.slice(Math.max(0, seen)).flat()) {
    if (out.length >= MAX_CUSTOM_COLORS) break
    if (have.has(c.hex.toUpperCase())) continue
    have.add(c.hex.toUpperCase())
    out.push(c)
  }
  return out
}

/** How many starter batches a saved list has seen. Lists saved before batches were counted saw the first one. */
export function cleanSeen(input: unknown): number {
  return typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 1000 ? input : 1
}

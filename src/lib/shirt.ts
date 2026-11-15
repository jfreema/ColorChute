/**
 * The t-shirt drawings for the preview and the mockup export, as SVG strings in a 1000 × 1100 box. The same strings
 * go into <img> tags on screen and onto a canvas for the mockup, so both look the same.
 */
import { camoPatternDef } from './camo'
import { hexToRgba } from './color'

export const SHIRT_W = 1000
export const SHIRT_H = 1100
/**
 * The mockups show an adult medium as it looks worn. Gildan's 5000 in M is 20 in across laid flat, but near the
 * armpits the sides wrap around the body, so only about 16 in of the chest faces forward. Both shirt drawings are
 * about 540 units across just below the armpits, so that is the 16 in. Photos of real Epic prints show 11 in art
 * covering about two thirds of the visible chest, and this matches them.
 */
const CHEST_UNITS = 540
const VISIBLE_CHEST_IN = 16
/** Viewbox units per printed inch */
export const UNITS_PER_INCH = CHEST_UNITS / VISIBLE_CHEST_IN
/** Bottom of the front collar on both drawings */
const COLLAR_BOTTOM = 150
/** Prints start 3 in below the collar */
export const PRINT_TOP = COLLAR_BOTTOM + 3 * UNITS_PER_INCH
export const PRINT_CENTER_X = 500
/** Epic's 11 in max, for fitting */
export const PRINT_MAX = 11 * UNITS_PER_INCH

const BODY =
  'M375 70 C420 160 580 160 625 70 L790 118 C842 138 882 190 906 250 L975 420 L816 476 L772 362 ' +
  'C764 600 770 850 782 1040 C600 1062 400 1062 218 1040 C230 850 236 600 228 362 L184 476 L25 420 ' +
  'L94 250 C118 190 158 138 210 118 Z'
const INSIDE_NECK = 'M375 70 Q500 30 625 70 C580 160 420 160 375 70 Z'
const COLLAR = 'M372 68 C420 168 580 168 628 68'
const SLEEVE_HEMS = 'M42 386 L196 444 M958 386 L804 444'
const HEM = 'M222 1006 C400 1028 600 1028 778 1006'

function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgba(hex)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)))
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

const svg = (body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIRT_W} ${SHIRT_H}" width="${SHIRT_W}" height="${SHIRT_H}">` +
  `<defs>${defs}</defs>${body}</svg>`

/** A flat shirt with thick ink outlines, in the app's own style. `camo` prints the digital camo over it in that color. */
export function basicShirt(color: string, camo?: string): string {
  const ink = '#171F3D'
  return svg(
    `<path d="${BODY}" fill="${camo ? 'url(#camo)' : color}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="${INSIDE_NECK}" fill="${shade(color, -0.22)}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="${COLLAR}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="${SLEEVE_HEMS} ${HEM}" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="4" ` +
      `stroke-dasharray="10 9" stroke-linecap="round"/>`,
    camo ? camoPatternDef('camo', color, camo) : '',
  )
}

/**
 * The realistic shirt: a studio photo of a blank crew-neck tee on a gray backdrop, made from Jared's reference mockup
 * with the print and neck label taken out. It comes as three images in public/shirt, all the same frame:
 * - studio.jpg, the backdrop with no shirt
 * - shade.webp, the fabric's light and shadow as gray (multiply), with the shirt's outline in its alpha
 * - light.webp, the sheen on the folds (screen), which dark shirts need to show any folds at all
 * The shirt itself is the chosen color, cut out with shade.webp's alpha. `rect` places the frame in shirt units.
 */
export const STUDIO = {
  rect: { x: -124.3, y: 9.3, w: 1249.8, h: 1132.5 },
  backdrop: `${import.meta.env.BASE_URL}shirt/studio.jpg`,
  shade: `${import.meta.env.BASE_URL}shirt/shade.webp`,
  light: `${import.meta.env.BASE_URL}shirt/light.webp`,
}

/** How strongly the sheen shows: a little on light shirts, a lot on dark ones */
export function studioLightOpacity(hex: string): number {
  const [r, g, b] = hexToRgba(hex)
  return 0.18 + 0.42 * (1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255)
}

export const svgUrl = (s: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not draw the shirt'))
    img.src = src
  })
}

export const loadSvg = (s: string) => loadImage(svgUrl(s))

/** Viewbox units per document pixel, for placing the art on the shirt */
export function printScale(docW: number, docH: number, dpi: number, mode: 'fit' | 'actual'): number {
  if (mode === 'actual' && dpi >= 100) return UNITS_PER_INCH / dpi
  return Math.min(PRINT_MAX / docW, PRINT_MAX / docH)
}

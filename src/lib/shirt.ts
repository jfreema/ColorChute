/**
 * The garment drawings for the preview and the mockup export, as SVG strings in a 1000 × 1100 box. The same strings
 * go into <img> tags on screen and onto a canvas for the mockup, so both look the same.
 */
import { camoPatternDef } from './camo'
import { hexToRgba } from './color'

export const SHIRT_W = 1000
export const SHIRT_H = 1100
/**
 * The mockups show an adult medium as it looks worn. Gildan's 5000 in M is 20 in across laid flat, but near the
 * armpits the sides wrap around the body, so only about 16 in of the chest faces forward. The tee drawing is about
 * 540 units across just below the armpits, so that is the 16 in. Photos of real Epic prints show 11 in art covering
 * about two thirds of the visible chest, and this matches them. The sweatshirts are cut a little wider (about 556
 * units), as Gildan's are, at the same scale.
 */
const CHEST_UNITS = 540
const VISIBLE_CHEST_IN = 16
/** Viewbox units per printed inch */
export const UNITS_PER_INCH = CHEST_UNITS / VISIBLE_CHEST_IN

/** What a mockup draws. Shirt color groups pick it (`ShirtCollection.garment`); a t-shirt when there's none. */
export type Garment = 'tee' | 'hoodie' | 'crew'
export const GARMENTS: Garment[] = ['tee', 'hoodie', 'crew']
export const GARMENT_LABEL: Record<Garment, string> = { tee: 'T-shirt', hoodie: 'Hoodie', crew: 'Crewneck' }

/**
 * Where the neckline ends at the center front: the tee's collar, the crewneck's rib collar, the hoodie's V where the
 * hood crosses. Prints start 3 in below it.
 */
const NECK_BOTTOM: Record<Garment, number> = { tee: 150, crew: 170, hoodie: 264 }
export const printTop = (garment: Garment = 'tee') => NECK_BOTTOM[garment] + 3 * UNITS_PER_INCH
/** The tee's print top */
export const PRINT_TOP = printTop('tee')
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

/** The sweatshirts share one body: long sleeves with rib cuffs, a rib waistband, set-in sleeves */
const SWEAT_BODY =
  'M380 74 C330 82 250 96 196 114 C146 132 110 236 100 400 C92 560 86 720 82 872 L86 992 C120 1000 162 1000 ' +
  '198 992 L196 872 C202 720 210 560 222 410 C226 600 228 800 232 952 L238 1046 C330 1056 420 1060 500 1060 ' +
  'C580 1060 670 1056 762 1046 L768 952 C772 800 774 600 778 410 C790 560 798 720 804 872 L802 992 C838 1000 ' +
  '880 1000 914 992 L918 872 C914 720 908 560 900 400 C890 236 854 132 804 114 C750 96 670 82 620 74 C575 150 ' +
  '425 150 380 74Z'
/** Rib seams: the cuffs and the waistband */
const SWEAT_RIBS = 'M83 872 L196 872 M804 872 L917 872 M232 952 C420 968 580 968 768 952'
/** Set-in sleeve seams, from the shoulder to the armpit */
const SWEAT_ARMHOLES = 'M196 114 C224 210 230 320 222 410 M804 114 C776 210 770 320 778 410'
/** The crewneck's rib collar: the back of the neck inside, and the band's lower edge */
const CREW_INSIDE_NECK = 'M380 74 Q500 34 620 74 C575 150 425 150 380 74 Z'
const CREW_COLLAR = 'M360 78 C410 200 590 200 640 78'
/** The hoodie's hood lying around the neck, the inside of it, its drawstrings and the pouch pocket */
const HOOD =
  'M292 172 C276 70 370 4 500 4 C630 4 724 70 708 172 C650 205 565 240 500 264 C435 240 350 205 292 172 Z'
const HOOD_INSIDE =
  'M500 238 C442 206 374 152 372 108 C370 64 430 44 500 44 C570 44 630 64 628 108 C626 152 558 206 500 238 Z'
const DRAWSTRINGS = 'M448 226 C446 292 442 360 440 428 M552 226 C554 292 558 360 560 428'
const AGLETS = 'M440 428 L439 462 M560 428 L561 462'
const POCKET = 'M358 690 L642 690 C662 770 688 860 698 950 L302 950 C312 860 338 770 358 690 Z'
const POCKET_OPENINGS = 'M358 690 C338 770 312 860 302 950 M642 690 C662 770 688 860 698 950'

/**
 * A flat garment with thick ink outlines, in the app's own style: a t-shirt, a hoodie or a crewneck sweatshirt.
 * `camo` prints the digital camo over it in that color.
 */
export function basicShirt(color: string, camo?: string, garment: Garment = 'tee'): string {
  const ink = '#171F3D'
  const fill = camo ? 'url(#camo)' : color
  const line = (d: string, w = 7) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  const shape = (d: string, f: string, w = 7) =>
    `<path d="${d}" fill="${f}" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round"/>`
  const stitches = (d: string) =>
    `<path d="${d}" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="4" stroke-dasharray="10 9" ` +
    `stroke-linecap="round"/>`
  const defs = camo ? camoPatternDef('camo', color, camo) : ''
  if (garment === 'tee') {
    return svg(
      shape(BODY, fill) + shape(INSIDE_NECK, shade(color, -0.22)) + line(COLLAR) + stitches(`${SLEEVE_HEMS} ${HEM}`),
      defs,
    )
  }
  const body = shape(SWEAT_BODY, fill) + line(SWEAT_RIBS, 5) + stitches(SWEAT_ARMHOLES)
  if (garment === 'crew') return svg(body + shape(CREW_INSIDE_NECK, shade(color, -0.22)) + line(CREW_COLLAR), defs)
  return svg(
    body + line(POCKET_OPENINGS, 6) + stitches(POCKET) +
      shape(HOOD, fill) + shape(HOOD_INSIDE, shade(color, -0.3)) +
      `<path d="${DRAWSTRINGS}" fill="none" stroke="${ink}" stroke-width="13" stroke-linecap="round"/>` +
      `<path d="${DRAWSTRINGS}" fill="none" stroke="${shade(color, -0.1)}" stroke-width="5" stroke-linecap="round"/>` +
      line(AGLETS, 11),
    defs,
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

/** The realistic photo for a garment; only the tee has one so far, and the others show their drawing instead */
export const studioFor = (garment: Garment = 'tee') => (garment === 'tee' ? STUDIO : null)

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

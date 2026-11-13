/**
 * The t-shirt drawings for the preview and the mockup export, as SVG strings in a 1000 × 1100 box. The same strings
 * go into <img> tags on screen and onto a canvas for the mockup, so both look the same.
 */
import { hexToRgba } from './color'

export const SHIRT_W = 1000
export const SHIRT_H = 1100
/** Viewbox units per printed inch, for an adult large about 21.5 in across the chest */
export const UNITS_PER_INCH = 25
export const PRINT_TOP = 225
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

function isLight(hex: string) {
  const [r, g, b] = hexToRgba(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}

const svg = (body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHIRT_W} ${SHIRT_H}" width="${SHIRT_W}" height="${SHIRT_H}">` +
  `<defs>${defs}</defs>${body}</svg>`

/** A flat shirt with thick ink outlines, in the app's own style */
export function basicShirt(color: string): string {
  const ink = '#171F3D'
  return svg(
    `<path d="${BODY}" fill="${color}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="${INSIDE_NECK}" fill="${shade(color, -0.22)}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>` +
      `<path d="${COLLAR}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="${SLEEVE_HEMS} ${HEM}" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="4" ` +
      `stroke-dasharray="10 9" stroke-linecap="round"/>`,
  )
}

/** The fabric under the print: color, inside of the neck and ribbed collar */
export function realisticShirtBase(color: string): string {
  const defs =
    `<linearGradient id="collar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(color, -0.08)}"/>` +
    `<stop offset="1" stop-color="${shade(color, -0.16)}"/></linearGradient>`
  return svg(
    `<path d="${BODY}" fill="${color}"/>` +
      `<path d="${INSIDE_NECK}" fill="${shade(color, -0.35)}"/>` +
      `<path d="${COLLAR}" fill="none" stroke="url(#collar)" stroke-width="24" stroke-linecap="round"/>` +
      `<path d="${COLLAR}" fill="none" stroke="${shade(color, -0.3)}" stroke-width="2" stroke-opacity="0.6" ` +
      `transform="translate(0 12)"/>` +
      `<path d="${SLEEVE_HEMS} ${HEM}" fill="none" stroke="${shade(color, -0.3)}" stroke-width="3" ` +
      `stroke-dasharray="6 5" stroke-opacity="0.7"/>`,
    defs,
  )
}

/** Shadows to multiply over the fabric and the print: folds, sides, sleeves and weave */
export function realisticShirtShadows(color: string): string {
  const dark = isLight(color) ? 0.16 : 0.5
  const defs =
    `<clipPath id="c"><path d="${BODY}"/></clipPath>` +
    `<filter id="b8" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>` +
    `<filter id="b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>` +
    `<filter id="weave"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>` +
    `<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.05"/></filter>` +
    `<linearGradient id="sides" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0.2" stop-color="#000" stop-opacity="${dark * 0.9}"/>` +
    `<stop offset="0.34" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.66" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.8" stop-color="#000" stop-opacity="${dark * 0.9}"/></linearGradient>` +
    `<linearGradient id="down" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0.6" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="${dark * 0.5}"/></linearGradient>`
  const folds = [
    // Armpit folds sweeping toward the middle
    'M236 372 C292 420 322 462 336 520', 'M764 372 C708 420 678 462 664 520',
    // Sleeve creases
    'M128 300 C150 340 166 384 172 446', 'M872 300 C850 340 834 384 828 446',
  ]
  return svg(
    `<g clip-path="url(#c)">` +
      `<rect width="1000" height="1100" fill="url(#sides)" filter="url(#b8)"/>` +
      `<rect width="1000" height="1100" fill="url(#down)"/>` +
      `<path d="M228 362 L184 476 L25 420 L94 250 C118 190 158 138 210 118 Z" fill="#000" ` +
      `fill-opacity="${dark * 0.35}" filter="url(#b20)"/>` +
      `<path d="M772 362 L816 476 L975 420 L906 250 C882 190 842 138 790 118 Z" fill="#000" ` +
      `fill-opacity="${dark * 0.35}" filter="url(#b20)"/>` +
      folds.map((d) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${dark * 0.4}" ` +
        `stroke-width="22" stroke-linecap="round" filter="url(#b20)"/>`).join('') +
      `<path d="M228 362 C236 600 230 850 218 1040" fill="none" stroke="#000" stroke-opacity="${dark}" ` +
      `stroke-width="30" filter="url(#b8)"/>` +
      `<path d="M772 362 C764 600 770 850 782 1040" fill="none" stroke="#000" stroke-opacity="${dark}" ` +
      `stroke-width="30" filter="url(#b8)"/>` +
      `<rect width="1000" height="1100" filter="url(#weave)" opacity="${isLight(color) ? 0.07 : 0.14}"/>` +
      `</g>`,
    defs,
  )
}

/** Highlights to screen over everything, where the fabric catches the light */
export function realisticShirtHighlights(color: string): string {
  const lift = isLight(color) ? 0.18 : 0.09
  const defs =
    `<clipPath id="c"><path d="${BODY}"/></clipPath>` +
    `<filter id="b14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>`
  const ridges = [
    'M262 410 C306 446 344 492 364 552', 'M738 410 C694 446 656 492 636 552',
    'M420 300 C470 330 530 330 580 300',
  ]
  return svg(
    `<g clip-path="url(#c)">` +
      ridges.map((d) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${lift}" stroke-width="34" ` +
        `stroke-linecap="round" filter="url(#b14)"/>`).join('') +
      `</g>`,
    defs,
  )
}

export const svgUrl = (s: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s)

export function loadSvg(s: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not draw the shirt'))
    img.src = svgUrl(s)
  })
}

/** Viewbox units per document pixel, for placing the art on the shirt */
export function printScale(docW: number, docH: number, dpi: number, mode: 'fit' | 'actual'): number {
  if (mode === 'actual' && dpi >= 100) return UNITS_PER_INCH / dpi
  return Math.min(PRINT_MAX / docW, PRINT_MAX / docH)
}

import { normalizeHex } from '../lib/color'
import { GARMENTS, type Garment } from '../lib/shirt'
import type { Rect } from './pixels'
import type { PreviewMode, PreviewSettings } from './store'

/**
 * Links to one design. A share link (/s/<token>) opens a design its owner shared, public or not, until they turn the
 * link off. A public link (/p/<id>) opens a public design for as long as it's public. Either can carry how the sender
 * was looking at it: the color option, the background and its colors, and the part of the scene on screen, so it
 * opens the same way on any screen size.
 */
export interface DesignLink {
  kind: 's' | 'p'
  id: string
  option?: string
  preview: Partial<PreviewSettings>
  /** The part of the scene to fill the screen with, in document pixels. Missing means fit the whole scene. */
  frame?: Rect
}

const ID = /^[A-Za-z0-9_-]{1,64}$/
const HEX = /^[0-9a-fA-F]{6}$/
const MODES: PreviewMode[] = ['square', 'shirt', 'realistic']

const hex = (c: string) => normalizeHex(c).slice(1).toLowerCase()

/** Reads a design link from a page address, or null when the address isn't one */
export function parseLink(href: string): DesignLink | null {
  const url = new URL(href)
  const m = url.pathname.match(/^\/(s|p)\/([^/]+)\/?$/)
  if (!m || !ID.test(m[2])) return null
  const q = url.searchParams
  const link: DesignLink = { kind: m[1] as 's' | 'p', id: m[2], preview: {} }
  const option = q.get('option')
  if (option && ID.test(option)) link.option = option

  const color = (name: string) => {
    const v = q.get(name)
    return v && HEX.test(v) ? `#${v.toUpperCase()}` : undefined
  }
  const mode = q.get('bg') as PreviewMode | null
  if (mode && MODES.includes(mode)) {
    link.preview.mode = mode
    // The print size only matters on a shirt, and is always sent with one
    if (mode !== 'square') link.preview.sizeMode = q.get('print') === 'fill' ? 'fit' : 'actual'
  }
  const shirt = color('shirt')
  if (shirt) link.preview.shirtColor = shirt
  // A shirt link always says what it was on, so a hoodie someone has open doesn't stay on a t-shirt link
  const garment = q.get('garment') as Garment | null
  if (link.preview.mode && link.preview.mode !== 'square') link.preview.garment = garment && GARMENTS.includes(garment) ? garment : 'tee'
  const square = q.get('square') === 'clear' ? 'transparent' : color('square')
  if (square) link.preview.boardColor = square
  const behind = color('behind')
  if (behind) link.preview.stageColor = behind

  const view = (q.get('view') ?? '').split(',').map(Number)
  if (view.length === 4 && view.every(Number.isFinite) && view[2] > 0 && view[3] > 0) {
    link.frame = { x: view[0], y: view[1], w: view[2], h: view[3] }
  }
  return link
}

/** A link to a design, opening the way it's shown now */
export function buildLink(origin: string, kind: 's' | 'p', id: string, opts: {
  option?: string | null
  preview: PreviewSettings
  frame?: Rect | null
}): string {
  const p = opts.preview
  const q: [string, string][] = []
  if (opts.option) q.push(['option', opts.option])
  q.push(['bg', p.mode])
  if (p.mode === 'square') q.push(['square', p.boardColor === 'transparent' ? 'clear' : hex(p.boardColor)])
  else {
    q.push(['shirt', hex(p.shirtColor)])
    if (p.garment && p.garment !== 'tee') q.push(['garment', p.garment])
    if (p.sizeMode === 'fit') q.push(['print', 'fill'])
  }
  q.push(['behind', hex(p.stageColor)])
  const f = opts.frame
  // Commas read better than %2C and are fine in a query
  if (f) q.push(['view', [f.x, f.y, f.w, f.h].map((n) => Math.round(n)).join(',')])
  return `${origin}/${kind}/${id}?${q.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ',')}`).join('&')}`
}

/** True while the page address is a design link */
export const onLinkPage = () => /^\/(s|p)\//.test(location.pathname)

/** Puts the address back to the plain app, once the person moves on from the linked design */
export function leaveLink() {
  if (typeof location !== 'undefined' && onLinkPage()) history.replaceState(null, '', '/')
}

/**
 * What the stage shows right now, kept up to date by the stage for the share dialog: the part of the scene on
 * screen in document pixels, or null when it shows the whole scene fitted
 */
export const stageView: { frame: Rect | null } = { frame: null }

import { api } from '../lib/api'
import { idb } from '../lib/idb'
import { getAccount, markSamplesSeeded } from './account'
import { ctx2d, makeCanvas } from './doc'
import { ColorOption, Design, refreshLibrary, renderOption, thumbnailOf, toBlob } from './designs'
import { SHIRT_CANVAS } from '../lib/printSpecs'
import { cloudStore } from './storage'

/**
 * Built-in sample designs, added to everyone's library on first run. Each layer ships as a white mask
 * (opaque or clear, no soft edges) and is tinted to its ink for each color option.
 */
const SEEDED_KEY = 'colorchute.samples.v5'
/**
 * Set by earlier versions: v1 used inks that aren't on Epic's wheel, v2 had a plain cannon instead of a bat, v3 had a
 * deeper drop shadow under BASEBALL, v4 had a canvas only as tall as the art
 */
const OLDER_KEYS = ['colorchute.samples.v1', 'colorchute.samples.v2', 'colorchute.samples.v3', 'colorchute.samples.v4']

/** Set once the text-only Battle Baseball has been added. v1 had a canvas only as tall as the art. */
const TEXT_KEY = 'colorchute.samples.text.v2'
const OLDER_TEXT_KEY = 'colorchute.samples.text.v1'

/** Set per account once its samples in the cloud are on the 11 × 11 in canvas */
const cloudCanvasKey = (userId: string) => `colorchute.samples.canvas11.${userId}`

type Ink = 'outline' | 'battle' | 'tank' | 'baseball'

interface Sample {
  id: string
  name: string
  dir: string
  /** The canvas, 11 × 11 in like every shirt design */
  width: number
  height: number
  dpi: number
  /** The masks' height. They sit at the top of the canvas, which is the top of the shirt's print area. */
  artHeight: number
  /** Bottom to top */
  layers: { id: string; name: string; ink: Ink }[]
  options: { id: string; name: string; shirt: string; inks: Partial<Record<Ink, string>> }[]
}

const BATTLE_BASEBALL: Sample = {
  id: 'sample-battle-baseball',
  name: 'Battle Baseball',
  dir: `${import.meta.env.BASE_URL}samples/battle-baseball/`,
  ...SHIRT_CANVAS,
  // 11 × 8.41 in of art at 300 DPI, Epic's widest chest print
  artHeight: 2524,
  layers: [
    { id: 'bb-outline', name: 'Outline', ink: 'outline' },
    { id: 'bb-baseball', name: 'BASEBALL', ink: 'baseball' },
    { id: 'bb-tank', name: 'Tank', ink: 'tank' },
    { id: 'bb-battle', name: 'BATTLE', ink: 'battle' },
  ],
  // Inks are Epic print colors; shirts are blanks Epic sells
  options: [
    {
      id: 'bb-red', name: 'Red & linen', shirt: '#B9B6A7', // Epic cool tee Silver
      inks: { outline: '#000000', battle: '#AF0011', tank: '#E6DABF', baseball: '#E6DABF' }, // Black, Red, Linen
    },
    {
      id: 'bb-royal', name: 'Royal blue', shirt: '#145DAA', // Epic cool tee Royal
      inks: { outline: '#000000', battle: '#FFFFFF', tank: '#FFFFFF', baseball: '#EC008C' }, // Black, White, Neon Pink
    },
    {
      id: 'bb-green', name: 'Military green', shirt: '#3E3F1F', // A4 Military Green
      inks: { outline: '#000000', battle: '#FA4616', tank: '#F8E08E', baseball: '#F8E08E' }, // Black, Orange, Butter
    },
  ],
}

/** The same lettering without the tank, BASEBALL straight under BATTLE. One option; people add their own. */
const BATTLE_BASEBALL_TEXT: Sample = {
  id: 'sample-battle-baseball-text',
  name: 'Battle Baseball (text only)',
  dir: `${import.meta.env.BASE_URL}samples/battle-baseball-text/`,
  ...SHIRT_CANVAS,
  // 11 × 4.54 in of art at 300 DPI
  artHeight: 1363,
  layers: [
    { id: 'bt-outline', name: 'Outline', ink: 'outline' },
    { id: 'bt-baseball', name: 'BASEBALL', ink: 'baseball' },
    { id: 'bt-battle', name: 'BATTLE', ink: 'battle' },
  ],
  options: [
    {
      id: 'bt-red', name: 'Red & linen', shirt: '#B9B6A7', // Epic cool tee Silver
      inks: { outline: '#000000', battle: '#AF0011', baseball: '#E6DABF' }, // Black, Red, Linen
    },
  ],
}

function seeded(key = SEEDED_KEY) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markSeeded(key = SEEDED_KEY) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Without storage the sample's fixed id still stops it being added twice
  }
}

/**
 * Bump when a mask's art changes. The service worker serves files cache-first, so a new URL is the only way returning
 * visitors get the new art.
 */
const ART_VERSION = 4

async function loadMask(ink: Ink, s: Sample = BATTLE_BASEBALL): Promise<ImageBitmap> {
  const url = `${s.dir}${ink}.png?v=${ART_VERSION}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  return createImageBitmap(await res.blob())
}

/** Builds a sample's design from its masks. `now` sets its dates, which order the library (newest first). */
async function buildSample(s: Sample, now = Date.now()): Promise<Design> {
  const masks = await Promise.all(s.layers.map((l) => loadMask(l.ink, s)))
  const top = s.layers[s.layers.length - 1]
  // Two full-size canvases reused for every layer, so phones don't run out of memory
  const work = makeCanvas(s.width, s.height)
  const flat = makeCanvas(s.width, s.height)
  const w = ctx2d(work), f = ctx2d(flat)
  const options: ColorOption[] = []
  for (const o of s.options) {
    f.clearRect(0, 0, s.width, s.height)
    const layers: ColorOption['layers'] = []
    for (const [i, l] of s.layers.entries()) {
      w.clearRect(0, 0, s.width, s.height)
      w.globalCompositeOperation = 'copy'
      w.drawImage(masks[i], 0, 0)
      w.globalCompositeOperation = 'source-in'
      w.fillStyle = o.inks[l.ink] ?? '#000000'
      w.fillRect(0, 0, s.width, s.height)
      layers.push({ id: l.id, name: l.name, visible: true, opacity: 1, png: await toBlob(work) })
      f.drawImage(work, 0, 0)
    }
    options.push({
      id: o.id, name: o.name, updatedAt: now, width: s.width, height: s.height, dpi: s.dpi, activeId: top.id,
      swatches: [...new Set(s.layers.map((l) => o.inks[l.ink] ?? '#000000').reverse())],
      shirtColor: o.shirt,
      thumbnail: await thumbnailOf(flat),
      layers,
    })
  }
  for (const m of masks) m.close()
  work.width = flat.width = 0
  return { id: s.id, name: s.name, createdAt: now, updatedAt: now, options }
}

/** A fingerprint of which pixels are opaque, to tell a mask apart from one someone has drawn on */
function maskSignature(px: Uint8ClampedArray) {
  let h = 2166136261, n = 0
  for (let i = 3, p = 0; i < px.length; i += 4, p++) {
    if (px[i] > 127) {
      h = Math.imul(h ^ p, 16777619)
      n++
    }
  }
  return `${n}:${h >>> 0}`
}

/**
 * Every shipped version of the layers whose art has changed, newest first, as `maskSignature` reads them. Add the new
 * signature at the front when a mask changes again.
 */
const ART_HISTORY: Record<string, { ink: Ink; sigs: string[] }> = {
  'bb-tank': {
    ink: 'tank',
    sigs: ['814490:3218382181' /* bat cannon */, '832437:1735841766' /* plain cannon */],
  },
  'bb-outline': {
    ink: 'outline',
    sigs: [
      '2619391:185965878', // thinner shadow under BASEBALL
      '2718749:3879560660', // bat cannon
      '2723966:2971948493', // plain cannon
    ],
  },
}

/**
 * Moves a sample's options that are still on the old canvas, only as tall as the art, onto the 11 × 11 in canvas. The
 * art keeps its pixels and sits at the top, so it lands in the same place on the shirt. Other options are left alone.
 * Returns whether anything changed.
 */
async function growCanvas(d: Design, s: Sample): Promise<boolean> {
  const old = d.options.filter((o) => o.width === s.width && o.height === s.artHeight)
  if (!old.length) return false
  const work = makeCanvas(s.width, s.height)
  const w = ctx2d(work)
  try {
    for (const o of old) {
      for (const l of o.layers) {
        const bmp = await createImageBitmap(l.png)
        w.clearRect(0, 0, s.width, s.height)
        w.drawImage(bmp, 0, 0)
        bmp.close()
        l.png = await toBlob(work)
      }
      o.height = s.height
      // A new save time also gives the account's copy new image addresses, so no browser shows a cached old one
      o.updatedAt = Date.now()
      const art = await renderOption(o)
      o.thumbnail = await thumbnailOf(art)
      art.width = 0
    }
  } finally {
    work.width = 0
  }
  return true
}

/**
 * Brings a sample someone has already saved over up to the current art, keeping their options, names and colors.
 * An option is redrawn only if each changed layer is still one of the shipped masks in one flat ink, so anything they
 * painted on stays exactly as it was.
 */
async function upgradeArt(d: Design): Promise<Design | null> {
  const s = BATTLE_BASEBALL
  const masks = new Map<string, ImageBitmap>()
  const work = makeCanvas(s.width, s.height)
  const w = ctx2d(work)
  let changed = false
  try {
    for (const o of d.options) {
      if (o.width !== s.width || o.height !== s.height) continue
      // All of an option's layers move together, so a new outline never sits around old art
      let known = 0
      let ok = true
      const redraw: { layer: ColorOption['layers'][number]; ink: Ink; color: string }[] = []
      for (const l of o.layers) {
        const art = ART_HISTORY[l.id]
        if (!art) continue
        const bmp = await createImageBitmap(l.png)
        w.globalCompositeOperation = 'source-over'
        w.clearRect(0, 0, s.width, s.height)
        w.globalCompositeOperation = 'copy'
        w.drawImage(bmp, 0, 0)
        bmp.close()
        const px = w.getImageData(0, 0, s.width, s.height).data
        const version = art.sigs.indexOf(maskSignature(px))
        if (version < 0) {
          ok = false
          break
        }
        known++
        if (version === 0) continue
        let ink = -1
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] <= 127) continue
          const rgb = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]
          if (ink < 0) ink = rgb
          else if (rgb !== ink) {
            ink = -2
            break
          }
        }
        if (ink < 0) {
          ok = false
          break
        }
        redraw.push({ layer: l, ink: art.ink, color: `#${ink.toString(16).padStart(6, '0')}` })
      }
      if (!ok || known !== Object.keys(ART_HISTORY).length || !redraw.length) continue
      for (const { layer, ink, color } of redraw) {
        let mask = masks.get(ink)
        if (!mask) {
          mask = await loadMask(ink)
          masks.set(ink, mask)
        }
        w.globalCompositeOperation = 'source-over'
        w.clearRect(0, 0, s.width, s.height)
        w.globalCompositeOperation = 'copy'
        w.drawImage(mask, 0, 0)
        w.globalCompositeOperation = 'source-in'
        w.fillStyle = color
        w.fillRect(0, 0, s.width, s.height)
        layer.png = await toBlob(work)
      }
      const art = await renderOption(o)
      o.thumbnail = await thumbnailOf(art)
      art.width = 0
      changed = true
    }
  } finally {
    for (const m of masks.values()) m.close()
    work.width = 0
  }
  return changed ? d : null
}

const untouched = (d: Design | undefined): d is Design => !!d && d.updatedAt === d.createdAt

/**
 * Adds the sample designs once each to this browser, and once to each approved account. If someone deletes one later,
 * it stays deleted. A Battle Baseball nobody has saved over in this browser is replaced by the current version, so it
 * picks up fixes like Epic's print colors. One they have saved over keeps their options and gets just the art changes.
 */
export function seedSamples() {
  seeding ??= seedAll().finally(() => (seeding = null))
  return seeding
}

let seeding: Promise<void> | null = null

async function seedAll() {
  let added = false
  if (!seeded()) {
    const existing = await idb.get<Design>(BATTLE_BASEBALL.id)
    const deleted = !existing && OLDER_KEYS.some((k) => seeded(k))
    if (!deleted) {
      if (!existing) await idb.put(await buildSample(BATTLE_BASEBALL))
      // Rebuilt in place: same dates, so it keeps its spot in the library
      else if (untouched(existing)) await idb.put(await buildSample(BATTLE_BASEBALL, existing.updatedAt))
      else {
        // If this fails (say, offline) it stays unmarked and tries again next visit
        const grown = await growCanvas(existing, BATTLE_BASEBALL)
        const upgraded = await upgradeArt(existing)
        if (grown || upgraded) await idb.put(existing)
      }
    }
    markSeeded()
    added = true
  }
  if (!seeded(TEXT_KEY)) {
    const existing = await idb.get<Design>(BATTLE_BASEBALL_TEXT.id)
    if (existing) {
      if (untouched(existing)) await idb.put(await buildSample(BATTLE_BASEBALL_TEXT, existing.updatedAt))
      else if (await growCanvas(existing, BATTLE_BASEBALL_TEXT)) await idb.put(existing)
    } else if (!seeded(OLDER_TEXT_KEY)) {
      // Dated just before Battle Baseball, so it sits right after it in the library
      const bb = await idb.get<Design>(BATTLE_BASEBALL.id)
      await idb.put(await buildSample(BATTLE_BASEBALL_TEXT, (bb?.updatedAt ?? Date.now()) - 1))
    }
    markSeeded(TEXT_KEY)
    added = true
  }
  if (added) await refreshLibrary()

  // A newly approved account gets both samples once, from this browser's copies if nobody has saved over them
  const u = getAccount().user
  if (u?.status === 'approved' && !u.samplesSeeded) {
    const inCloud = new Set((await cloudStore.list()).map((d) => d.id))
    const now = Date.now()
    for (const [s, at] of [[BATTLE_BASEBALL, now], [BATTLE_BASEBALL_TEXT, now - 1]] as const) {
      if (inCloud.has(s.id)) continue
      const local = await idb.get<Design>(s.id)
      await cloudStore.put(untouched(local) ? local : await buildSample(s, at))
    }
    await api('/api/me/samples-seeded', { method: 'POST' })
    markSamplesSeeded()
    markSeeded(cloudCanvasKey(u.id))
    await refreshLibrary()
  }

  // Samples an account got before shirt canvases were 11 × 11 in move onto the bigger canvas, saved-over ones too
  if (u?.status === 'approved' && !seeded(cloudCanvasKey(u.id))) {
    let grown = false
    for (const s of [BATTLE_BASEBALL, BATTLE_BASEBALL_TEXT]) {
      const d = await cloudStore.get(s.id)
      if (d && (await growCanvas(d, s))) {
        await cloudStore.put(d)
        grown = true
      }
    }
    markSeeded(cloudCanvasKey(u.id))
    if (grown) await refreshLibrary()
  }
}

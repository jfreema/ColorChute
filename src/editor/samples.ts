import { api } from '../lib/api'
import { idb } from '../lib/idb'
import { getAccount, markSamplesSeeded } from './account'
import { ctx2d, makeCanvas } from './doc'
import { ColorOption, Design, refreshLibrary, renderOption, thumbnailOf, toBlob } from './designs'
import { cloudStore } from './storage'

/**
 * Built-in sample designs, added to everyone's library on first run. Each layer ships as a white mask
 * (opaque or clear, no soft edges) and is tinted to its ink for each color option.
 */
const SEEDED_KEY = 'colorchute.samples.v4'
/**
 * Set by earlier versions: v1 used inks that aren't on Epic's wheel, v2 had a plain cannon instead of a bat, v3 had a
 * deeper drop shadow under BASEBALL
 */
const OLDER_KEYS = ['colorchute.samples.v1', 'colorchute.samples.v2', 'colorchute.samples.v3']

type Ink = 'outline' | 'battle' | 'tank' | 'baseball'

const BATTLE_BASEBALL = {
  id: 'sample-battle-baseball',
  name: 'Battle Baseball',
  dir: `${import.meta.env.BASE_URL}samples/battle-baseball/`,
  // 11 × 8.41 in at 300 DPI, Epic's widest chest print
  width: 3300,
  height: 2524,
  dpi: 300,
  // Bottom to top
  layers: [
    { id: 'bb-outline', name: 'Outline', ink: 'outline' },
    { id: 'bb-baseball', name: 'BASEBALL', ink: 'baseball' },
    { id: 'bb-tank', name: 'Tank', ink: 'tank' },
    { id: 'bb-battle', name: 'BATTLE', ink: 'battle' },
  ] as { id: string; name: string; ink: Ink }[],
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
  ] as { id: string; name: string; shirt: string; inks: Record<Ink, string> }[],
}

function seeded(key = SEEDED_KEY) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markSeeded() {
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // Without storage the sample's fixed id still stops it being added twice
  }
}

/**
 * Bump when a mask's art changes. The service worker serves files cache-first, so a new URL is the only way returning
 * visitors get the new art.
 */
const ART_VERSION = 4

async function loadMask(ink: Ink): Promise<ImageBitmap> {
  const url = `${BATTLE_BASEBALL.dir}${ink}.png?v=${ART_VERSION}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  return createImageBitmap(await res.blob())
}

async function buildBattleBaseball(): Promise<Design> {
  const s = BATTLE_BASEBALL
  const masks = await Promise.all(s.layers.map((l) => loadMask(l.ink)))
  const now = Date.now()
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
      w.globalCompositeOperation = 'copy'
      w.drawImage(masks[i], 0, 0)
      w.globalCompositeOperation = 'source-in'
      w.fillStyle = o.inks[l.ink]
      w.fillRect(0, 0, s.width, s.height)
      layers.push({ id: l.id, name: l.name, visible: true, opacity: 1, png: await toBlob(work) })
      f.drawImage(work, 0, 0)
    }
    options.push({
      id: o.id, name: o.name, updatedAt: now, width: s.width, height: s.height, dpi: s.dpi, activeId: top.id,
      swatches: [...new Set([o.inks.battle, o.inks.baseball, o.inks.tank, o.inks.outline])],
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
 * Adds the sample designs once to this browser, and once to each approved account. If someone deletes one later,
 * it stays deleted. A sample nobody has saved over in this browser is replaced by the current version, so it picks
 * up fixes like Epic's print colors. One they have saved over keeps their options and gets just the art changes.
 */
export function seedSamples() {
  seeding ??= seedAll().finally(() => (seeding = null))
  return seeding
}

let seeding: Promise<void> | null = null

async function seedAll() {
  if (!seeded()) {
    const existing = await idb.get<Design>(BATTLE_BASEBALL.id)
    const deleted = !existing && OLDER_KEYS.some((k) => seeded(k))
    if (!deleted) {
      if (!existing || untouched(existing)) await idb.put(await buildBattleBaseball())
      else {
        // If this fails (say, offline) it stays unmarked and tries again next visit
        const upgraded = await upgradeArt(existing)
        if (upgraded) await idb.put(upgraded)
      }
    }
    markSeeded()
    await refreshLibrary()
  }
  const u = getAccount().user
  if (u?.status === 'approved' && !u.samplesSeeded) {
    if (!(await cloudStore.list()).some((d) => d.id === BATTLE_BASEBALL.id)) {
      const local = await idb.get<Design>(BATTLE_BASEBALL.id)
      await cloudStore.put(untouched(local) ? local : await buildBattleBaseball())
    }
    await api('/api/me/samples-seeded', { method: 'POST' })
    markSamplesSeeded()
    await refreshLibrary()
  }
}

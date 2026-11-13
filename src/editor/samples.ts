import { idb } from '../lib/idb'
import { ctx2d, makeCanvas } from './doc'
import { ColorOption, Design, refreshLibrary, thumbnailOf, toBlob } from './designs'

/**
 * Built-in sample designs, added to everyone's library on first run. Each layer ships as a white mask
 * (opaque or clear, no soft edges) and is tinted to its ink for each color option.
 */
const SEEDED_KEY = 'colorchute.samples.v1'

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
  options: [
    {
      id: 'bb-coral', name: 'Coral & cream', shirt: '#A2A4A3',
      inks: { outline: '#1A1A18', battle: '#F45B5B', tank: '#F4EAD0', baseball: '#F4EAD0' },
    },
    {
      id: 'bb-royal', name: 'Royal blue', shirt: '#0F64C6',
      inks: { outline: '#1A1A18', battle: '#FFFFFF', tank: '#FFFFFF', baseball: '#F2337F' },
    },
    {
      id: 'bb-green', name: 'Military green', shirt: '#4B5320',
      inks: { outline: '#1A1A18', battle: '#EE7520', tank: '#EFDB9E', baseball: '#EFDB9E' },
    },
  ] as { id: string; name: string; shirt: string; inks: Record<Ink, string> }[],
}

function seeded() {
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
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

async function loadMask(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  return createImageBitmap(await res.blob())
}

async function buildBattleBaseball(): Promise<Design> {
  const s = BATTLE_BASEBALL
  const masks = await Promise.all(s.layers.map((l) => loadMask(`${s.dir}${l.ink}.png`)))
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

/** Adds the sample designs once. If someone deletes one later, it stays deleted. */
export async function seedSamples() {
  if (seeded()) return
  if (!(await idb.get<Design>(BATTLE_BASEBALL.id))) await idb.put(await buildBattleBaseball())
  markSeeded()
  await refreshLibrary()
}

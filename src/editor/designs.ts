import { useSyncExternalStore } from 'react'
import { canSave, requireSave } from './account'
import { ctx2d, Layer, makeCanvas, newId } from './doc'
import { readPixels } from './doc'
import { epicColorName } from '../lib/palettes'
import { inkColors } from './checks'
import { contentBounds, dominantColors } from './pixels'
import { cloudStore, DesignStore, DesignSummary, localStore, urlFor } from './storage'
import { editor } from './store'

/** One saved color scheme of a design: all its layers as they were */
export interface ColorOption {
  id: string
  name: string
  updatedAt: number
  width: number
  height: number
  dpi: number
  activeId: string
  /** The main colors, for showing the scheme at a glance */
  swatches: string[]
  /** The preview shirt color it was saved with, so each option brings its own shirt back */
  shirtColor?: string
  thumbnail: Blob
  layers: { id: string; name: string; visible: boolean; opacity: number; png: Blob }[]
}

export interface Design {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  options: ColorOption[]
}

/** The design and option the editor has open, and summaries for the color option strip */
export interface DesignsState {
  designId: string | null
  optionId: string | null
  designName: string
  options: { id: string; name: string; swatches: string[]; thumb: string; shirt?: string }[]
  library: DesignSummary[]
  /** Where the library came from: this browser, or the signed-in account */
  source: 'local' | 'cloud'
  /** Designs saved in this browser that aren't in the account yet, offered to copy in */
  localOnly: string[]
  busy: boolean
}

let state: DesignsState = {
  designId: null, optionId: null, designName: '', options: [], library: [], source: 'local', localOnly: [], busy: false,
}
const listeners = new Set<() => void>()

function set(patch: Partial<DesignsState>) {
  state = { ...state, ...patch }
  for (const fn of listeners) fn()
}

/** Approved accounts save to the server; everyone else sees this browser's designs, read only */
const activeStore = (): DesignStore => (canSave() ? cloudStore : localStore)

/** Built-in samples, which every account gets its own copy of instead of copying them in */
export const SAMPLE_IDS = new Set(['sample-battle-baseball'])

export function useDesigns<T>(select: (s: DesignsState) => T): T {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => select(state),
  )
}

export const getDesigns = () => state

export const toBlob = (c: HTMLCanvasElement, type = 'image/png') =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode image'))), type))

/**
 * A small PNG of the art, at most 240 px on its long side. It's cropped to the art with a little room around it, so a
 * small design on a big 11 × 11 in canvas still fills its card.
 */
export function thumbnailOf(src: HTMLCanvasElement): Promise<Blob> {
  // Find the art on a small copy; reading every pixel of a full-size canvas is slow on phones
  const k = Math.min(1, 600 / Math.max(src.width, src.height))
  const probe = makeCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)))
  ctx2d(probe).drawImage(src, 0, 0, probe.width, probe.height)
  const box = contentBounds(readPixels(probe))
  probe.width = 0
  let sx = 0, sy = 0, sw = src.width, sh = src.height
  if (box) {
    const pad = Math.round(Math.max(box.w, box.h) * 0.04) + 1
    sx = Math.max(0, Math.floor((box.x - pad) / k))
    sy = Math.max(0, Math.floor((box.y - pad) / k))
    sw = Math.min(src.width, Math.ceil((box.x + box.w + pad) / k)) - sx
    sh = Math.min(src.height, Math.ceil((box.y + box.h + pad) / k)) - sy
  }
  const s = Math.min(1, 240 / Math.max(sw, sh))
  const c = makeCanvas(Math.max(1, Math.round(sw * s)), Math.max(1, Math.round(sh * s)))
  const g = ctx2d(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return toBlob(c)
}

const thumbnail = () => thumbnailOf(editor.composite())

async function snapshotOption(id: string, name: string): Promise<ColorOption> {
  const s = editor.state
  const swatches = dominantColors(readPixels(editor.composite()), 6).map((c) => c.hex)
  return {
    id, name, updatedAt: Date.now(), width: s.width, height: s.height, dpi: s.dpi, activeId: s.activeId, swatches,
    shirtColor: s.preview.shirtColor,
    thumbnail: await thumbnail(),
    layers: await Promise.all(
      s.layers.map(async (l) => ({
        id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, png: await toBlob(l.canvas),
      })),
    ),
  }
}

async function loadOption(o: ColorOption) {
  const layers: Layer[] = []
  for (const l of o.layers) {
    const canvas = makeCanvas(o.width, o.height)
    const bmp = await createImageBitmap(l.png)
    ctx2d(canvas).drawImage(bmp, 0, 0)
    bmp.close()
    layers.push({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, canvas })
  }
  editor.replaceDocument({
    width: o.width, height: o.height, dpi: o.dpi, layers,
    activeId: layers.some((l) => l.id === o.activeId) ? o.activeId : layers[0].id,
  })
  if (o.shirtColor) editor.setPreview({ shirtColor: o.shirtColor })
}

function summarize(d: Design) {
  set({
    designId: d.id, designName: d.name,
    options: d.options.map((o) => ({
      id: o.id, name: o.name, swatches: o.swatches, thumb: urlFor(o.thumbnail), shirt: o.shirtColor,
    })),
  })
}

/** The open design. One opened from this browser before signing in is saved into the account from here on. */
async function current(): Promise<Design | undefined> {
  if (!state.designId) return undefined
  const store = activeStore()
  return (await store.get(state.designId)) ?? (store === cloudStore ? localStore.get(state.designId) : undefined)
}

async function busy<T>(fn: () => Promise<T>): Promise<T | undefined> {
  set({ busy: true })
  try {
    return await fn()
  } catch (e) {
    editor.toast(e instanceof Error ? e.message : 'Something went wrong saving')
    return undefined
  } finally {
    set({ busy: false })
  }
}

export async function refreshLibrary() {
  const store = activeStore()
  try {
    const library = await store.list()
    let localOnly: string[] = []
    if (store === cloudStore) {
      const inAccount = new Set(library.map((d) => d.id))
      localOnly = (await localStore.list()).map((d) => d.id).filter((id) => !inAccount.has(id) && !SAMPLE_IDS.has(id))
    }
    set({ library, localOnly, source: store.kind })
  } catch (e) {
    editor.toast(e instanceof Error ? e.message : "Couldn't load your designs")
  }
}

/** Saves into the open color option, making the design (and a first option) if this is its first save */
export async function save(designName?: string): Promise<boolean> {
  if (!requireSave(() => save(designName))) return false
  const ok = await busy(async () => {
    let d = await current()
    if (!d) {
      const now = Date.now()
      d = { id: newId(), name: designName || editor.state.name || 'Untitled design', createdAt: now, updatedAt: now,
        options: [] }
      set({ optionId: null })
    }
    let id = state.optionId
    const existing = d.options.find((o) => o.id === id)
    const option = await snapshotOption(id && existing ? id : newId(), existing?.name ?? `Option ${d.options.length + 1}`)
    d.options = existing ? d.options.map((o) => (o.id === option.id ? option : o)) : [...d.options, option]
    d.updatedAt = Date.now()
    await cloudStore.put(d)
    set({ optionId: option.id })
    summarize(d)
    editor.markSaved(d.name)
    editor.toast(`Saved ${option.name}`)
    refreshLibrary()
    return true
  })
  return ok ?? false
}

/**
 * A name for a new color option from its inks, like "Black, Linen & Creamsicle", or "Option 5" when an ink isn't
 * one of Epic's colors
 */
export function suggestOptionName(): string {
  const fallback = `Option ${state.options.length + 1}`
  const src = editor.composite()
  // Downsample without smoothing, so no in-between colors appear
  const k = Math.min(1, 500 / Math.max(src.width, src.height))
  const c = makeCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)))
  const g = ctx2d(c)
  g.imageSmoothingEnabled = false
  g.drawImage(src, 0, 0, c.width, c.height)
  const names = inkColors(readPixels(c)).map((ink) => epicColorName(ink.hex))
  if (!names.length || names.length > 4 || names.some((n) => !n)) return fallback
  const base = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
  const taken = new Set(state.options.map((o) => o.name.toLowerCase()))
  let name = base
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} ${i}`
  return name
}

/** Saves the current colors as another option of the open design */
export function saveAsNewOption(name?: string) {
  if (!requireSave(() => saveAsNewOption(name))) return
  return busy(async () => {
    let d = await current()
    if (!d) {
      const now = Date.now()
      d = { id: newId(), name: editor.state.name || 'Untitled design', createdAt: now, updatedAt: now, options: [] }
    }
    const option = await snapshotOption(newId(), name || `Option ${d.options.length + 1}`)
    d.options = [...d.options, option]
    d.updatedAt = Date.now()
    await cloudStore.put(d)
    set({ optionId: option.id })
    summarize(d)
    editor.markSaved(d.name)
    editor.toast(`Saved ${option.name}`)
    refreshLibrary()
  })
}

export function openOption(optionId: string) {
  return busy(async () => {
    const d = await current()
    const o = d?.options.find((x) => x.id === optionId)
    if (!d || !o) return
    await loadOption(o)
    set({ optionId: o.id })
    editor.markSaved(d.name)
  })
}

export function openDesign(designId: string) {
  return busy(async () => {
    const d = await activeStore().get(designId)
    if (!d || !d.options.length) return
    editor.showAllInks()
    await loadOption(d.options[0])
    set({ optionId: d.options[0].id })
    summarize(d)
    editor.markSaved(d.name)
  })
}

export function renameOption(optionId: string, name: string) {
  if (!requireSave(() => renameOption(optionId, name))) return
  return busy(async () => {
    const d = await current()
    if (!d) return
    d.options = d.options.map((o) => (o.id === optionId ? { ...o, name } : o))
    await cloudStore.put(d)
    summarize(d)
  })
}

export function deleteOption(optionId: string) {
  if (!requireSave(() => deleteOption(optionId))) return
  return busy(async () => {
    const d = await current()
    if (!d) return
    if (d.options.length <= 1) return editor.toast('A design keeps at least one option. Delete the design instead.')
    d.options = d.options.filter((o) => o.id !== optionId)
    d.updatedAt = Date.now()
    await cloudStore.put(d)
    if (state.optionId === optionId) set({ optionId: null })
    summarize(d)
    refreshLibrary()
  })
}

export function renameDesign(designId: string, name: string) {
  if (!requireSave(() => renameDesign(designId, name))) return
  return busy(async () => {
    const d = await cloudStore.get(designId)
    if (!d) return
    d.name = name
    await cloudStore.put(d)
    if (state.designId === designId) {
      summarize(d)
      editor.markSaved(name)
    }
    refreshLibrary()
  })
}

export function duplicateDesign(designId: string) {
  if (!requireSave(() => duplicateDesign(designId))) return
  return busy(async () => {
    const d = await cloudStore.get(designId)
    if (!d) return
    const now = Date.now()
    await cloudStore.put({ ...d, id: newId(), name: `${d.name} copy`, createdAt: now, updatedAt: now })
    refreshLibrary()
  })
}

export function deleteDesign(designId: string) {
  if (!requireSave(() => deleteDesign(designId))) return
  return busy(async () => {
    await cloudStore.delete(designId)
    if (state.designId === designId) set({ designId: null, optionId: null, options: [], designName: '' })
    refreshLibrary()
  })
}

/** Copies the designs saved in this browser before sign-in into the account. Returns how many were copied. */
export function copyLocalDesigns() {
  if (!requireSave(() => copyLocalDesigns())) return
  return busy(async () => {
    const ids = state.localOnly
    let n = 0
    for (const id of ids) {
      const d = await localStore.get(id)
      if (!d || !d.options.length) continue
      editor.toast(`Copying ${d.name} (${++n} of ${ids.length})`)
      await cloudStore.put(d)
    }
    await refreshLibrary()
    editor.toast(n === 1 ? 'Copied 1 design to your account' : `Copied ${n} designs to your account`)
    return n
  })
}

/** Forgets the open design, so the next save starts a new one. The pixels stay. */
export function detachDesign() {
  set({ designId: null, optionId: null, options: [], designName: '' })
}

/** Every option of the open design, for exporting them all */
export async function allOptions(): Promise<ColorOption[]> {
  return (await current())?.options ?? []
}

/** Draws a saved option flattened, for exports */
export async function renderOption(o: ColorOption): Promise<HTMLCanvasElement> {
  const c = makeCanvas(o.width, o.height)
  const g = ctx2d(c)
  for (const l of o.layers) {
    if (!l.visible) continue
    const bmp = await createImageBitmap(l.png)
    g.globalAlpha = l.opacity
    g.drawImage(bmp, 0, 0)
    bmp.close()
  }
  g.globalAlpha = 1
  return c
}

export { newId }

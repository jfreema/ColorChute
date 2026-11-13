import { useSyncExternalStore } from 'react'
import { idb, persistStorage } from '../lib/idb'
import { ctx2d, Layer, makeCanvas, newId } from './doc'
import { readPixels } from './doc'
import { dominantColors } from './pixels'
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
  library: {
    id: string; name: string; updatedAt: number; optionCount: number; thumb: string; swatches: string[]; shirt?: string
  }[]
  busy: boolean
}

let state: DesignsState = { designId: null, optionId: null, designName: '', options: [], library: [], busy: false }
const listeners = new Set<() => void>()
const thumbUrls = new Map<Blob, string>()

function set(patch: Partial<DesignsState>) {
  state = { ...state, ...patch }
  for (const fn of listeners) fn()
}

function urlFor(b: Blob) {
  let u = thumbUrls.get(b)
  if (!u) thumbUrls.set(b, (u = URL.createObjectURL(b)))
  return u
}

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

/** A small PNG of the art, at most 240 px on its long side */
export function thumbnailOf(src: HTMLCanvasElement): Promise<Blob> {
  const s = Math.min(1, 240 / Math.max(src.width, src.height))
  const c = makeCanvas(Math.max(1, Math.round(src.width * s)), Math.max(1, Math.round(src.height * s)))
  const g = ctx2d(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, c.width, c.height)
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

async function current(): Promise<Design | undefined> {
  return state.designId ? idb.get<Design>(state.designId) : undefined
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
  const all = await idb.all<Design>()
  all.sort((a, b) => b.updatedAt - a.updatedAt)
  set({
    library: all.map((d) => {
      const o = d.options[0]
      return {
        id: d.id, name: d.name, updatedAt: d.updatedAt, optionCount: d.options.length,
        thumb: o ? urlFor(o.thumbnail) : '', swatches: o?.swatches ?? [], shirt: o?.shirtColor,
      }
    }),
  })
}

/** Saves into the open color option, making the design (and a first option) if this is its first save */
export function save(designName?: string) {
  return busy(async () => {
    persistStorage()
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
    await idb.put(d)
    set({ optionId: option.id })
    summarize(d)
    editor.markSaved(d.name)
    editor.toast(`Saved ${option.name}`)
    refreshLibrary()
  })
}

/** Saves the current colors as another option of the open design */
export function saveAsNewOption(name?: string) {
  return busy(async () => {
    persistStorage()
    let d = await current()
    if (!d) {
      const now = Date.now()
      d = { id: newId(), name: editor.state.name || 'Untitled design', createdAt: now, updatedAt: now, options: [] }
    }
    const option = await snapshotOption(newId(), name || `Option ${d.options.length + 1}`)
    d.options = [...d.options, option]
    d.updatedAt = Date.now()
    await idb.put(d)
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
    const d = await idb.get<Design>(designId)
    if (!d || !d.options.length) return
    await loadOption(d.options[0])
    set({ optionId: d.options[0].id })
    summarize(d)
    editor.markSaved(d.name)
  })
}

export function renameOption(optionId: string, name: string) {
  return busy(async () => {
    const d = await current()
    if (!d) return
    d.options = d.options.map((o) => (o.id === optionId ? { ...o, name } : o))
    await idb.put(d)
    summarize(d)
  })
}

export function deleteOption(optionId: string) {
  return busy(async () => {
    const d = await current()
    if (!d) return
    if (d.options.length <= 1) return editor.toast('A design keeps at least one option. Delete the design instead.')
    d.options = d.options.filter((o) => o.id !== optionId)
    d.updatedAt = Date.now()
    await idb.put(d)
    if (state.optionId === optionId) set({ optionId: null })
    summarize(d)
    refreshLibrary()
  })
}

export function renameDesign(designId: string, name: string) {
  return busy(async () => {
    const d = await idb.get<Design>(designId)
    if (!d) return
    d.name = name
    await idb.put(d)
    if (state.designId === designId) {
      summarize(d)
      editor.markSaved(name)
    }
    refreshLibrary()
  })
}

export function duplicateDesign(designId: string) {
  return busy(async () => {
    const d = await idb.get<Design>(designId)
    if (!d) return
    const now = Date.now()
    await idb.put({ ...d, id: newId(), name: `${d.name} copy`, createdAt: now, updatedAt: now })
    refreshLibrary()
  })
}

export function deleteDesign(designId: string) {
  return busy(async () => {
    await idb.delete(designId)
    if (state.designId === designId) set({ designId: null, optionId: null, options: [], designName: '' })
    refreshLibrary()
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

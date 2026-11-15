import { useSyncExternalStore } from 'react'
import { canSave, requireSave } from './account'
import { ctx2d, Layer, makeCanvas, newId } from './doc'
import { readPixels } from './doc'
import { epicColorName } from '../lib/palettes'
import { inkColors } from './checks'
import { contentBounds, dominantColors } from './pixels'
import { DesignLink, leaveLink } from './links'
import {
  cloudStore, createShareLink, DesignSummary, localStore, publicStore, setDesignPublic, sharedStore, stopSharing, urlFor,
} from './storage'
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

export type OpenFrom = 'mine' | 'public' | 'shared'

/** The design and option the editor has open, and summaries for the color option strip */
export interface DesignsState {
  designId: string | null
  optionId: string | null
  designName: string
  options: { id: string; name: string; swatches: string[]; thumb: string; shirt?: string }[]
  /**
   * Whether the open design is one of mine, a public one, or one opened from someone's share link. Saving a public or
   * shared one saves my own copy.
   */
  openFrom: OpenFrom
  /** My designs, for approved accounts */
  library: DesignSummary[]
  /** Designs an admin made public, which everyone sees */
  publicLibrary: DesignSummary[]
  /** Designs saved in this browser that aren't in the account yet, offered to copy in */
  localOnly: string[]
  busy: boolean
}

let state: DesignsState = {
  designId: null, optionId: null, designName: '', options: [], openFrom: 'mine', library: [], publicLibrary: [],
  localOnly: [], busy: false,
}
const listeners = new Set<() => void>()

function set(patch: Partial<DesignsState>) {
  state = { ...state, ...patch }
  for (const fn of listeners) fn()
}

/** The built-in samples browsers used to get. Their old copies aren't offered for copying into an account. */
export const SAMPLE_IDS = new Set(['sample-battle-baseball', 'sample-battle-baseball-text'])

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

/** The open design, as it was last saved */
async function current(): Promise<Design | undefined> {
  if (!state.designId) return undefined
  if (state.openFrom === 'public') return publicStore.get(state.designId)
  if (state.openFrom === 'shared') return sharedStore.get(state.designId)
  if (!canSave()) return undefined
  return (await cloudStore.get(state.designId)) ?? localStore.get(state.designId)
}

/** The open design, ready to save into my account: a public one becomes my own copy, with all its options */
async function mine(): Promise<Design | undefined> {
  const d = await current()
  if (!d || state.openFrom === 'mine') return d
  const now = Date.now()
  return { ...d, id: newId(), createdAt: now, updatedAt: now, options: [...d.options] }
}

/** After saving: the design that was saved is now the open one, and it's mine */
function saved(d: Design) {
  // A copy of someone else's design isn't what the link in the address bar shows anymore
  if (state.openFrom !== 'mine') leaveLink()
  set({ openFrom: 'mine' })
  summarize(d)
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
  const [pub, own] = await Promise.allSettled([publicStore.list(), canSave() ? cloudStore.list() : Promise.resolve([])])
  if (pub.status === 'fulfilled') set({ publicLibrary: pub.value })
  if (own.status === 'rejected') {
    const e = own.reason
    editor.toast(e instanceof Error ? e.message : "Couldn't load your designs")
    return
  }
  const library = own.value
  let localOnly: string[] = []
  if (canSave()) {
    const inAccount = new Set(library.map((d) => d.id))
    localOnly = (await localStore.list().catch(() => [])).map((d) => d.id)
      .filter((id) => !inAccount.has(id) && !SAMPLE_IDS.has(id))
  }
  set({ library, localOnly })
}

/** Saves into the open color option, making the design (and a first option) if this is its first save */
export async function save(designName?: string): Promise<boolean> {
  if (!requireSave(() => save(designName))) return false
  const ok = await busy(async () => {
    let d = await mine()
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
    saved(d)
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
    let d = await mine()
    if (!d) {
      const now = Date.now()
      d = { id: newId(), name: editor.state.name || 'Untitled design', createdAt: now, updatedAt: now, options: [] }
    }
    const option = await snapshotOption(newId(), name || `Option ${d.options.length + 1}`)
    d.options = [...d.options, option]
    d.updatedAt = Date.now()
    await cloudStore.put(d)
    set({ optionId: option.id })
    saved(d)
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

/** Loads a design into the editor, on the given option or its first. False when it's gone. */
async function load(designId: string, from: OpenFrom, optionId?: string): Promise<boolean> {
  const d = from === 'public' ? await publicStore.get(designId)
    : from === 'shared' ? await sharedStore.get(designId)
      : await cloudStore.get(designId)
  if (!d || !d.options.length) return false
  const o = d.options.find((x) => x.id === optionId) ?? d.options[0]
  editor.showAllInks()
  await loadOption(o)
  set({ optionId: o.id, openFrom: from })
  summarize(d)
  editor.markSaved(d.name)
  return true
}

/** Opens one of my designs, or a public one */
export function openDesign(designId: string, from: 'mine' | 'public' = 'mine') {
  return busy(async () => {
    if (await load(designId, from)) leaveLink()
  })
}

/**
 * Opens the design a link points to, the way its sender was looking at it: same option, background and zoom. Its
 * owner gets it as their own design, ready to edit. False, after saying why, when the link doesn't work.
 */
export async function openLink(link: DesignLink): Promise<boolean> {
  const ok = await busy(async () => {
    let id = link.id
    let from: OpenFrom = link.kind === 's' ? 'shared' : 'public'
    if (link.kind === 's') {
      const m = await sharedStore.meta(link.id)
      if (!m) throw new Error('This share link doesn’t work anymore. Whoever shared it may have turned it off.')
      if (m.mine && m.designId && canSave()) [id, from] = [m.designId, 'mine']
    } else {
      const s = state.publicLibrary.find((d) => d.id === link.id)
      if (s?.mine && s.designId && canSave()) [id, from] = [s.designId, 'mine']
    }
    if (!(await load(id, from, link.option))) throw new Error('That design isn’t available anymore.')
    editor.setPreview(link.preview)
    if (link.frame) editor.frameView(link.frame)
    return true
  })
  return ok ?? false
}

/** Makes a share link for one of my designs, or gets the one it has. Returns its token. */
export async function share(designId: string): Promise<string | undefined> {
  if (!requireSave(() => share(designId))) return undefined
  return busy(async () => {
    const token = await createShareLink(designId)
    await refreshLibrary()
    return token
  })
}

/** Turns a design's share link off, so the link stops working */
export function unshare(designId: string) {
  if (!requireSave(() => unshare(designId))) return
  return busy(async () => {
    await stopSharing(designId)
    editor.toast('Share link turned off. Anyone who has it can’t open the design now.')
    await refreshLibrary()
  })
}

/** Makes one of my designs public so everyone, signed in or not, can look at it. Admins only. */
export function setPublic(designId: string, pub: boolean) {
  return busy(async () => {
    await setDesignPublic(designId, pub)
    editor.toast(pub ? 'Everyone can see this design now' : 'Only you can see this design now')
    await refreshLibrary()
  })
}

export function renameOption(optionId: string, name: string) {
  if (!requireSave(() => renameOption(optionId, name))) return
  return busy(async () => {
    const d = await current()
    if (!d || state.openFrom === 'public') return
    d.options = d.options.map((o) => (o.id === optionId ? { ...o, name } : o))
    await cloudStore.put(d)
    summarize(d)
  })
}

export function deleteOption(optionId: string) {
  if (!requireSave(() => deleteOption(optionId))) return
  return busy(async () => {
    const d = await current()
    if (!d || state.openFrom === 'public') return
    if (d.options.length <= 1) return editor.toast('A design keeps at least one option. Delete the design instead.')
    d.options = d.options.filter((o) => o.id !== optionId)
    d.updatedAt = Date.now()
    await cloudStore.put(d)
    if (state.optionId === optionId) set({ optionId: null })
    summarize(d)
    refreshLibrary()
  })
}

/**
 * Moves a color option to another place in the strip, saving the new order with the design. The first option is the
 * one the design opens on and shows in the library.
 */
export function moveOption(optionId: string, to: number) {
  if (!requireSave(() => moveOption(optionId, to))) return
  const reorder = <T extends { id: string }>(list: T[]) => {
    const from = list.findIndex((o) => o.id === optionId)
    if (from < 0 || from === to) return list
    const next = [...list]
    next.splice(to, 0, ...next.splice(from, 1))
    return next
  }
  const before = state.options
  // Show the new order now, so the dropped card stays where it was put while the order saves
  set({ options: reorder(before) })
  return busy(async () => {
    const d = await current()
    if (!d || state.openFrom !== 'mine') return set({ options: before })
    const moved = { ...d, options: reorder(d.options), updatedAt: Date.now() }
    try {
      await cloudStore.put(moved)
    } catch (e) {
      set({ options: before })
      throw e
    }
    summarize(moved)
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
    if (state.designId === designId) {
      leaveLink()
      set({ designId: null, optionId: null, options: [], designName: '' })
    }
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
  leaveLink()
  set({ designId: null, optionId: null, options: [], designName: '', openFrom: 'mine' })
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

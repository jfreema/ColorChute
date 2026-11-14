import { useSyncExternalStore } from 'react'
import { hexToRgba, normalizeHex, RGBA } from '../lib/color'
import { DEFAULT_DPI } from '../lib/printSpecs'
import { ctx2d, Layer, makeCanvas, makeLayer, newId, readPixels } from './doc'
import { DocState, History } from './history'
import {
  contentBounds, cropPixels, Mask, paintMask, Rect, regionAt, replaceInk, resizeNearest, strokeLine, unionRect,
} from './pixels'
import { combine, cropMask, growMask, invertMask, isEmpty, maskBounds, rectMask, SelectMode, shrinkMask } from './selection'

export type Tool = 'move' | 'select' | 'wand' | 'bucket' | 'picker' | 'pencil' | 'eraser' | 'crop' | 'hand'
export type PreviewMode = 'square' | 'shirt' | 'realistic'

export interface ToolOptions {
  /** 0–100 */
  tolerance: number
  contiguous: boolean
  /** Fill and wand look at every visible layer, not just the active one */
  sampleAll: boolean
  brushSize: number
  growBy: number
}

export interface PreviewSettings {
  mode: PreviewMode
  /** The square's color, or 'transparent' for a checkerboard */
  boardColor: string
  shirtColor: string
  /** Which blank's color list the shirt swatches show */
  shirtCollection?: string
  /** Behind everything */
  stageColor: string
  /** 'fit' fills the chest print area; 'actual' sizes the print from the document's DPI */
  sizeMode: 'fit' | 'actual'
}

export interface EditorState extends DocState {
  name: string
  tool: Tool
  options: ToolOptions
  primary: string
  secondary: string
  recent: string[]
  preview: PreviewSettings
  /** The crop tool's box while it's being set, in document pixels */
  cropRect: Rect | null
  /** Bumped when any layer's pixels change, to redraw */
  pixelsVersion: number
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  undoLabel?: string
  redoLabel?: string
  toast: { text: string; id: number } | null
}

const SETTINGS_KEY = 'colorchute.settings.v1'

function loadSettings(): Partial<Pick<EditorState, 'options' | 'preview' | 'primary' | 'secondary' | 'recent'>> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export interface ProjectFile {
  app: 'ColorChute'
  version: 1
  name: string
  width: number
  height: number
  dpi: number
  activeId: string
  layers: { id: string; name: string; visible: boolean; opacity: number; png: string }[]
  preview?: PreviewSettings
}

export class Editor {
  private listeners = new Set<() => void>()
  private history = new History()
  private compositeCanvas: HTMLCanvasElement | null = null
  private compositeVersion = -1
  private stroke: { img: ImageData; last: [number, number]; box: Rect | null; color: RGBA } | null = null
  private moving: { img: ImageData; before: ImageData } | null = null
  state: EditorState

  constructor() {
    const saved = loadSettings()
    const w = 3600, h = 3600
    const layer = makeLayer('Layer 1', w, h)
    this.state = {
      name: 'Untitled',
      width: w, height: h, dpi: DEFAULT_DPI, layers: [layer], activeId: layer.id, selection: null,
      tool: 'bucket',
      options: { tolerance: 15, contiguous: true, sampleAll: false, brushSize: 24, growBy: 4, ...saved.options },
      primary: saved.primary ?? '#AF0011',
      secondary: saved.secondary ?? '#0A2041',
      recent: saved.recent ?? [],
      preview: {
        mode: 'square', boardColor: '#FFFFFF', shirtColor: '#F7F7F5', stageColor: '#DCE6FF', sizeMode: 'actual',
        ...saved.preview,
      },
      cropRect: null,
      pixelsVersion: 0,
      dirty: false,
      canUndo: false,
      canRedo: false,
      toast: null,
    }
  }

  // MARK: Plumbing

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState = () => this.state

  private set(patch: Partial<EditorState>) {
    this.state = {
      ...this.state, ...patch,
      canUndo: this.history.canUndo, canRedo: this.history.canRedo,
      undoLabel: this.history.undoLabel, redoLabel: this.history.redoLabel,
    }
    if ('options' in patch || 'preview' in patch || 'primary' in patch || 'secondary' in patch || 'recent' in patch) {
      const { options, preview, primary, secondary, recent } = this.state
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ options, preview, primary, secondary, recent }))
      } catch {
        // Private windows can refuse storage; settings just won't stick
      }
    }
    for (const fn of this.listeners) fn()
  }

  private changed(patch: Partial<EditorState> = {}) {
    this.set({ ...patch, pixelsVersion: this.state.pixelsVersion + 1, dirty: true })
  }

  toast(text: string) {
    this.set({ toast: { text, id: Date.now() } })
  }

  get active(): Layer {
    return this.state.layers.find((l) => l.id === this.state.activeId) ?? this.state.layers[0]
  }

  private get tol() {
    return Math.round(this.state.options.tolerance * 2.55)
  }

  /** Every visible layer flattened, at document size. Cached until the pixels change. */
  composite(): HTMLCanvasElement {
    const { width, height, layers, pixelsVersion } = this.state
    let c = this.compositeCanvas
    if (c && this.compositeVersion === pixelsVersion && c.width === width && c.height === height) return c
    if (!c || c.width !== width || c.height !== height) c = this.compositeCanvas = makeCanvas(width, height)
    const g = ctx2d(c)
    g.clearRect(0, 0, width, height)
    for (const l of layers) {
      if (!l.visible || l.opacity <= 0) continue
      g.globalAlpha = l.opacity
      g.drawImage(l.canvas, 0, 0)
    }
    g.globalAlpha = 1
    this.compositeVersion = pixelsVersion
    return c
  }

  private reference(): ImageData {
    return this.state.options.sampleAll ? readPixels(this.composite()) : readPixels(this.active.canvas)
  }

  /** Runs an edit to the given layers as one undo step */
  private edit(label: string, layerIds: string[] | 'all', fn: () => Partial<EditorState> | void) {
    this.history.begin(this.state, label, layerIds)
    const patch = fn() || {}
    this.state = { ...this.state, ...patch }
    this.history.commit(this.state)
    this.changed(patch)
  }

  // MARK: Settings

  setTool(tool: Tool) {
    if (tool !== 'crop' && this.state.cropRect) this.set({ cropRect: null })
    this.set({ tool })
  }

  setOptions(o: Partial<ToolOptions>) {
    this.set({ options: { ...this.state.options, ...o } })
  }

  setPreview(p: Partial<PreviewSettings>) {
    this.set({ preview: { ...this.state.preview, ...p } })
  }

  setPrimary(hex: string) {
    const c = normalizeHex(hex)
    const recent = [c, ...this.state.recent.filter((r) => r !== c)].slice(0, 12)
    this.set({ primary: c, recent })
  }

  setSecondary(hex: string) {
    this.set({ secondary: normalizeHex(hex) })
  }

  swapColors() {
    this.set({ primary: this.state.secondary, secondary: this.state.primary })
  }

  setCropRect(r: Rect | null) {
    this.set({ cropRect: r })
  }

  // MARK: Documents

  newDocument(width: number, height: number, dpi: number, name = 'Untitled') {
    const layer = makeLayer('Layer 1', width, height)
    this.history.clear()
    this.set({
      name, width, height, dpi, layers: [layer], activeId: layer.id, selection: null, cropRect: null,
      pixelsVersion: this.state.pixelsVersion + 1, dirty: false,
    })
  }

  /** Opens an image as a new document the image's size, with the image as its first layer */
  async openImage(file: Blob, name: string, dpi = DEFAULT_DPI) {
    const bmp = await createImageBitmap(file)
    const layer = makeLayer(name.replace(/\.[^.]+$/, ''), bmp.width, bmp.height)
    ctx2d(layer.canvas).drawImage(bmp, 0, 0)
    this.history.clear()
    this.set({
      name: name.replace(/\.[^.]+$/, ''), width: bmp.width, height: bmp.height, dpi, layers: [layer],
      activeId: layer.id, selection: null, cropRect: null, pixelsVersion: this.state.pixelsVersion + 1, dirty: false,
    })
    bmp.close()
  }

  /** Adds an image as a layer above the active one, centered, shrunk to fit if it's bigger than the document */
  async placeImage(file: Blob, name: string) {
    const bmp = await createImageBitmap(file)
    const { width: W, height: H } = this.state
    const s = Math.min(1, W / bmp.width, H / bmp.height)
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s)
    const layer = makeLayer(name.replace(/\.[^.]+$/, '') || 'Image', W, H)
    const g = ctx2d(layer.canvas)
    g.imageSmoothingQuality = 'high'
    g.drawImage(bmp, Math.round((W - w) / 2), Math.round((H - h) / 2), w, h)
    bmp.close()
    this.insertLayer(layer, 'Place image')
    if (s < 1) this.toast(`Shrunk to ${Math.round(s * 100)}% to fit`)
  }

  // MARK: Layers

  private insertLayer(layer: Layer, label: string) {
    this.edit(label, [], () => {
      const layers = [...this.state.layers]
      const i = layers.findIndex((l) => l.id === this.state.activeId)
      layers.splice(i + 1, 0, layer)
      return { layers, activeId: layer.id }
    })
  }

  addLayer() {
    this.insertLayer(makeLayer(`Layer ${this.state.layers.length + 1}`, this.state.width, this.state.height), 'New layer')
  }

  duplicateLayer(id = this.state.activeId) {
    const src = this.state.layers.find((l) => l.id === id)
    if (!src) return
    const copy = makeLayer(`${src.name} copy`, this.state.width, this.state.height)
    copy.opacity = src.opacity
    ctx2d(copy.canvas).drawImage(src.canvas, 0, 0)
    this.setActive(id)
    this.insertLayer(copy, 'Duplicate layer')
  }

  deleteLayer(id = this.state.activeId) {
    if (this.state.layers.length <= 1) {
      this.toast('A design needs at least one layer')
      return
    }
    this.edit('Delete layer', [id], () => {
      const i = this.state.layers.findIndex((l) => l.id === id)
      const layers = this.state.layers.filter((l) => l.id !== id)
      const activeId = id === this.state.activeId ? layers[Math.max(0, i - 1)].id : this.state.activeId
      return { layers, activeId }
    })
  }

  /** Moves a layer up (+1, toward the front) or down (-1) */
  moveLayer(id: string, dir: 1 | -1) {
    const i = this.state.layers.findIndex((l) => l.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= this.state.layers.length) return
    this.edit(dir > 0 ? 'Move layer up' : 'Move layer down', [], () => {
      const layers = [...this.state.layers]
      ;[layers[i], layers[j]] = [layers[j], layers[i]]
      return { layers }
    })
  }

  reorderLayer(id: string, toIndex: number) {
    const i = this.state.layers.findIndex((l) => l.id === id)
    if (i < 0 || i === toIndex) return
    this.edit('Move layer', [], () => {
      const layers = [...this.state.layers]
      const [l] = layers.splice(i, 1)
      layers.splice(Math.max(0, Math.min(layers.length, toIndex)), 0, l)
      return { layers }
    })
  }

  mergeDown(id = this.state.activeId) {
    const i = this.state.layers.findIndex((l) => l.id === id)
    if (i <= 0) return
    const below = this.state.layers[i - 1], top = this.state.layers[i]
    this.edit('Merge down', [below.id, top.id], () => {
      const g = ctx2d(below.canvas)
      g.globalAlpha = top.visible ? top.opacity : 0
      g.drawImage(top.canvas, 0, 0)
      g.globalAlpha = 1
      return { layers: this.state.layers.filter((l) => l.id !== top.id), activeId: below.id }
    })
  }

  setActive(id: string) {
    if (id !== this.state.activeId) this.set({ activeId: id })
  }

  /** Name and opacity changes are undoable; showing and hiding isn't, like in most editors */
  updateLayer(id: string, patch: Partial<Pick<Layer, 'name' | 'visible' | 'opacity'>>) {
    const apply = () => ({ layers: this.state.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
    if ('visible' in patch && Object.keys(patch).length === 1) this.changed(apply())
    else this.edit('Layer settings', [], apply)
  }

  soloLayer(id: string) {
    const others = this.state.layers.filter((l) => l.id !== id)
    const solo = others.every((l) => !l.visible)
    this.changed({ layers: this.state.layers.map((l) => ({ ...l, visible: l.id === id || solo })) })
  }

  // MARK: Painting

  fillAt(x: number, y: number) {
    const ref = this.reference()
    const region = regionAt(ref, x, y, this.tol, this.state.options.contiguous)
    const layer = this.active
    this.edit('Fill', [layer.id], () => {
      const img = readPixels(layer.canvas)
      const box = paintMask(img, region, hexToRgba(this.state.primary), this.state.selection)
      if (box) ctx2d(layer.canvas).putImageData(img, 0, 0, box.x, box.y, box.w, box.h)
    })
  }

  /** Fills the selection, or the whole layer with nothing selected */
  fillSelection(hex = this.state.primary) {
    const layer = this.active
    this.edit('Fill selection', [layer.id], () => {
      const img = readPixels(layer.canvas)
      const all = new Uint8Array(img.width * img.height).fill(255)
      const box = paintMask(img, all, hexToRgba(hex), this.state.selection)
      if (box) ctx2d(layer.canvas).putImageData(img, 0, 0, box.x, box.y, box.w, box.h)
    })
  }

  /** Clears the selected pixels on the active layer, or the whole layer with nothing selected */
  clearSelection() {
    const layer = this.active
    this.edit('Clear', [layer.id], () => {
      const img = readPixels(layer.canvas)
      const all = new Uint8Array(img.width * img.height).fill(255)
      const box = paintMask(img, all, [0, 0, 0, 0], this.state.selection)
      if (box) ctx2d(layer.canvas).putImageData(img, 0, 0, box.x, box.y, box.w, box.h)
    })
  }

  /**
   * Swaps one color for another on every layer, for trying color schemes. Uses the tolerance setting so slightly
   * off pixels from a scan or JPEG come along.
   */
  /**
   * Changes one ink to another on every layer. `inks` are all the design's inks, so only pixels of this one move,
   * whatever the fill tolerance is set to.
   */
  replaceEverywhere(fromHex: string, toHex: string, inks: string[] = []) {
    const from = hexToRgba(fromHex), to = hexToRgba(toHex)
    const others = inks.map(hexToRgba)
    let n = 0
    this.edit('Swap color', this.state.layers.map((l) => l.id), () => {
      for (const l of this.state.layers) {
        const img = readPixels(l.canvas)
        const changed = replaceInk(img, from, others, to, this.state.selection)
        if (changed) ctx2d(l.canvas).putImageData(img, 0, 0)
        n += changed
      }
    })
    if (!n) this.toast('That color isn’t in the design')
  }

  pickAt(x: number, y: number, into: 'primary' | 'secondary' = 'primary') {
    const px = ctx2d(this.composite()).getImageData(Math.floor(x), Math.floor(y), 1, 1).data
    if (px[3] === 0) return
    const hex = normalizeHex('#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join(''))
    if (into === 'primary') this.setPrimary(hex)
    else this.setSecondary(hex)
  }

  beginStroke(x: number, y: number, erase: boolean) {
    const layer = this.active
    if (!layer.visible) {
      this.toast('This layer is hidden')
      return
    }
    this.history.begin(this.state, erase ? 'Erase' : 'Paint', [layer.id])
    const color: RGBA = erase ? [0, 0, 0, 0] : hexToRgba(this.state.primary)
    this.stroke = { img: readPixels(layer.canvas), last: [x, y], box: null, color }
    this.strokeTo(x, y)
  }

  strokeTo(x: number, y: number) {
    const s = this.stroke
    if (!s) return
    const box = strokeLine(s.img, s.last[0], s.last[1], x, y, this.state.options.brushSize, s.color, this.state.selection)
    s.last = [x, y]
    if (box) ctx2d(this.active.canvas).putImageData(s.img, 0, 0, box.x, box.y, box.w, box.h)
    s.box = unionRect(s.box, box)
    this.set({ pixelsVersion: this.state.pixelsVersion + 1 })
  }

  endStroke() {
    if (!this.stroke) return
    this.stroke = null
    this.history.commit(this.state)
    this.changed()
  }

  beginMove() {
    const layer = this.active
    this.history.begin(this.state, 'Move', [layer.id])
    const img = readPixels(layer.canvas)
    this.moving = { img, before: img }
  }

  moveBy(dx: number, dy: number) {
    if (!this.moving) return
    const g = ctx2d(this.active.canvas)
    g.clearRect(0, 0, this.state.width, this.state.height)
    g.putImageData(this.moving.before, Math.round(dx), Math.round(dy))
    this.set({ pixelsVersion: this.state.pixelsVersion + 1 })
  }

  endMove() {
    if (!this.moving) return
    this.moving = null
    this.history.commit(this.state)
    this.changed()
  }

  /** Nudges the active layer by whole pixels, for the arrow keys */
  nudge(dx: number, dy: number) {
    this.beginMove()
    this.moveBy(dx, dy)
    this.endMove()
  }

  // MARK: Selection

  private select(mask: Mask | null, label: string) {
    const selection = mask && !isEmpty(mask) ? mask : null
    this.edit(label, [], () => ({ selection }))
  }

  selectRect(r: Rect, mode: SelectMode) {
    const { width: w, height: h } = this.state
    this.select(combine(this.state.selection, rectMask(w, h, r), mode), 'Select')
  }

  wandAt(x: number, y: number, mode: SelectMode) {
    const region = regionAt(this.reference(), x, y, this.tol, this.state.options.contiguous)
    this.select(combine(this.state.selection, region, mode), 'Magic wand')
  }

  selectAll() {
    const { width: w, height: h } = this.state
    this.select(new Uint8Array(w * h).fill(255), 'Select all')
  }

  deselect() {
    if (this.state.selection) this.select(null, 'Deselect')
  }

  invertSelection() {
    const { width: w, height: h, selection } = this.state
    this.select(selection ? invertMask(selection) : new Uint8Array(w * h).fill(255), 'Invert selection')
  }

  growSelection(px = this.state.options.growBy) {
    const { width: w, height: h, selection } = this.state
    if (!selection) return this.toast('Select something first')
    this.select(growMask(selection, w, h, px), `Grow ${px}px`)
  }

  shrinkSelection(px = this.state.options.growBy) {
    const { width: w, height: h, selection } = this.state
    if (!selection) return this.toast('Select something first')
    this.select(shrinkMask(selection, w, h, px), `Shrink ${px}px`)
  }

  /** Selects what's on the active layer */
  selectLayerContent() {
    const img = readPixels(this.active.canvas)
    const m = new Uint8Array(img.width * img.height)
    for (let p = 0; p < m.length; p++) if (img.data[p * 4 + 3]) m[p] = 255
    this.select(m, 'Select layer')
  }

  // MARK: Canvas size

  crop(r: Rect) {
    const { width: W, height: H } = this.state
    const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y))
    const box = { x, y, w: Math.min(W, Math.round(r.x + r.w)) - x, h: Math.min(H, Math.round(r.y + r.h)) - y }
    if (box.w < 1 || box.h < 1) return
    this.edit('Crop', 'all', () => {
      const layers = this.state.layers.map((l) => {
        const c = makeCanvas(box.w, box.h)
        ctx2d(c).drawImage(l.canvas, -box.x, -box.y)
        return { ...l, canvas: c }
      })
      const selection = this.state.selection ? cropMask(this.state.selection, W, box) : null
      return { layers, width: box.w, height: box.h, selection: selection && !isEmpty(selection) ? selection : null,
        cropRect: null }
    })
  }

  cropToSelection() {
    const { selection, width, height } = this.state
    const box = selection && maskBounds(selection, width, height)
    if (!box) return this.toast('Select something first')
    this.crop(box)
  }

  /** Crops away clear edges around everything visible */
  trim() {
    const box = contentBounds(readPixels(this.composite()))
    if (!box) return this.toast('The design is empty')
    if (box.w === this.state.width && box.h === this.state.height) return this.toast('Nothing to trim')
    this.crop(box)
  }

  /** Resamples every layer. Hard edges keep spot colors exact; smooth looks better on photos. */
  resize(width: number, height: number, mode: 'hard' | 'smooth', dpi = this.state.dpi) {
    width = Math.max(1, Math.round(width))
    height = Math.max(1, Math.round(height))
    this.edit('Resize', 'all', () => {
      const layers = this.state.layers.map((l) => ({ ...l, canvas: resizeCanvas(l.canvas, width, height, mode) }))
      return { layers, width, height, dpi, selection: null }
    })
  }

  /** Grows or shrinks the canvas around the design without scaling it, anchored in the middle */
  canvasSize(width: number, height: number) {
    const dx = Math.round((width - this.state.width) / 2), dy = Math.round((height - this.state.height) / 2)
    this.edit('Canvas size', 'all', () => {
      const layers = this.state.layers.map((l) => {
        const c = makeCanvas(width, height)
        ctx2d(c).drawImage(l.canvas, dx, dy)
        return { ...l, canvas: c }
      })
      return { layers, width, height, selection: null }
    })
  }

  setDpi(dpi: number) {
    this.edit('Print resolution', [], () => ({ dpi: Math.max(1, Math.round(dpi)) }))
  }

  // MARK: History

  undo() {
    this.endStroke()
    const s = this.history.undo(this.state)
    if (s) this.changed({ ...s, cropRect: null })
  }

  redo() {
    const s = this.history.redo(this.state)
    if (s) this.changed({ ...s, cropRect: null })
  }

  // MARK: Files

  async toProject(): Promise<ProjectFile> {
    const { name, width, height, dpi, activeId, layers, preview } = this.state
    return {
      app: 'ColorChute', version: 1, name, width, height, dpi, activeId, preview,
      layers: layers.map((l) => ({
        id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, png: l.canvas.toDataURL('image/png'),
      })),
    }
  }

  async loadProject(p: ProjectFile) {
    if (p.app !== 'ColorChute' || !Array.isArray(p.layers)) throw new Error('Not a ColorChute project')
    const layers: Layer[] = []
    for (const l of p.layers) {
      const canvas = makeCanvas(p.width, p.height)
      const blob = await (await fetch(l.png)).blob()
      const bmp = await createImageBitmap(blob)
      ctx2d(canvas).drawImage(bmp, 0, 0)
      bmp.close()
      layers.push({ id: l.id || newId(), name: l.name, visible: l.visible, opacity: l.opacity ?? 1, canvas })
    }
    this.history.clear()
    this.set({
      name: p.name || 'Untitled', width: p.width, height: p.height, dpi: p.dpi || DEFAULT_DPI, layers,
      activeId: layers.some((l) => l.id === p.activeId) ? p.activeId : layers[0].id, selection: null, cropRect: null,
      pixelsVersion: this.state.pixelsVersion + 1, dirty: false,
      ...(p.preview ? { preview: { ...this.state.preview, ...p.preview } } : {}),
    })
  }

  /** Swaps in another document, as when opening a saved color option. Clears the history. */
  replaceDocument(d: Pick<DocState, 'width' | 'height' | 'dpi' | 'layers' | 'activeId'>) {
    this.history.clear()
    this.set({ ...d, selection: null, cropRect: null, pixelsVersion: this.state.pixelsVersion + 1, dirty: false })
  }

  setName(name: string) {
    this.set({ name })
  }

  markSaved(name?: string) {
    this.set({ dirty: false, ...(name ? { name } : {}) })
  }
}

export function resizeCanvas(src: HTMLCanvasElement, w: number, h: number, mode: 'hard' | 'smooth'): HTMLCanvasElement {
  const out = makeCanvas(w, h)
  const g = ctx2d(out)
  if (mode === 'hard') {
    const img = readPixels(src)
    const r = resizeNearest(img, w, h)
    g.putImageData(new ImageData(r.data, w, h), 0, 0)
    return out
  }
  // Halving steps keep big reductions from going grainy
  let cur: HTMLCanvasElement = src
  while (cur.width / 2 > w && cur.height / 2 > h) {
    const half = makeCanvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2))
    const hg = ctx2d(half)
    hg.imageSmoothingQuality = 'high'
    hg.drawImage(cur, 0, 0, half.width, half.height)
    cur = half
  }
  g.imageSmoothingQuality = 'high'
  g.drawImage(cur, 0, 0, w, h)
  return out
}

/** The pixels of part of a canvas, for tests and tools that need them */
export function regionPixels(c: HTMLCanvasElement, r: Rect) {
  return cropPixels(readPixels(c), r)
}

export const editor = new Editor()

export function useEditor<T>(select: (s: EditorState) => T): T {
  return useSyncExternalStore(editor.subscribe, () => select(editor.state))
}

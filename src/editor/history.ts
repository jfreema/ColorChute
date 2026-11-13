import { ctx2d, Layer, makeCanvas, readPixels } from './doc'
import { diffBounds, Mask, Rect } from './pixels'

interface LayerMeta {
  id: string
  name: string
  visible: boolean
  opacity: number
}

/** Pixels saved for one layer: the whole layer, or just the part an edit changed */
interface Region {
  x: number
  y: number
  img: ImageData
}

/** What the document looked like before an edit */
export interface Snapshot {
  label: string
  width: number
  height: number
  activeId: string
  dpi: number
  meta: LayerMeta[]
  selection: Mask | null
  regions: Map<string, Region>
  /** True when the whole document is saved, as for crop and resize */
  full: boolean
}

export interface DocState {
  width: number
  height: number
  dpi: number
  layers: Layer[]
  activeId: string
  /** Selections are never changed in place, so the history can keep them as they are */
  selection: Mask | null
}

const MAX_ENTRIES = 60
const MAX_BYTES = 700 * 1024 * 1024

const bytesOf = (s: Snapshot) => [...s.regions.values()].reduce((n, r) => n + r.img.data.length, 0)

function metaOf(layers: Layer[]): LayerMeta[] {
  return layers.map(({ id, name, visible, opacity }) => ({ id, name, visible, opacity }))
}

/**
 * Undo and redo. Call `begin` before an edit with the layers it will touch, and `commit` after: the commit trims each
 * saved layer to the box that changed, so a bucket fill on a big print costs only what it filled.
 */
export class History {
  private undoStack: Snapshot[] = []
  private redoStack: Snapshot[] = []
  private pending: Snapshot | null = null

  get canUndo() {
    return this.undoStack.length > 0
  }
  get canRedo() {
    return this.redoStack.length > 0
  }
  get undoLabel() {
    return this.undoStack.at(-1)?.label
  }
  get redoLabel() {
    return this.redoStack.at(-1)?.label
  }

  capture(doc: DocState, label: string, layerIds: string[] | 'all', rect?: Rect): Snapshot {
    const full = layerIds === 'all'
    const ids = full ? doc.layers.map((l) => l.id) : layerIds
    const regions = new Map<string, Region>()
    for (const id of ids) {
      const layer = doc.layers.find((l) => l.id === id)
      if (!layer) continue
      if (rect && !full) {
        regions.set(id, { x: rect.x, y: rect.y, img: ctx2d(layer.canvas).getImageData(rect.x, rect.y, rect.w, rect.h) })
      } else {
        regions.set(id, { x: 0, y: 0, img: readPixels(layer.canvas) })
      }
    }
    return {
      label, width: doc.width, height: doc.height, dpi: doc.dpi, activeId: doc.activeId, meta: metaOf(doc.layers),
      selection: doc.selection, regions, full,
    }
  }

  begin(doc: DocState, label: string, layerIds: string[] | 'all' = []) {
    this.pending = this.capture(doc, label, layerIds)
  }

  /** Saves the pending snapshot, trimmed to what changed. Drops it if nothing did. */
  commit(doc: DocState) {
    const snap = this.pending
    this.pending = null
    if (!snap) return
    if (!snap.full && snap.width === doc.width && snap.height === doc.height) {
      for (const [id, region] of [...snap.regions]) {
        const layer = doc.layers.find((l) => l.id === id)
        if (!layer || region.img.width !== doc.width || region.img.height !== doc.height) continue
        const now = readPixels(layer.canvas)
        const box = diffBounds(region.img.data, now.data, doc.width, doc.height)
        if (!box) {
          snap.regions.delete(id)
          continue
        }
        const part = new ImageData(box.w, box.h)
        for (let y = 0; y < box.h; y++) {
          const start = ((box.y + y) * doc.width + box.x) * 4
          part.data.set(region.img.data.subarray(start, start + box.w * 4), y * box.w * 4)
        }
        snap.regions.set(id, { x: box.x, y: box.y, img: part })
      }
      const sameMeta = JSON.stringify(snap.meta) === JSON.stringify(metaOf(doc.layers))
      if (!snap.regions.size && sameMeta && snap.selection === doc.selection && snap.activeId === doc.activeId) return
    }
    this.push(snap)
  }

  cancel() {
    this.pending = null
  }

  /** Saves a snapshot taken by hand, for edits that know their own box */
  push(snap: Snapshot) {
    this.undoStack.push(snap)
    this.redoStack = []
    this.trim()
  }

  private trim() {
    let total = this.undoStack.reduce((n, s) => n + bytesOf(s), 0)
    while (this.undoStack.length > MAX_ENTRIES || (total > MAX_BYTES && this.undoStack.length > 1)) {
      total -= bytesOf(this.undoStack.shift()!)
    }
  }

  undo(doc: DocState): DocState | null {
    const snap = this.undoStack.pop()
    if (!snap) return null
    this.redoStack.push(this.inverse(doc, snap))
    return restore(doc, snap)
  }

  redo(doc: DocState): DocState | null {
    const snap = this.redoStack.pop()
    if (!snap) return null
    this.undoStack.push(this.inverse(doc, snap))
    return restore(doc, snap)
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.pending = null
  }

  /** The current state of whatever `snap` saved, so the step can be redone or undone again */
  private inverse(doc: DocState, snap: Snapshot): Snapshot {
    if (snap.full || snap.width !== doc.width || snap.height !== doc.height) {
      return this.capture(doc, snap.label, 'all')
    }
    const inv = this.capture(doc, snap.label, [])
    for (const [id, r] of snap.regions) {
      const layer = doc.layers.find((l) => l.id === id)
      if (!layer) continue
      inv.regions.set(id, {
        x: r.x, y: r.y, img: ctx2d(layer.canvas).getImageData(r.x, r.y, r.img.width, r.img.height),
      })
    }
    // A layer the snapshot brings back has no pixels now, so they're saved whole (as when deleting a layer)
    for (const l of doc.layers) {
      if (!snap.meta.some((m) => m.id === l.id) && !inv.regions.has(l.id)) {
        inv.regions.set(l.id, { x: 0, y: 0, img: readPixels(l.canvas) })
      }
    }
    return inv
  }
}

function restore(doc: DocState, snap: Snapshot): DocState {
  const byId = new Map(doc.layers.map((l) => [l.id, l]))
  const layers: Layer[] = snap.meta.map((m) => {
    let layer = byId.get(m.id)
    if (!layer) layer = { ...m, canvas: makeCanvas(snap.width, snap.height) }
    else layer = { ...layer, ...m }
    if (layer.canvas.width !== snap.width || layer.canvas.height !== snap.height) {
      layer.canvas = makeCanvas(snap.width, snap.height)
    }
    const r = snap.regions.get(m.id)
    if (r) ctx2d(layer.canvas).putImageData(r.img, r.x, r.y)
    return layer
  })
  return {
    width: snap.width, height: snap.height, dpi: snap.dpi, layers, activeId: snap.activeId, selection: snap.selection,
  }
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  /** 0–1 */
  opacity: number
  canvas: HTMLCanvasElement
}

let next = 1
export const newId = () => `L${Date.now().toString(36)}${(next++).toString(36)}`

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext('2d', { willReadFrequently: true })!
}

export function makeLayer(name: string, w: number, h: number): Layer {
  return { id: newId(), name, visible: true, opacity: 1, canvas: makeCanvas(w, h) }
}

export function readPixels(c: HTMLCanvasElement): ImageData {
  return ctx2d(c).getImageData(0, 0, c.width, c.height)
}

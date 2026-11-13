import { describe, expect, it } from 'vitest'
import {
  contentBounds, cropPixels, diffBounds, dominantColors, makePixels, paintMask, regionAt, replaceColor,
  resizeNearest, strokeLine, Pixels,
} from '../editor/pixels'
import { RGBA } from '../lib/color'

function fill(px: Pixels, x: number, y: number, w: number, h: number, c: RGBA) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) px.data.set(c, (yy * px.width + xx) * 4)
}
const RED: RGBA = [200, 0, 0, 255]
const BLUE: RGBA = [0, 0, 200, 255]
const count = (m: Uint8Array) => m.reduce((n, v) => n + (v ? 1 : 0), 0)

describe('regionAt', () => {
  it('fills only the connected area', () => {
    const px = makePixels(10, 10)
    fill(px, 0, 0, 3, 3, RED)
    fill(px, 7, 7, 3, 3, RED)
    expect(count(regionAt(px, 1, 1, 0, true))).toBe(9)
    expect(count(regionAt(px, 1, 1, 0, false))).toBe(18)
  })

  it('goes around corners in a U shape', () => {
    const px = makePixels(5, 5)
    fill(px, 0, 0, 5, 5, BLUE)
    fill(px, 1, 0, 3, 4, RED) // a red block with a blue U around it from below
    const m = regionAt(px, 0, 0, 0, true)
    expect(count(m)).toBe(25 - 12)
  })

  it('respects tolerance', () => {
    const px = makePixels(4, 1)
    px.data.set([100, 100, 100, 255, 110, 100, 100, 255, 130, 100, 100, 255, 100, 100, 100, 255])
    expect(count(regionAt(px, 0, 0, 10, true))).toBe(2)
    expect(count(regionAt(px, 0, 0, 10, false))).toBe(3)
  })

  it('treats all clear pixels alike', () => {
    const px = makePixels(3, 1)
    px.data.set([255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 255])
    expect(count(regionAt(px, 0, 0, 0, true))).toBe(2)
  })
})

describe('paint and replace', () => {
  it('paints inside the selection only', () => {
    const px = makePixels(4, 4)
    const mask = new Uint8Array(16).fill(255)
    const sel = new Uint8Array(16)
    sel[5] = 255
    const box = paintMask(px, mask, RED, sel)
    expect(box).toEqual({ x: 1, y: 1, w: 1, h: 1 })
    expect([...px.data.subarray(20, 24)]).toEqual(RED)
  })

  it('replaces a color and keeps alpha', () => {
    const px = makePixels(2, 1)
    px.data.set([200, 0, 0, 128, 0, 200, 0, 255])
    expect(replaceColor(px, RED, BLUE, 0, null)).toBe(1)
    expect([...px.data]).toEqual([0, 0, 200, 128, 0, 200, 0, 255])
  })

  it('strokes without gaps', () => {
    const px = makePixels(20, 3)
    strokeLine(px, 0.5, 1.5, 19.5, 1.5, 1, RED, null)
    for (let x = 0; x < 20; x++) expect(px.data[(20 + x) * 4 + 3]).toBe(255)
  })
})

describe('geometry', () => {
  it('finds content and diff bounds', () => {
    const px = makePixels(10, 10)
    fill(px, 2, 3, 4, 2, RED)
    expect(contentBounds(px)).toEqual({ x: 2, y: 3, w: 4, h: 2 })
    const before = new Uint8ClampedArray(px.data)
    fill(px, 8, 8, 1, 1, BLUE)
    expect(diffBounds(before, px.data, 10, 10)).toEqual({ x: 8, y: 8, w: 1, h: 1 })
  })

  it('crops and resizes without new colors', () => {
    const px = makePixels(4, 4)
    fill(px, 0, 0, 2, 4, RED)
    fill(px, 2, 0, 2, 4, BLUE)
    const c = cropPixels(px, { x: 1, y: 1, w: 2, h: 2 })
    expect([...c.data.subarray(0, 4)]).toEqual(RED)
    expect([...c.data.subarray(4, 8)]).toEqual(BLUE)
    const big = resizeNearest(px, 7, 7)
    const colors = new Set<string>()
    for (let i = 0; i < big.data.length; i += 4) colors.add(big.data.subarray(i, i + 4).join())
    expect(colors.size).toBe(2)
  })

  it('finds the main colors', () => {
    const px = makePixels(100, 100)
    fill(px, 0, 0, 100, 60, RED)
    fill(px, 0, 60, 100, 40, BLUE)
    px.data.set([201, 1, 0, 255], 0)
    const colors = dominantColors(px)
    expect(colors.map((c) => c.hex)).toEqual(['#C80000', '#0000C8'])
    expect(colors[0].share).toBeCloseTo(0.6, 2)
  })
})

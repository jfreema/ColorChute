import { describe, expect, it } from 'vitest'
import { combine, growMask, invertMask, maskBounds, outlineSegments, rectMask, shrinkMask } from '../editor/selection'

const count = (m: Uint8Array) => m.reduce((n, v) => n + (v ? 1 : 0), 0)

describe('selection', () => {
  it('makes and inverts rects', () => {
    const m = rectMask(10, 10, { x: 2, y: 2, w: 3, h: 4 })
    expect(count(m)).toBe(12)
    expect(count(invertMask(m))).toBe(88)
    expect(maskBounds(m, 10, 10)).toEqual({ x: 2, y: 2, w: 3, h: 4 })
  })

  it('combines', () => {
    const a = rectMask(10, 1, { x: 0, y: 0, w: 5, h: 1 })
    const b = rectMask(10, 1, { x: 3, y: 0, w: 5, h: 1 })
    expect(count(combine(a, b, 'add'))).toBe(8)
    expect(count(combine(a, b, 'subtract'))).toBe(3)
    expect(count(combine(a, b, 'intersect'))).toBe(2)
    expect(count(combine(null, b, 'subtract'))).toBe(0)
  })

  it('grows roughly round and shrinks back', () => {
    const m = new Uint8Array(41 * 41)
    m[20 * 41 + 20] = 255
    const g = growMask(m, 41, 41, 10)
    expect(maskBounds(g, 41, 41)).toEqual({ x: 10, y: 10, w: 21, h: 21 })
    // Rounder than a square: the corner stays out
    expect(g[10 * 41 + 10]).toBe(0)
    const sq = rectMask(41, 41, { x: 10, y: 10, w: 21, h: 21 })
    expect(maskBounds(shrinkMask(sq, 41, 41, 5), 41, 41)).toEqual({ x: 15, y: 15, w: 11, h: 11 })
  })

  it('outlines a rect with four joined segments', () => {
    const m = rectMask(6, 6, { x: 1, y: 1, w: 3, h: 2 })
    expect(Array.from(outlineSegments(m, 6, 6))).toEqual([1, 1, 4, 1, 1, 3, 4, 3, 1, 1, 1, 3, 4, 1, 4, 3])
  })
})

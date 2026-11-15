import { describe, expect, it } from 'vitest'
import { CAMO_CELLS, camoCells, camoPath } from '../lib/camo'
import { SHIRT_COLLECTIONS, shirtBackground, shirtCamo } from '../lib/palettes'

describe('digital camo', () => {
  it('is the same pattern every time, with about half the cells dark', () => {
    const a = camoCells(), b = camoCells()
    expect(a).toEqual(b)
    const dark = a.reduce((n, c) => n + c, 0) / a.length
    expect(dark).toBeGreaterThan(0.44)
    expect(dark).toBeLessThan(0.5)
  })

  it('draws exactly the dark cells', () => {
    const cells = camoCells()
    const drawn = new Uint8Array(cells.length)
    for (const [, x, y, w] of camoPath().matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      for (let i = 0; i < Number(w); i++) drawn[Number(y) * CAMO_CELLS + Number(x) + i]++
    }
    expect(drawn).toEqual(cells)
  })
})

describe('patterned shirt colors', () => {
  const plain = SHIRT_COLLECTIONS.flatMap((c) => c.colors).filter((s) => !s.camo).map((s) => s.hex.toUpperCase())
  const camo = SHIRT_COLLECTIONS.flatMap((c) => c.colors).filter((s) => s.camo)

  it("don't share a hex with any solid shirt, so the preview knows which ones get camo", () => {
    expect(camo.length).toBeGreaterThan(0)
    for (const s of camo) expect(plain).not.toContain(s.hex.toUpperCase())
    expect(new Set(camo.map((s) => s.hex.toUpperCase())).size).toBe(camo.length)
  })

  it('find their camo color and background', () => {
    const red = camo.find((s) => s.name === 'True Red')!
    expect(shirtCamo(red.hex.toLowerCase())).toBe(red.camo)
    expect(shirtBackground(red.hex)).toContain('url(')
    expect(shirtCamo('#123456')).toBeUndefined()
    expect(shirtBackground('#123456')).toBe('#123456')
  })
})

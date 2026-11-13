import { describe, expect, it } from 'vitest'
import { orderNote, shirtChecks, worst } from '../editor/checks'
import { makePixels, Pixels } from '../editor/pixels'

function box(px: Pixels, x: number, y: number, w: number, h: number, c: number[]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px.data.set(c, (yy * px.width + xx) * 4)
}
const byLabel = (px: Pixels, dpi = 300) => Object.fromEntries(shirtChecks(px, dpi).map((c) => [c.label, c.status]))

describe('shirt checks', () => {
  it('passes a good 2700 px design with 2 Epic inks', () => {
    const px = makePixels(2700, 1000)
    box(px, 100, 100, 1000, 800, [0xaf, 0x00, 0x11, 255]) // Red
    box(px, 1200, 100, 1000, 800, [0x0a, 0x20, 0x41, 255]) // Navy
    expect(worst(shirtChecks(px, 300))).toBe('pass')
  })

  it("warns on an ink that isn't on Epic's wheel, naming the closest", () => {
    const px = makePixels(2700, 1000)
    box(px, 100, 100, 1000, 800, [0xf4, 0x5b, 0x5b, 255]) // coral
    box(px, 1200, 100, 1000, 800, [0, 0, 0, 255])
    const c = shirtChecks(px, 300).find((x) => x.label === 'Epic colors')
    expect(c?.status).toBe('warn')
    expect(c?.detail).toContain('#F45B5B')
    expect(c?.detail).toContain('closest: Red')
  })

  it('blocks oversize and undersize art', () => {
    expect(byLabel(makePixels(3400, 100)).Size).toBe('block')
    expect(byLabel(makePixels(1400, 100))['Long side']).toBe('block')
    expect(byLabel(makePixels(2000, 100))['Long side']).toBe('warn')
  })

  it('counts inks and warns on a background box', () => {
    const px = makePixels(1600, 1600)
    box(px, 0, 0, 1600, 1600, [255, 255, 255, 255])
    const colors = [[200, 0, 0, 255], [0, 200, 0, 255], [0, 0, 200, 255], [90, 90, 0, 255]]
    colors.forEach((c, i) => box(px, 100 + i * 300, 100, 200, 200, c))
    const r = byLabel(px)
    expect(r.Background).toBe('warn')
    expect(r.Inks).toBe('block')
  })

  it('warns on see-through areas inside the art', () => {
    const px = makePixels(1600, 100)
    box(px, 10, 10, 500, 80, [0, 0, 0, 128])
    expect(byLabel(px)['See-through areas']).toBe('warn')
  })

  it('fills in the order note', () => {
    const note = orderNote(2700, 1500, [{ name: 'Navy', hex: '#1F2A44' }, { hex: '#FFFFFF' }])
    expect(note).toContain('2700 x 1500 px at 300 DPI (9 x 5 in)')
    expect(note).toContain('- Navy: #1F2A44\n- Ink 2: #FFFFFF')
  })
})

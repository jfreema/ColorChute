import { describe, expect, it } from 'vitest'
import { INK_COLLECTIONS, inkColorName } from '../lib/palettes'

describe('print color groups', () => {
  it('have no repeated colors or names inside a group', () => {
    for (const c of INK_COLLECTIONS) {
      expect(new Set(c.colors.map((s) => s.hex.toUpperCase())).size, c.name).toBe(c.colors.length)
      expect(new Set(c.colors.map((s) => s.name)).size, c.name).toBe(c.colors.length)
    }
  })

  it('include the themed palettes, with at least 16 pastels', () => {
    const themes = INK_COLLECTIONS.filter((c) => c.theme).map((c) => c.name)
    expect(themes).toEqual(['Pastels', '1980s', '1970s', 'BeastPrime'])
    expect(INK_COLLECTIONS.find((c) => c.id === 'pastels')!.colors.length).toBeGreaterThanOrEqual(16)
  })

  it('name a color from the chosen group first', () => {
    expect(inkColorName('#00BCE7', 'beastprime')?.name).toBe('Beast Blue')
    expect(inkColorName('#DA9100', '1970s')?.name).toBe('Harvest Gold')
  })
})

import { describe, expect, it } from 'vitest'
import { deltaE } from '../lib/color'
import { cleanCustomColors, MAX_CUSTOM_COLORS, UNNAMED_CUSTOM } from '../lib/customColorList'
import { CUSTOM_STARTERS, INK_COLLECTIONS, inkColorName, withCustomColors } from '../lib/palettes'

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

describe('Custom colors', () => {
  it('start with the photo colors, none of them near another', () => {
    const custom = INK_COLLECTIONS.find((c) => c.id === 'custom')!
    expect(custom.custom && !custom.theme).toBe(true)
    expect(custom.colors).toBe(CUSTOM_STARTERS)
    expect(CUSTOM_STARTERS.length).toBe(15)
    for (const a of CUSTOM_STARTERS) {
      for (const b of CUSTOM_STARTERS) if (a !== b) expect(deltaE(a.hex, b.hex), `${a.name} / ${b.name}`).toBeGreaterThan(10)
    }
  })

  it('swap in the account’s own list and name colors from it', () => {
    const mine = [{ name: 'Team Teal', hex: '#00A0A0' }]
    const groups = withCustomColors(mine)
    expect(groups.find((c) => c.id === 'custom')!.colors).toBe(mine)
    expect(groups.find((c) => c.id === 'epic')).toBe(INK_COLLECTIONS[0])
    expect(inkColorName('#00A0A0', 'custom', groups)?.name).toBe('Team Teal')
  })

  it('save only clean lists', () => {
    expect(cleanCustomColors('nope')).toBeNull()
    expect(cleanCustomColors([
      { name: ' Sky ', hex: '#7bb1c8' }, { name: 'Again', hex: '#7BB1C8' }, { hex: 'red' }, null, { hex: '#123456' },
    ])).toEqual([{ name: 'Sky', hex: '#7BB1C8' }, { name: UNNAMED_CUSTOM, hex: '#123456' }])
    const many = Array.from({ length: MAX_CUSTOM_COLORS + 5 }, (_, i) => ({ name: '', hex: `#${i.toString(16).padStart(6, '0')}` }))
    expect(cleanCustomColors(many)!.length).toBe(MAX_CUSTOM_COLORS)
  })
})

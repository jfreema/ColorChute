import { describe, expect, it } from 'vitest'
import { buildLink, parseLink } from '../editor/links'
import type { PreviewSettings } from '../editor/store'

const preview: PreviewSettings = {
  mode: 'realistic', boardColor: '#FFFFFF', shirtColor: '#0A2041', stageColor: '#DCE6FF', sizeMode: 'actual',
}

describe('design links', () => {
  it('round-trips the option, background and view', () => {
    const href = buildLink('https://cc.example', 's', 'Ab_c-123', {
      option: 'Lmhz1', preview, frame: { x: -120.4, y: 30.6, w: 1600, h: 900.2 },
    })
    expect(href).toBe('https://cc.example/s/Ab_c-123?option=Lmhz1&bg=realistic&shirt=0a2041&behind=dce6ff&view=-120,31,1600,900')
    const link = parseLink(href)!
    expect(link.kind).toBe('s')
    expect(link.id).toBe('Ab_c-123')
    expect(link.option).toBe('Lmhz1')
    expect(link.preview).toEqual({ mode: 'realistic', sizeMode: 'actual', shirtColor: '#0A2041', stageColor: '#DCE6FF' })
    expect(link.frame).toEqual({ x: -120, y: 31, w: 1600, h: 900 })
  })

  it('sends the square color, or clear for a checkerboard, and only fill-chest print size', () => {
    const sq = parseLink(buildLink('https://x.y', 'p', 'pub1', { preview: { ...preview, mode: 'square', boardColor: 'transparent' } }))!
    expect(sq.kind).toBe('p')
    expect(sq.preview).toEqual({ mode: 'square', boardColor: 'transparent', stageColor: '#DCE6FF' })
    expect(sq.frame).toBeUndefined()
    const fill = parseLink(buildLink('https://x.y', 'p', 'pub1', { preview: { ...preview, mode: 'shirt', sizeMode: 'fit' } }))!
    expect(fill.preview.sizeMode).toBe('fit')
  })

  it('ignores addresses that are not links and settings that are bad', () => {
    expect(parseLink('https://x.y/')).toBeNull()
    expect(parseLink('https://x.y/s/')).toBeNull()
    expect(parseLink('https://x.y/s/a/b')).toBeNull()
    expect(parseLink('https://x.y/s/bad%20id')).toBeNull()
    const link = parseLink('https://x.y/s/tok?bg=moon&shirt=red&behind=12345&view=1,2,0,4&option=../x')!
    expect(link).toEqual({ kind: 's', id: 'tok', preview: {} })
  })
})

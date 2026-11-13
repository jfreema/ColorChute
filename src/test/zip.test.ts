import { describe, expect, it } from 'vitest'
import { makeZip } from '../lib/zip'
import { slug } from '../lib/printSpecs'

describe('zip', () => {
  it('writes a readable stored zip', async () => {
    const blob = makeZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }])
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const v = new DataView(bytes.buffer)
    expect(v.getUint32(0, true)).toBe(0x04034b50)
    expect(new TextDecoder().decode(bytes.subarray(35, 40))).toBe('hello')
    expect(v.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
  })

  it('slugs names', () => {
    expect(slug('Cyclone', 'Script', 'Blue / Gray')).toBe('cyclone-script-blue-gray')
  })
})

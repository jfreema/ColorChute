import { describe, expect, it } from 'vitest'
import { crc32, readPngDpi, setPngDpi } from '../lib/png'

// A 1x1 PNG
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

describe('png', () => {
  it('computes crc32', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082)
  })

  it('writes and reads dpi', () => {
    expect(readPngDpi(PNG)).toBeNull()
    const out = setPngDpi(PNG, 300)
    expect(readPngDpi(out)).toBe(300)
    expect(readPngDpi(setPngDpi(out, 150))).toBe(150)
    expect(out.length).toBe(PNG.length + 21)
  })
})

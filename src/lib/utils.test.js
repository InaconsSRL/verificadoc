import { describe, it, expect } from 'vitest'
import { addDiasHabiles, getPngDimensions, logoTransformFromBuffer } from './utils'

/** Construye un ArrayBuffer PNG mínimo con dimensiones IHDR dadas. */
function makePngBuffer(width, height) {
  const buf = new ArrayBuffer(24)
  const view = new DataView(buf)
  view.setUint32(0, 0x89504e47) // PNG signature
  view.setUint32(16, width)
  view.setUint32(20, height)
  return buf
}

describe('getPngDimensions', () => {
  it('reads width and height from IHDR bytes', () => {
    expect(getPngDimensions(makePngBuffer(200, 80))).toEqual({ width: 200, height: 80 })
  })

  it('returns null for buffer too short', () => {
    expect(getPngDimensions(new ArrayBuffer(8))).toBeNull()
  })

  it('returns null when signature is invalid', () => {
    expect(getPngDimensions(new ArrayBuffer(24))).toBeNull()
  })
})

describe('logoTransformFromBuffer', () => {
  it('keeps fixed height and scales width proportionally', () => {
    expect(logoTransformFromBuffer(makePngBuffer(200, 80), 56)).toEqual({ width: 140, height: 56 })
  })

  it('falls back to 2:1 when dimensions cannot be read', () => {
    expect(logoTransformFromBuffer(new ArrayBuffer(0), 56)).toEqual({ width: 112, height: 56 })
  })
})

describe('addDiasHabiles', () => {
  // ── Happy path ──────────────────────────────────────────────

  it('adds 1 business day from a weekday', () => {
    // Mon 2024-01-08 + 1 = Tue 2024-01-09
    expect(addDiasHabiles('2024-01-08', 1)).toBe('2024-01-09')
  })

  it('skips the weekend when adding 1 day from Friday', () => {
    // Fri 2024-01-05 + 1 = Mon 2024-01-08
    expect(addDiasHabiles('2024-01-05', 1)).toBe('2024-01-08')
  })

  it('adds 2 business days from Friday, landing on Tuesday', () => {
    // Fri 2024-01-05 + 2 = Tue 2024-01-09
    expect(addDiasHabiles('2024-01-05', 2)).toBe('2024-01-09')
  })

  it('returns the input date when dias is 0', () => {
    expect(addDiasHabiles('2024-01-08', 0)).toBe('2024-01-08')
  })

  it('adds 6 días hábiles crossing a weekend (CP preaviso scenario)', () => {
    // Wed 2024-01-10 + 6 = Thu 2024-01-18
    expect(addDiasHabiles('2024-01-10', 6)).toBe('2024-01-18')
  })

  it('handles spans that cross multiple weekends', () => {
    // Thu 2024-01-11 + 10 = Thu 2024-01-25
    expect(addDiasHabiles('2024-01-11', 10)).toBe('2024-01-25')
  })

  // ── Bad fechaStr — throws RangeError ───────────────────────
  // Invalid Date causes the loop to run (NaN !== 0 && NaN !== 6 is true)
  // and then d.toISOString() throws RangeError: Invalid time value.

  it('throws RangeError when fechaStr is null', () => {
    expect(() => addDiasHabiles(null, 5)).toThrow(RangeError)
  })

  it('throws RangeError when fechaStr is empty string', () => {
    expect(() => addDiasHabiles('', 5)).toThrow(RangeError)
  })

  it('throws RangeError when fechaStr is undefined', () => {
    expect(() => addDiasHabiles(undefined, 5)).toThrow(RangeError)
  })

  it('throws RangeError when fechaStr is not a valid date string', () => {
    expect(() => addDiasHabiles('not-a-date', 5)).toThrow(RangeError)
  })

  // ── Bad dias — silent fallback ─────────────────────────────
  // When dias is null/undefined/NaN, the while condition (0 < dias) is
  // false immediately, so the loop never runs and the input date is returned.

  it('returns input date unchanged when dias is null', () => {
    expect(addDiasHabiles('2024-01-08', null)).toBe('2024-01-08')
  })

  it('returns input date unchanged when dias is undefined', () => {
    expect(addDiasHabiles('2024-01-08', undefined)).toBe('2024-01-08')
  })

  it('returns input date unchanged when dias is NaN', () => {
    expect(addDiasHabiles('2024-01-08', NaN)).toBe('2024-01-08')
  })
})

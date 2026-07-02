import { describe, it, expect } from 'vitest'
import { validarFechasEmision } from './validacionesEmitir'

const TRAB = { fecha_ingreso: '2024-03-01' }

describe('validarFechasEmision', () => {
  it('returns no errors for coherent dates', () => {
    expect(validarFechasEmision('CT', TRAB, { fecha_cese: '2026-01-15' })).toEqual([])
    expect(validarFechasEmision('SU', TRAB, {
      fecha_falta: '2026-05-01',
      fecha_inicio_suspension: '2026-05-05',
    })).toEqual([])
  })

  it('rejects cese before ingreso', () => {
    const errores = validarFechasEmision('CT', TRAB, { fecha_cese: '2023-12-31' })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toMatch(/cese.*ingreso/)
  })

  it('rejects falta before ingreso', () => {
    const errores = validarFechasEmision('AM', TRAB, { fecha_falta: '2024-02-01' })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toMatch(/falta.*ingreso/)
  })

  it('rejects suspension start before falta date', () => {
    const errores = validarFechasEmision('SU', TRAB, {
      fecha_falta: '2026-05-10',
      fecha_inicio_suspension: '2026-05-01',
    })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toMatch(/suspensión.*falta/)
  })

  it('rejects CD cese before falta date', () => {
    const errores = validarFechasEmision('CD', TRAB, {
      fecha_falta: '2026-05-10',
      fecha_cese: '2026-05-01',
    })
    expect(errores).toHaveLength(1)
    expect(errores[0]).toMatch(/cese.*falta/)
  })

  it('accumulates multiple errors', () => {
    const errores = validarFechasEmision('CD', TRAB, {
      fecha_falta: '2024-01-01',
      fecha_cese: '2023-06-01',
    })
    expect(errores.length).toBeGreaterThanOrEqual(2)
  })

  it('ignores missing dates without throwing', () => {
    expect(validarFechasEmision('CT', {}, {})).toEqual([])
    expect(validarFechasEmision('CL', { fecha_ingreso: '2024-01-01' }, {})).toEqual([])
  })
})

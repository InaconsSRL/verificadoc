import { describe, it, expect } from 'vitest'
import { getLogoUrl } from './logosEmpresa'

describe('getLogoUrl', () => {
  it('returns a logo for empresas with archivo cargado', () => {
    expect(getLogoUrl({ ruc: '20568587767' })).toBeTruthy()
    expect(getLogoUrl({ ruc: '20605665269' })).toBeTruthy()
    expect(getLogoUrl({ ruc: '20605665251' })).toBeTruthy()
    expect(getLogoUrl({ ruc: '20606360453' })).toBeTruthy()
  })

  it('returns null for empresas sin logo', () => {
    expect(getLogoUrl({ ruc: '20604890862' })).toBeNull() // INDAGO
    expect(getLogoUrl(null)).toBeNull()
  })
})

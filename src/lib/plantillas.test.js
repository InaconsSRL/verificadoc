import { describe, it, expect } from 'vitest'
import { renderPlantilla, contextoDocumento, PLANTILLAS_BASE, PLACEHOLDERS } from './plantillas'

const DOC = {
  nombre_trabajador:       'LÓPEZ GARCÍA, MARÍA',
  dni_trabajador:          '87654321',
  cargo:                   'Analista',
  fecha_ingreso:           '2024-01-15',
  fecha_cese:              '2026-05-20',
  motivo_cese:             'renuncia_voluntaria',
  fecha_falta:             '2026-05-04',
  descripcion_falta:       'Llegó tarde sin justificación.',
  dias_suspension:         2,
  fecha_inicio_suspension: '2026-05-11',
}

const EMPRESA = { razon_social: 'Acme S.A.', ruc: '20123456789' }

describe('renderPlantilla', () => {
  it('replaces worker, company, and date placeholders', () => {
    const out = renderPlantilla(
      '{{trabajador}} ({{dni}}) trabaja en {{empresa}} desde el {{fecha_ingreso}}.',
      DOC, EMPRESA
    )
    expect(out).toBe('LÓPEZ GARCÍA, MARÍA (87654321) trabaja en Acme S.A. desde el 15 de enero de 2024.')
  })

  it('computes derived dates: fin de suspensión and límite de descargos', () => {
    const ctx = contextoDocumento(DOC, EMPRESA)
    // 2026-05-11 (lunes) + 1 día hábil adicional = 2026-05-12
    expect(ctx.fecha_fin_suspension).toBe('12 de mayo de 2026')
    // 2026-05-04 (lunes) + 6 días hábiles = 2026-05-12
    expect(ctx.fecha_limite_descargos).toBe('12 de mayo de 2026')
  })

  it('translates motivo_cese value to its label', () => {
    const ctx = contextoDocumento(DOC, EMPRESA)
    expect(ctx.motivo_cese).toBe('Renuncia voluntaria')
  })

  it('leaves unknown tokens visible instead of hiding the error', () => {
    const out = renderPlantilla('Hola {{token_inexistente}}.', DOC, EMPRESA)
    expect(out).toBe('Hola {{token_inexistente}}.')
  })

  it('tolerates spaces inside the braces', () => {
    expect(renderPlantilla('{{ trabajador }}', DOC, EMPRESA)).toBe('LÓPEZ GARCÍA, MARÍA')
  })

  it('uses em-dash for missing values', () => {
    const out = renderPlantilla('{{fecha_cese}} / {{descripcion_falta}}', {}, {})
    expect(out).toBe('— / —')
  })

  it('renders every base template without leaving placeholders behind', () => {
    for (const [tipo, texto] of Object.entries(PLANTILLAS_BASE)) {
      const out = renderPlantilla(texto, DOC, EMPRESA)
      expect(out, `plantilla ${tipo}`).not.toMatch(/\{\{/)
    }
  })

  it('every documented placeholder resolves in the context', () => {
    const ctx = contextoDocumento(DOC, EMPRESA)
    for (const { token } of PLACEHOLDERS) {
      expect(ctx[token], `placeholder ${token}`).toBeDefined()
    }
  })
})

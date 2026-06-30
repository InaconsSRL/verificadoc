import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { calcTiempoServicios, generarDocx } from './generarDocx'
import { Packer } from 'docx'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,fakeQR')
  }
}))

vi.mock('docx', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Packer: {
      toBlob: vi.fn().mockResolvedValue(new Blob(['']))
    }
  }
})

beforeAll(() => {
  global.fetch = vi.fn().mockResolvedValue({
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
  })
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
  global.URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ── calcTiempoServicios ─────────────────────────────────────────

describe('calcTiempoServicios', () => {
  // Happy path
  it('computes years, months and days correctly', () => {
    expect(calcTiempoServicios('2020-03-15', '2023-06-20')).toBe('3 años, 3 meses y 5 días')
  })

  it('returns singular "año" for exactly 1 year', () => {
    expect(calcTiempoServicios('2020-01-01', '2021-01-01')).toBe('1 año')
  })

  it('returns singular "mes" for exactly 1 month', () => {
    expect(calcTiempoServicios('2020-01-01', '2020-02-01')).toBe('1 mes')
  })

  it('returns "menos de un día" when ingreso equals cese', () => {
    expect(calcTiempoServicios('2020-06-01', '2020-06-01')).toBe('menos de un día')
  })

  it('uses singular "año" and "día" in a two-part result', () => {
    expect(calcTiempoServicios('2023-01-05', '2024-01-06')).toBe('1 año y 1 día')
  })

  it('applies month-borrow when cese day is less than ingreso day', () => {
    // 2020-06-15 → 2024-01-01 = 3 años, 6 meses y 17 días
    expect(calcTiempoServicios('2020-06-15', '2024-01-01')).toBe('3 años, 6 meses y 17 días')
  })

  // Bad input — parseFecha returns null, function returns '—'
  it('returns "—" when ingreso is null', () => {
    expect(calcTiempoServicios(null, '2020-01-01')).toBe('—')
  })

  it('returns "—" when cese is null', () => {
    expect(calcTiempoServicios('2020-01-01', null)).toBe('—')
  })

  it('returns "—" when both arguments are null', () => {
    expect(calcTiempoServicios(null, null)).toBe('—')
  })

  it('returns "—" when ingreso is undefined', () => {
    expect(calcTiempoServicios(undefined, '2020-01-01')).toBe('—')
  })

  it('returns "—" when ingreso is an empty string', () => {
    expect(calcTiempoServicios('', '2020-01-01')).toBe('—')
  })

  // Known bug: when ingreso is after cese, the negative years component
  // is silently dropped and months/days may still produce a positive result.
  it('returns nonsensical output (not "—") when ingreso is after cese', () => {
    const result = calcTiempoServicios('2024-06-01', '2024-01-01')
    // BUG: should guard against negative duration and return '—'
    expect(result).not.toBe('—')
  })
})

// ── generarDocx ─────────────────────────────────────────────────

const mockEmpresa = {
  razon_social: 'INACONS S.R.L.',
  ruc: '20568587767',
  prefijo: 'INS',
  direccion: 'Av. Principal 123',
  representante: 'Juan Perez',
  cargo_rep: 'Gerente General',
}

const mockDocBase = {
  id: 'abc-111-222',
  correlativo: 'INS-CT-2024-0001',
  tipo: 'CT',
  nombre_trabajador: 'María García',
  cargo: 'Asistente de RRHH',
  dni_trabajador: '12345678',
  fecha_ingreso: '2020-01-15',
  fecha_cese: '2024-06-30',
  fecha_emision: '2024-07-01',
  motivo_cese: 'renuncia_voluntaria',
}

describe('generarDocx', () => {
  // Happy path
  it('CT: builds document and triggers download', async () => {
    await generarDocx(mockDocBase, mockEmpresa)
    expect(Packer.toBlob).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('CL: builds document without throwing', async () => {
    await generarDocx(
      { ...mockDocBase, tipo: 'CL', correlativo: 'INS-CL-2024-0001' },
      mockEmpresa
    )
    expect(Packer.toBlob).toHaveBeenCalledOnce()
  })

  it('AM: uses the "otros" branch without throwing', async () => {
    await generarDocx({
      ...mockDocBase,
      tipo: 'AM',
      correlativo: 'INS-AM-2024-0001',
      fecha_falta: '2024-06-01',
      descripcion_falta: 'Llegó tarde reiteradamente.',
    }, mockEmpresa)
    expect(Packer.toBlob).toHaveBeenCalledOnce()
  })

  it('SU: passes dias_suspension to the otros branch', async () => {
    await generarDocx({
      ...mockDocBase,
      tipo: 'SU',
      correlativo: 'INS-SU-2024-0001',
      fecha_falta: '2024-06-01',
      descripcion_falta: 'Falta grave.',
      dias_suspension: 3,
      fecha_inicio_suspension: '2024-06-10',
    }, mockEmpresa)
    expect(Packer.toBlob).toHaveBeenCalledOnce()
  })

  it('sets the download attribute to correlativo + ".docx"', async () => {
    const spy = vi.spyOn(document.body, 'appendChild')
    await generarDocx(mockDocBase, mockEmpresa)
    const anchor = spy.mock.calls[0][0]
    expect(anchor.download).toBe('INS-CT-2024-0001.docx')
  })

  it('cleans up the blob URL after download', async () => {
    await generarDocx(mockDocBase, mockEmpresa)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('does not crash when empresa is null', async () => {
    await expect(generarDocx(mockDocBase, null)).resolves.toBeUndefined()
  })

  it('does not crash when extras is omitted', async () => {
    await expect(generarDocx(mockDocBase, mockEmpresa)).resolves.toBeUndefined()
  })

  it('does not crash when extras fields are empty strings', async () => {
    await expect(
      generarDocx(mockDocBase, mockEmpresa, {
        cuerpoOverride: '',
        lugarFechaOverride: '',
        observaciones: '',
      })
    ).resolves.toBeUndefined()
  })

  // Bad input — crash cases
  it('throws TypeError when doc is null', async () => {
    await expect(generarDocx(null, mockEmpresa)).rejects.toThrow(TypeError)
  })

  it('throws TypeError when doc.tipo is undefined (titulo.toUpperCase fails)', async () => {
    // TITULOS[undefined] ?? undefined = undefined, then undefined.toUpperCase() throws
    await expect(
      generarDocx({ id: 'x', correlativo: 'X-0001' }, mockEmpresa)
    ).rejects.toThrow(TypeError)
  })
})

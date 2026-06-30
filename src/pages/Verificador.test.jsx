import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Verificar from './Verificador'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const VALID_UUID  = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const MOCK_EMPRESA = { razon_social: 'Acme S.A.', ruc: '20123456789' }
const MOCK_DOC_BASE = {
  id: VALID_UUID,
  correlativo: 'INS-CT-0001',
  tipo: 'CT',
  nombre_trabajador: 'María López',
  cargo: 'Analista',
  fecha_ingreso: '2020-01-15',
  fecha_cese: null,
  fecha_emision: '2025-06-15',
  empresa_id: 'emp-uuid-1',
}

function mockDocFetch(docResult) {
  supabase.from.mockImplementation((table) => {
    if (table === 'documentos_publicos') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(docResult),
          }),
        }),
      }
    }
    // empresas fetch (only reached on success)
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: MOCK_EMPRESA, error: null }),
        }),
      }),
    }
  })
}

function renderVerificador(uuid = VALID_UUID) {
  return render(
    <MemoryRouter initialEntries={[`/verificar/${uuid}`]}>
      <Routes>
        <Route path="/verificar/:uuid" element={<Verificar />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── valid document ───────────────────────────────────────────

describe('valid document', () => {
  it('shows the authenticated badge, worker name, and correlativo', async () => {
    mockDocFetch({ data: { ...MOCK_DOC_BASE, estado: 'activo' }, error: null })
    renderVerificador()

    expect(await screen.findByText('Documento válido y auténtico')).not.toBeNull()
    expect(screen.getByText('María López')).not.toBeNull()
    expect(screen.getByText('INS-CT-0001')).not.toBeNull()
    expect(screen.getByText('Acme S.A.')).not.toBeNull()
  })
})

// ── not found ────────────────────────────────────────────────

describe('not found', () => {
  it('shows the not-found state when the document does not exist', async () => {
    mockDocFetch({ data: null, error: { message: 'No rows found', code: 'PGRST116' } })
    renderVerificador()

    expect(await screen.findByText('Documento no encontrado')).not.toBeNull()
    expect(screen.getByText(VALID_UUID)).not.toBeNull()
  })
})

// ── annulled document ────────────────────────────────────────

describe('annulled document', () => {
  it('shows the annulled badge and invalidation message', async () => {
    mockDocFetch({ data: { ...MOCK_DOC_BASE, estado: 'anulado' }, error: null })
    renderVerificador()

    expect(await screen.findByText('Documento anulado')).not.toBeNull()
    expect(
      screen.getByText(/Este documento ha sido anulado y ya no tiene validez legal/)
    ).not.toBeNull()
  })
})

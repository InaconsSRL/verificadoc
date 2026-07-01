import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Verificar from './Verificador'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}))

const VALID_UUID  = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const MOCK_DOC_BASE = {
  id: VALID_UUID,
  correlativo: 'CT-0001-2026',
  tipo: 'CT',
  nombre_trabajador: 'María López',
  cargo: 'Analista',
  fecha_ingreso: '2020-01-15',
  fecha_cese: null,
  fecha_emision: '2025-06-15',
  empresa_razon_social: 'Acme S.A.',
  empresa_ruc: '20123456789',
}

// La animación de verificación dura ~1.65 s antes de mostrar el resultado
const WAIT = { timeout: 4000 }

function mockRpc(result) {
  supabase.rpc.mockResolvedValue(result)
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
  it('shows the authenticated badge, worker name, correlativo, and empresa', async () => {
    mockRpc({ data: [{ ...MOCK_DOC_BASE, estado: 'activo' }], error: null })
    renderVerificador()

    expect(await screen.findByText('Documento válido y auténtico', {}, WAIT)).not.toBeNull()
    expect(screen.getByText('María López')).not.toBeNull()
    expect(screen.getAllByText('CT-0001-2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Acme S\.A\./).length).toBeGreaterThan(0)
    expect(supabase.rpc).toHaveBeenCalledWith('verificar_documento', { p_codigo: VALID_UUID })
  })
})

// ── not found ────────────────────────────────────────────────

describe('not found', () => {
  it('shows the not-found state when the document does not exist', async () => {
    mockRpc({ data: [], error: null })
    renderVerificador()

    expect(await screen.findByText('Documento no encontrado', {}, WAIT)).not.toBeNull()
    expect(screen.getByText(VALID_UUID)).not.toBeNull()
  })

  it('shows the not-found state when the RPC fails', async () => {
    mockRpc({ data: null, error: { message: 'boom' } })
    renderVerificador()

    expect(await screen.findByText('Documento no encontrado', {}, WAIT)).not.toBeNull()
  })
})

// ── annulled document ────────────────────────────────────────

describe('annulled document', () => {
  it('shows the annulled badge and invalidation message', async () => {
    mockRpc({ data: [{ ...MOCK_DOC_BASE, estado: 'anulado' }], error: null })
    renderVerificador()

    expect(await screen.findByText('Documento anulado', {}, WAIT)).not.toBeNull()
    expect(
      screen.getByText(/Este documento ha sido anulado y ya no tiene validez legal/)
    ).not.toBeNull()
  })
})

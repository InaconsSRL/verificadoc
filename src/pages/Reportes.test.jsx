import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Reportes from './Reportes'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const DOCS = [
  {
    tipo: 'CT',
    estado: 'activo',
    empresa_id: 'emp-1',
    fecha_emision: '2025-01-15',
    empresas: { razon_social: 'Acme S.A.' },
  },
  {
    tipo: 'CT',
    estado: 'activo',
    empresa_id: 'emp-1',
    fecha_emision: '2025-01-20',
    empresas: { razon_social: 'Acme S.A.' },
  },
  {
    tipo: 'CL',
    estado: 'anulado',
    empresa_id: 'emp-2',
    fecha_emision: '2025-03-05',
    empresas: { razon_social: 'Beta Corp' },
  },
]

function mockFetch(data) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({ data }),
      }),
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── porTipo ──────────────────────────────────────────────────

describe('porTipo', () => {
  it('groups documents by tipo with correct counts', async () => {
    mockFetch(DOCS)
    render(<Reportes />)

    const heading = await screen.findByText('Por tipo de documento')
    const section = within(heading.closest('.panel'))

    expect(section.getByText(/^CT ·/)).not.toBeNull()
    expect(section.getByText(/^CL ·/)).not.toBeNull()

    const nums = section.getAllByText(/^[0-9]+$/).map(el => el.textContent)
    expect(nums).toContain('2')
    expect(nums).toContain('1')
  })

  it('shows the no-data message when data is an empty array', async () => {
    mockFetch([])
    render(<Reportes />)
    expect(await screen.findByText(/Sin datos en/)).not.toBeNull()
  })
})

// ── porEmpresa ───────────────────────────────────────────────

describe('porEmpresa', () => {
  it('groups by company name with correct counts', async () => {
    mockFetch(DOCS)
    render(<Reportes />)

    const heading = await screen.findByText('Por empresa')
    const section = within(heading.closest('.panel'))

    expect(section.getByText('Acme S.A.')).not.toBeNull()
    expect(section.getByText('Beta Corp')).not.toBeNull()

    const nums = section.getAllByText(/^[0-9]+$/).map(el => el.textContent)
    expect(nums).toContain('2')
    expect(nums).toContain('1')
  })

  it('uses empresa_id as the label when razon_social is absent', async () => {
    mockFetch([
      { tipo: 'CT', estado: 'activo', empresa_id: 'emp-orphan', fecha_emision: '2025-02-10', empresas: null },
    ])
    render(<Reportes />)

    const heading = await screen.findByText('Por empresa')
    expect(within(heading.closest('.panel')).getByText('emp-orphan')).not.toBeNull()
  })
})

// ── porMes ───────────────────────────────────────────────────

describe('porMes', () => {
  it('places counts in the correct month buckets', async () => {
    mockFetch(DOCS)
    render(<Reportes />)

    await screen.findByText('Por tipo de documento')

    function getMonthCount(label) {
      const monthEl = screen.getByText(label)
      return monthEl.parentElement.querySelector('span:first-child').textContent.trim()
    }

    expect(getMonthCount('Ene')).toBe('2')
    expect(getMonthCount('Mar')).toBe('1')
    expect(getMonthCount('Feb')).toBe('')
  })
})

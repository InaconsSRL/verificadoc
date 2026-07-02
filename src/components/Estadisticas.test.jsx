import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import Estadisticas from './Estadisticas'
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

async function abrirPopover(nombreBoton) {
  fireEvent.click(await screen.findByRole('button', { name: nombreBoton }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── KPIs ─────────────────────────────────────────────────────

describe('KPIs', () => {
  it('shows totals for emitted, active, and annulled documents', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)

    const total = await screen.findByText('Total emitidos')
    expect(within(total.parentElement).getByText('3')).not.toBeNull()

    const activos = screen.getByText('Activos')
    expect(within(activos.parentElement).getByText('2')).not.toBeNull()

    const anulados = screen.getByText('Anulados')
    expect(within(anulados.parentElement).getByText('1')).not.toBeNull()
  })

  it('shows summary values on the interactive cards without opening them', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)

    await screen.findByText('Tipo más emitido')
    expect(screen.getByText('CT · 2')).not.toBeNull()
    expect(screen.getByText('Empresa con más emisiones')).not.toBeNull()
    expect(screen.getByText('Acme S.A.')).not.toBeNull()
  })

  it('shows the no-data message when data is an empty array', async () => {
    mockFetch([])
    render(<Estadisticas />)
    expect(await screen.findByText(/Sin datos en/)).not.toBeNull()
  })
})

// ── Popover por tipo ─────────────────────────────────────────

describe('popover por tipo', () => {
  it('opens on click and groups documents by tipo with correct counts', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)
    await abrirPopover(/tipo más emitido/i)

    const pop = screen.getByRole('region', { name: 'Por tipo de documento' })
    expect(within(pop).getByText(/^CT ·/)).not.toBeNull()
    expect(within(pop).getByText(/^CL ·/)).not.toBeNull()

    const nums = within(pop).getAllByText(/^[0-9]+$/).map(el => el.textContent)
    expect(nums).toContain('2')
    expect(nums).toContain('1')
  })

  it('closes with the Escape key', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)
    await abrirPopover(/tipo más emitido/i)

    fireEvent.keyDown(screen.getByRole('region', { name: 'Por tipo de documento' }), { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Por tipo de documento' })).toBeNull()
  })
})

// ── Popover por empresa ──────────────────────────────────────

describe('popover por empresa', () => {
  it('groups by company name with correct counts', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)
    await abrirPopover(/empresa con más emisiones/i)

    const pop = screen.getByRole('region', { name: 'Por empresa' })
    expect(within(pop).getByText('Acme S.A.')).not.toBeNull()
    expect(within(pop).getByText('Beta Corp')).not.toBeNull()

    const nums = within(pop).getAllByText(/^[0-9]+$/).map(el => el.textContent)
    expect(nums).toContain('2')
    expect(nums).toContain('1')
  })

  it('uses empresa_id as the label when razon_social is absent', async () => {
    mockFetch([
      { tipo: 'CT', estado: 'activo', empresa_id: 'emp-orphan', fecha_emision: '2025-02-10', empresas: null },
    ])
    render(<Estadisticas />)
    await abrirPopover(/empresa con más emisiones/i)

    const pop = screen.getByRole('region', { name: 'Por empresa' })
    expect(within(pop).getByText('emp-orphan')).not.toBeNull()
  })
})

// ── Popover por mes ──────────────────────────────────────────

describe('popover por mes', () => {
  it('places counts in the correct month buckets', async () => {
    mockFetch(DOCS)
    render(<Estadisticas />)
    await abrirPopover(/este mes|mejor mes/i)

    const pop = screen.getByRole('region', { name: /Emisiones por mes/ })

    function getMonthCount(label) {
      const monthEl = within(pop).getByText(label)
      return monthEl.parentElement.querySelector('span:first-child').textContent.trim()
    }

    expect(getMonthCount('Ene')).toBe('2')
    expect(getMonthCount('Mar')).toBe('1')
    expect(getMonthCount('Feb')).toBe('')
  })
})

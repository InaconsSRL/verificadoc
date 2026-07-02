import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminEmpresas from './AdminEmpresas'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const EMPRESA_COMPLETA = {
  id: 'emp-1',
  razon_social: 'Acme S.A.',
  ruc: '20123456789',
  prefijo: 'ACM',
  direccion: 'Av. Lima 1',
  telefono: null,
  representante: 'Juan Pérez',
  cargo_rep: 'Gerente',
  activa: true,
}

const EMPRESA_PENDIENTE = {
  id: 'emp-2',
  razon_social: 'Beta Corp',
  ruc: '20987654321',
  prefijo: 'BTA',
  direccion: '[DIRECCIÓN PENDIENTE]',
  telefono: null,
  representante: '[REPRESENTANTE PENDIENTE]',
  cargo_rep: '[CARGO PENDIENTE]',
  activa: true,
}

function mockFetchEmpresas(data) {
  supabase.from.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  })
}

function setupUpdate(error = null) {
  const mockEq  = vi.fn().mockResolvedValue({ error })
  const mockUpd = vi.fn().mockReturnValue({ eq: mockEq })
  supabase.from.mockReturnValueOnce({ update: mockUpd })
  return { mockUpd, mockEq }
}

const showToast = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminEmpresas', () => {
  it('marks companies with placeholder data as "Datos pendientes"', async () => {
    mockFetchEmpresas([EMPRESA_COMPLETA, EMPRESA_PENDIENTE])
    render(<AdminEmpresas showToast={showToast} />)

    await screen.findByText('Acme S.A.')
    expect(screen.getByText('Beta Corp')).not.toBeNull()

    // Solo Beta Corp (con placeholders) lleva el badge
    expect(screen.getAllByText('Datos pendientes').length).toBe(1)
    expect(screen.getByText(/Firma: Juan Pérez/)).not.toBeNull()
  })

  it('deactivates a company and shows the inactive badge', async () => {
    mockFetchEmpresas([EMPRESA_COMPLETA])
    const { mockUpd, mockEq } = setupUpdate()

    render(<AdminEmpresas showToast={showToast} />)
    await screen.findByText('Acme S.A.')

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))

    await screen.findByText('Inactiva')
    expect(mockUpd).toHaveBeenCalledWith({ activa: false })
    expect(mockEq).toHaveBeenCalledWith('id', 'emp-1')
  })

  it('opens the edit modal without placeholder values and saves the changes', async () => {
    mockFetchEmpresas([EMPRESA_PENDIENTE])
    const { mockUpd, mockEq } = setupUpdate()
    mockFetchEmpresas([{ ...EMPRESA_PENDIENTE, direccion: 'Jr. Nuevo 42' }])

    render(<AdminEmpresas showToast={showToast} />)
    await screen.findByText('Beta Corp')

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    // Los placeholders "[...PENDIENTE]" no deben aparecer como valor editable
    const dirInput = screen.getByLabelText('Dirección fiscal')
    expect(dirInput.value).toBe('')

    fireEvent.change(dirInput, { target: { value: 'Jr. Nuevo 42' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await screen.findByText('Beta Corp')
    expect(mockUpd).toHaveBeenCalledWith({
      direccion: 'Jr. Nuevo 42',
      telefono: null,
      representante: null,
      cargo_rep: null,
    })
    expect(mockEq).toHaveBeenCalledWith('id', 'emp-2')
  })

  it('validates RUC and prefijo before allowing company creation', async () => {
    mockFetchEmpresas([])
    render(<AdminEmpresas showToast={showToast} />)
    await screen.findByText('Sin empresas registradas.')

    fireEvent.click(screen.getByRole('button', { name: /agregar empresa/i }))

    fireEvent.change(screen.getByLabelText(/razón social/i), { target: { value: 'Nueva S.A.C.' } })
    fireEvent.change(screen.getByLabelText(/^RUC/), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/prefijo/i), { target: { value: 'NV' } })

    // RUC incompleto → botón deshabilitado
    expect(screen.getByRole('button', { name: /crear empresa/i }).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/^RUC/), { target: { value: '20111222333' } })
    expect(screen.getByRole('button', { name: /crear empresa/i }).disabled).toBe(false)
  })
})

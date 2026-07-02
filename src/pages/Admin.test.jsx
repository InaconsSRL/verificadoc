import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Admin from './Admin'
import { supabase } from '@/lib/supabase'
import { crearUsuario } from '@/lib/usuarios'
import { useAuth } from '@/context/AuthContext'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/usuarios', () => ({
  crearUsuario: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const SELF_ID  = 'uid-self'
const OTHER_ID = 'uid-other'

function mockFetchPerfiles(perfiles) {
  supabase.from.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: perfiles }),
    }),
  })
}

function setupUpdate(error = null) {
  const mockEq  = vi.fn().mockResolvedValue({ error })
  const mockUpd = vi.fn().mockReturnValue({ eq: mockEq })
  supabase.from.mockReturnValueOnce({ update: mockUpd })
  return { mockUpd, mockEq }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { id: SELF_ID } })
})

// ── self-change guard ────────────────────────────────────────

describe('self-change guard', () => {
  it('disables the role select and shows "Tú" badge for the current user row', async () => {
    mockFetchPerfiles([{ id: SELF_ID, nombre: 'Ana García', rol: 'sig' }])
    render(<Admin />)

    await screen.findByText('Ana García')

    expect(screen.getByText('Tú')).not.toBeNull()
    expect(screen.getByRole('combobox').disabled).toBe(true)
  })
})

// ── cambiarRol ───────────────────────────────────────────────

describe('cambiarRol', () => {
  it('calls supabase update on a valid role change and shows success toast', async () => {
    mockFetchPerfiles([{ id: OTHER_ID, nombre: 'Juan López', rol: 'capital_humano' }])
    const { mockUpd, mockEq } = setupUpdate()

    render(<Admin />)
    await screen.findByText('Juan López')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gerencia' } })

    await screen.findByText('Rol actualizado correctamente.')
    expect(mockUpd).toHaveBeenCalledWith({ rol: 'gerencia' })
    expect(mockEq).toHaveBeenCalledWith('id', OTHER_ID)
  })

  it('does not show the success toast and leaves the role unchanged on RPC failure', async () => {
    mockFetchPerfiles([{ id: OTHER_ID, nombre: 'Juan López', rol: 'capital_humano' }])
    const { mockEq } = setupUpdate(new Error('DB error'))

    render(<Admin />)
    await screen.findByText('Juan López')

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'gerencia' } })

    await waitFor(() => expect(mockEq).toHaveBeenCalled())
    expect(screen.queryByText('Rol actualizado correctamente.')).toBeNull()
    expect(screen.getByRole('combobox').value).toBe('capital_humano')
  })
})

// ── cambiarActivo ────────────────────────────────────────────

describe('cambiarActivo', () => {
  it('deactivates another user after confirming in the modal', async () => {
    mockFetchPerfiles([{ id: OTHER_ID, nombre: 'Juan López', rol: 'capital_humano', activo: true }])
    const { mockUpd, mockEq } = setupUpdate()

    render(<Admin />)
    await screen.findByText('Juan López')

    // El botón de la fila abre el modal de confirmación
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await screen.findByText('Desactivar usuario')
    expect(mockUpd).not.toHaveBeenCalled()

    // Confirmar dentro del modal
    const botones = screen.getAllByRole('button', { name: 'Desactivar' })
    fireEvent.click(botones[botones.length - 1])

    await screen.findByText('Inactivo')
    expect(mockUpd).toHaveBeenCalledWith({ activo: false })
    expect(mockEq).toHaveBeenCalledWith('id', OTHER_ID)
    expect(screen.getByRole('button', { name: 'Activar' })).not.toBeNull()
  })

  it('cancelling the modal leaves the user active', async () => {
    mockFetchPerfiles([{ id: OTHER_ID, nombre: 'Juan López', rol: 'capital_humano', activo: true }])

    render(<Admin />)
    await screen.findByText('Juan López')

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await screen.findByText('Desactivar usuario')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Solo se llamó a supabase para el fetch inicial: ningún update
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Desactivar usuario')).toBeNull()
    expect(screen.queryByText('Inactivo')).toBeNull()
  })

  it('blocks deactivating your own account', async () => {
    mockFetchPerfiles([{ id: SELF_ID, nombre: 'Ana García', rol: 'sig', activo: true }])

    render(<Admin />)
    await screen.findByText('Ana García')

    expect(screen.getByRole('button', { name: 'Desactivar' }).disabled).toBe(true)
  })
})

// ── crear usuario ────────────────────────────────────────────

describe('crear usuario', () => {
  it('creates a user from the admin form and shows success toast', async () => {
    mockFetchPerfiles([])
    mockFetchPerfiles([{ id: 'uid-new', nombre: 'María Pérez', rol: 'capital_humano' }])
    crearUsuario.mockResolvedValue({
      id: 'uid-new',
      nombre: 'María Pérez',
      cuentaNueva: true,
    })

    render(<Admin />)
    await screen.findByText('Sin usuarios registrados.')

    fireEvent.click(screen.getByRole('button', { name: /agregar usuario/i }))

    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'María Pérez' } })
    fireEvent.change(screen.getByLabelText('Correo corporativo'), { target: { value: 'maria@empresa.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), { target: { value: 'temporal123' } })
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }))

    await screen.findByText('Usuario María Pérez creado. Ya puede iniciar sesión.')
    expect(crearUsuario).toHaveBeenCalledWith({
      nombre: 'María Pérez',
      email: 'maria@empresa.com',
      password: 'temporal123',
      rol: 'capital_humano',
    })
  })
})

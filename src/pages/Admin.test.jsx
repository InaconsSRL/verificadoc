import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Admin from './Admin'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
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

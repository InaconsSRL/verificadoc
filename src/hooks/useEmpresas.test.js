import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useEmpresas } from '@/hooks/useEmpresas'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockEmpresas = [
  {
    id: 1,
    razon_social: 'Acme S.A.',
    ruc: '20123456789',
    prefijo: 'ACM',
    direccion: 'Av. Lima 1',
    representante: 'Juan Pérez',
    cargo_rep: 'Gerente',
  },
  {
    id: 2,
    razon_social: 'Beta Corp',
    ruc: '20987654321',
    prefijo: 'BTA',
    direccion: 'Jr. Cusco 5',
    representante: 'María García',
    cargo_rep: 'Director',
  },
]

function mockFetch(result) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(result),
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useEmpresas', () => {
  it('loading is true on initial mount before the fetch resolves', async () => {
    let resolve
    const deferred = new Promise(res => { resolve = res })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(deferred),
      }),
    })

    const { result } = renderHook(() => useEmpresas())
    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolve({ data: mockEmpresas, error: null })
      await deferred
    })

    expect(result.current.loading).toBe(false)
  })

  it('returns empresas and loading=false after a successful fetch', async () => {
    mockFetch({ data: mockEmpresas, error: null })
    const { result } = renderHook(() => useEmpresas())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.empresas).toEqual(mockEmpresas)
    expect(result.current.error).toBeNull()
  })

  it('returns an empty array when data is null (no rows found)', async () => {
    mockFetch({ data: null, error: null })
    const { result } = renderHook(() => useEmpresas())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.empresas).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('sets error state and loading=false when the fetch fails', async () => {
    const err = { message: 'Database error', code: '500' }
    mockFetch({ data: null, error: err })
    const { result } = renderHook(() => useEmpresas())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toEqual(err)
    expect(result.current.empresas).toEqual([])
  })
})

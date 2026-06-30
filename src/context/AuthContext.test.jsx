import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession:         vi.fn(),
      onAuthStateChange:  vi.fn(),
      signInWithPassword: vi.fn(),
      signOut:            vi.fn(),
      updateUser:         vi.fn(),
    },
    from: vi.fn(),
  },
}))

function mockPerfilFetch(result) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  })
}

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

beforeEach(() => {
  vi.clearAllMocks()
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})

// ── login ────────────────────────────────────────────────────

describe('login', () => {
  it('calls signInWithPassword with the provided credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.login('user@test.com', 'secret')
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'secret',
    })
  })

  it('throws the Supabase error when credentials are invalid', async () => {
    const err = new Error('Invalid login credentials')
    supabase.auth.signInWithPassword.mockResolvedValue({ error: err })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.login('bad@test.com', 'wrong')).rejects.toThrow(
      'Invalid login credentials'
    )
  })
})

// ── logout ───────────────────────────────────────────────────

describe('logout', () => {
  it('calls supabase.auth.signOut', async () => {
    supabase.auth.signOut.mockResolvedValue({})
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.logout()
    })

    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
  })
})

// ── perfil fetch ─────────────────────────────────────────────

describe('perfil fetch', () => {
  it('sets perfil when a session exists on mount', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' } } },
    })
    mockPerfilFetch({ data: { rol: 'capital_humano', nombre: 'Ana García' }, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.perfil).toEqual({ rol: 'capital_humano', nombre: 'Ana García' })
    expect(result.current.user).toEqual({ id: 'uid-1' })
  })

  it('sets perfil to null when no profile row exists (PGRST116)', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-2' } } },
    })
    mockPerfilFetch({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.perfil).toBeNull()
  })
})

// ── password recovery ────────────────────────────────────────

describe('password recovery', () => {
  it('sets recoveryMode when the PASSWORD_RECOVERY auth event fires', async () => {
    let capturedCallback
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      capturedCallback('PASSWORD_RECOVERY', { user: { id: 'uid-3' } })
    })

    expect(result.current.recoveryMode).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('clears recoveryMode after updatePassword succeeds', async () => {
    let capturedCallback
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    supabase.auth.updateUser.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      capturedCallback('PASSWORD_RECOVERY', { user: { id: 'uid-3' } })
    })
    expect(result.current.recoveryMode).toBe(true)

    await act(async () => {
      await result.current.updatePassword('newSecure123')
    })
    expect(result.current.recoveryMode).toBe(false)
  })
})

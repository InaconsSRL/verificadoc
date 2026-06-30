import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RutaProtegida from './RutaProtegida'
import { useAuth } from '@/context/AuthContext'

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

function renderRoute(authState, { roles, children = <div>Protected content</div> } = {}) {
  useAuth.mockReturnValue(authState)
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RutaProtegida roles={roles}>{children}</RutaProtegida>} />
        <Route path="/login"          element={<div>Login page</div>} />
        <Route path="/sin-acceso"     element={<div>Sin acceso</div>} />
        <Route path="/reset-password" element={<div>Reset password</div>} />
      </Routes>
    </MemoryRouter>
  )
}

const SETTLED = { loading: false, recoveryMode: false }

beforeEach(() => {
  vi.clearAllMocks()
})

// ── unauthenticated ──────────────────────────────────────────

describe('unauthenticated', () => {
  it('redirects to /login when there is no user', () => {
    renderRoute({ ...SETTLED, user: null, perfil: null })
    screen.getByText('Login page')
    expect(screen.queryByText('Protected content')).toBeNull()
  })

  it('redirects to /login when user exists but perfil is null', () => {
    renderRoute({ ...SETTLED, user: { id: 'u1' }, perfil: null })
    screen.getByText('Login page')
    expect(screen.queryByText('Protected content')).toBeNull()
  })
})

// ── role enforcement ─────────────────────────────────────────

describe('role enforcement', () => {
  it('redirects to /sin-acceso when the user role is not in the allowed list', () => {
    renderRoute(
      { ...SETTLED, user: { id: 'u1' }, perfil: { rol: 'gerencia' } },
      { roles: ['capital_humano', 'sig'] }
    )
    screen.getByText('Sin acceso')
    expect(screen.queryByText('Protected content')).toBeNull()
  })

  it('renders children when the user role is in the allowed list', () => {
    renderRoute(
      { ...SETTLED, user: { id: 'u1' }, perfil: { rol: 'capital_humano' } },
      { roles: ['capital_humano'] }
    )
    screen.getByText('Protected content')
  })

  it('renders children when no role restriction is provided', () => {
    renderRoute({ ...SETTLED, user: { id: 'u1' }, perfil: { rol: 'gerencia' } })
    screen.getByText('Protected content')
  })
})

// ── loading ──────────────────────────────────────────────────

describe('loading', () => {
  it('shows the spinner while auth is resolving', () => {
    const { container } = renderRoute({ loading: true, recoveryMode: false, user: null, perfil: null })
    expect(container.querySelector('.spinner')).not.toBeNull()
    expect(screen.queryByText('Protected content')).toBeNull()
  })
})

// ── recovery mode ────────────────────────────────────────────

describe('recovery mode', () => {
  it('redirects to /reset-password when recoveryMode is true', () => {
    renderRoute({ loading: false, recoveryMode: true, user: { id: 'u1' }, perfil: null })
    screen.getByText('Reset password')
    expect(screen.queryByText('Protected content')).toBeNull()
  })
})

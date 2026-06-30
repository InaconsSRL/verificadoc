import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import BrandLogo from '@/components/BrandLogo'

const ROL_REDIRECT = {
  capital_humano: '/emitir',
  gerencia:       '/reportes',
  sig:            '/emitir',
}

export default function Login() {
  const { login, user, perfil, loading } = useAuth()
  const navigate = useNavigate()

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    if (!perfil) {
      setError('Tu cuenta no tiene un perfil asignado. Pide a SIG que te configure el acceso.')
      setSubmitting(false)
      return
    }
    navigate(ROL_REDIRECT[perfil.rol] ?? '/emitir', { replace: true })
  }, [user, perfil, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch {
      setError('Correo o contraseña incorrectos.')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-card-header">
            <BrandLogo size="lg" />
            <h1 className="auth-title">Iniciar sesión</h1>
            <p className="auth-subtitle">Ingresa tus credenciales para continuar</p>
          </header>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: '12px' }}>
                {error}
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="email">Correo corporativo</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="correo@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <div className="auth-label-row">
                <label className="label" htmlFor="password">Contraseña</label>
                <Link to="/forgot-password" className="auth-text-link">¿Olvidaste tu contraseña?</Link>
              </div>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ marginTop: '4px' }}
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="auth-footnote">
          ¿Problemas para acceder? Contacta al área de SIG.
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import BrandLogo from '@/components/BrandLogo'

export default function ForgotPassword() {
  useDocumentTitle('Recuperar contraseña')
  const [email,   setEmail]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setBusy(false)
    if (err) {
      setError('No se pudo enviar el correo. Verifica la dirección e intenta de nuevo.')
      return
    }
    setSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-card-header">
            <BrandLogo size="lg" />
            <h1 className="auth-title">Recuperar contraseña</h1>
            <p className="auth-subtitle">
              {sent
                ? <>Revisa tu bandeja de entrada en <strong>{email}</strong></>
                : 'Te enviaremos un enlace para restablecer tu contraseña'}
            </p>
          </header>

          {sent ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                Si el correo está registrado, recibirás un enlace en unos minutos.
                Revisa también spam.
              </div>
              <Link to="/login" className="btn btn-primary btn-lg" style={{ textAlign: 'center' }}>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>
              )}

              <div className="field">
                <label className="label" htmlFor="fp-email">Correo corporativo</label>
                <input
                  id="fp-email"
                  type="email"
                  className="input"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                {busy ? <span className="spinner" /> : 'Enviar enlace'}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <Link to="/login" className="auth-back-link">← Volver al inicio de sesión</Link>
        )}
      </div>
    </div>
  )
}

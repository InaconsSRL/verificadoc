import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

export default function ResetPassword() {
  const { updatePassword, logout, loading, recoveryMode } = useAuth()
  const navigate = useNavigate()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      await updatePassword(password)
      setDone(true)
      await logout()
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message ?? 'Error al actualizar la contraseña.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-shell-compact">
        <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  if (!recoveryMode && !done) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <header className="auth-card-header">
              <KeyRound size={32} color="var(--mc-color-text-placeholder)" />
              <h1 className="auth-title">Enlace expirado</h1>
              <p className="auth-subtitle">El enlace de recuperación ya fue usado o expiró.</p>
            </header>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/login', { replace: true })}
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <header className="auth-card-header">
              <CheckCircle size={36} color="var(--mc-color-success)" />
              <h1 className="auth-title">Contraseña actualizada</h1>
              <p className="auth-subtitle">Redirigiendo al inicio de sesión…</p>
            </header>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-card-header">
            <BrandLogo size="lg" />
            <h1 className="auth-title">Nueva contraseña</h1>
            <p className="auth-subtitle">Elige una contraseña de al menos 8 caracteres.</p>
          </header>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="pwd">Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="pwd"
                  type={showPwd ? 'text' : 'password'}
                  className="input"
                  style={{ paddingRight: '2.5rem' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--mc-color-text-secondary)', padding: 4,
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="confirm">Confirmar contraseña</label>
              <input
                id="confirm"
                type={showPwd ? 'text' : 'password'}
                className="input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

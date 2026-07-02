import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function RutaProtegida({ children, roles }) {
  const { user, perfil, loading, recoveryMode, refreshPerfil } = useAuth()
  const location = useLocation()

  // Re-verificar el perfil al navegar: detecta desactivaciones o
  // cambios de rol sin esperar a que el usuario recargue la página.
  useEffect(() => {
    if (user) refreshPerfil?.()
  }, [location.pathname, user])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(13,31,53,.1)', borderTopColor: '#0D1F35' }} />
      </div>
    )
  }

  // En modo recuperación, forzar la pantalla de nueva contraseña
  if (recoveryMode) return <Navigate to="/reset-password" replace />

  if (!user) return <Navigate to="/login" replace />

  if (!perfil) return <Navigate to="/login" replace />

  if (perfil.activo === false) return <Navigate to="/sin-acceso" replace />

  if (roles && perfil && !roles.includes(perfil.rol)) {
    return <Navigate to="/sin-acceso" replace />
  }

  return children
}

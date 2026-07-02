import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'
import RutaProtegida from '@/components/RutaProtegida'
import Layout from '@/components/Layout'
import { PERMISOS } from '@/lib/permisos'

// Páginas
import Login         from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Emitir        from '@/pages/Emitir'
import Historial     from '@/pages/Historial'
import Plantillas    from '@/pages/Plantillas'
import Admin         from '@/pages/Admin'
import Verificar     from '@/pages/Verificar'
import SinAcceso     from '@/pages/SinAcceso'

// Redirige a /reset-password cuando Supabase dispara el evento PASSWORD_RECOVERY
function RecoveryGuard() {
  const { recoveryMode } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (recoveryMode) {
      navigate('/reset-password', { replace: true })
    }
  }, [recoveryMode])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Interceptor dentro del router para poder usar useNavigate */}
        <RecoveryGuard />

        <Routes>

          {/* ── Públicas ── */}
          <Route path="/v/:uuid"        element={<Verificar />} />
          <Route path="/verificar"      element={<Verificar />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/sin-acceso"     element={<SinAcceso />} />

          {/* ── Privadas con layout ── */}
          <Route element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }>
            <Route path="/emitir" element={
              <RutaProtegida roles={PERMISOS.emitir}>
                <Emitir />
              </RutaProtegida>
            } />

            {/* Historial incluye las estadísticas (antes módulo Reportes);
                gerencia entra en modo solo lectura */}
            <Route path="/historial" element={
              <RutaProtegida roles={PERMISOS.historial}>
                <Historial />
              </RutaProtegida>
            } />

            {/* Compatibilidad con enlaces guardados al módulo anterior */}
            <Route path="/reportes" element={<Navigate to="/historial" replace />} />

            <Route path="/plantillas" element={
              <RutaProtegida roles={PERMISOS.plantillas}>
                <Plantillas />
              </RutaProtegida>
            } />

            <Route path="/admin" element={
              <RutaProtegida roles={PERMISOS.admin}>
                <Admin />
              </RutaProtegida>
            } />
          </Route>

          {/* ── Raíz ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

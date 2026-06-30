import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'
import RutaProtegida from '@/components/RutaProtegida'
import Layout from '@/components/Layout'

// Páginas
import Login         from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Emitir        from '@/pages/Emitir'
import Historial     from '@/pages/Historial'
import Reportes      from '@/pages/Reportes'
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
              <RutaProtegida roles={['capital_humano', 'sig']}>
                <Emitir />
              </RutaProtegida>
            } />

            <Route path="/historial" element={
              <RutaProtegida roles={['capital_humano', 'sig']}>
                <Historial />
              </RutaProtegida>
            } />

            <Route path="/reportes" element={
              <RutaProtegida roles={['gerencia', 'sig']}>
                <Reportes />
              </RutaProtegida>
            } />

            <Route path="/admin" element={
              <RutaProtegida roles={['sig']}>
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

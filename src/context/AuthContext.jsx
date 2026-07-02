import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [perfil,       setPerfil]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)
  const userRef        = useRef(null)
  const ultimoRefresco = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION is already handled by getSession() above — skip to avoid double fetch
      if (event === 'INITIAL_SESSION') return

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true)
        setUser(session?.user ?? null)
        setLoading(false)
        return
      }

      setRecoveryMode(false)
      setUser(session?.user ?? null)

      if (session?.user) {
        setLoading(true) // signal that perfil fetch is in progress
        fetchPerfil(session.user.id)
      } else {
        setPerfil(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Re-lee el perfil sin tocar el estado de carga; usado al navegar
  // para detectar desactivaciones o cambios de rol en sesiones abiertas.
  // Throttle de 10 s para no disparar una consulta por cada render.
  async function refreshPerfil() {
    const userId = userRef.current?.id
    if (!userId) return
    const ahora = Date.now()
    if (ahora - ultimoRefresco.current < 10_000) return
    ultimoRefresco.current = ahora

    const { data, error } = await supabase
      .from('usuarios_perfil')
      .select('rol, nombre, activo')
      .eq('id', userId)
      .single()
    if (!error) setPerfil(data ?? null)
  }

  async function fetchPerfil(userId) {
    const { data, error } = await supabase
      .from('usuarios_perfil')
      .select('rol, nombre, activo')
      .eq('id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (perfil no creado aún), otros errores sí son graves
      console.error('Failed to load user profile.')
    }
    setPerfil(data ?? null)
    setLoading(false)
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    setRecoveryMode(false)
  }

  userRef.current = user

  return (
    <AuthContext.Provider value={{ user, perfil, loading, recoveryMode, login, logout, updatePassword, refreshPerfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

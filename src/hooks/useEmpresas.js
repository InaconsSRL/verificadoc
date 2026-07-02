import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useEmpresas({ soloActivas = false } = {}) {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let q = supabase
      .from('empresas')
      .select('id, razon_social, ruc, prefijo, direccion, telefono, representante, cargo_rep, activa')
    if (soloActivas) q = q.eq('activa', true)
    q.order('razon_social')
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setEmpresas(data ?? [])
        setLoading(false)
      })
  }, [soloActivas])

  return { empresas, loading, error }
}

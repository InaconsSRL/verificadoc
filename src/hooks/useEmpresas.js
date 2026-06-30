import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('empresas')
      .select('id, razon_social, ruc, prefijo, direccion, representante, cargo_rep')
      .order('razon_social')
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setEmpresas(data ?? [])
        setLoading(false)
      })
  }, [])

  return { empresas, loading, error }
}

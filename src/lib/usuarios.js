import { supabase } from '@/lib/supabase'

export async function crearUsuario({ email, password, nombre, rol }) {
  const { data, error } = await supabase.functions.invoke('admin-crear-usuario', {
    body: { email, password, nombre, rol },
  })

  if (error) {
    throw new Error(error.message || 'No se pudo crear el usuario.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const ROLES = ["capital_humano", "gerencia", "sig"] as const

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  let page = 1
  const perPage = 200
  const target = email.trim().toLowerCase()

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const match = data.users.find((u) => u.email?.toLowerCase() === target)
    if (match) return match.id

    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido." }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Configuración del servidor incompleta." }, 500)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return json({ error: "No autenticado." }, 401)
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await caller.auth.getUser()
  if (authError || !authData.user) {
    return json({ error: "Sesión inválida." }, 401)
  }

  const { data: perfil, error: perfilError } = await caller
    .from("usuarios_perfil")
    .select("rol")
    .eq("id", authData.user.id)
    .single()

  if (perfilError || perfil?.rol !== "sig") {
    return json({ error: "Solo usuarios SIG pueden crear cuentas." }, 403)
  }

  let body: { email?: string; password?: string; nombre?: string; rol?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Cuerpo de solicitud inválido." }, 400)
  }

  const email = body.email?.trim().toLowerCase() ?? ""
  const password = body.password ?? ""
  const nombre = body.nombre?.trim() ?? ""
  const rol = body.rol ?? ""

  if (!email || !password || !nombre || !rol) {
    return json({ error: "Completa nombre, correo, contraseña y rol." }, 400)
  }

  if (password.length < 8) {
    return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400)
  }

  if (!ROLES.includes(rol as (typeof ROLES)[number])) {
    return json({ error: "Rol inválido." }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let userId: string | null = null
  let cuentaNueva = false

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (created?.user) {
    userId = created.user.id
    cuentaNueva = true
  } else if (createError) {
    const msg = createError.message.toLowerCase()
    const yaExiste =
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")

    if (!yaExiste) {
      return json({ error: createError.message }, 400)
    }

    userId = await findUserIdByEmail(admin, email)
    if (!userId) {
      return json({ error: "No se pudo registrar ni localizar el usuario." }, 400)
    }
  }

  const { data: existente } = await admin
    .from("usuarios_perfil")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (existente) {
    return json({ error: "Ese correo ya tiene un perfil asignado." }, 409)
  }

  const { error: insertError } = await admin.from("usuarios_perfil").insert({
    id: userId,
    nombre,
    rol,
    email,
  })

  if (insertError) {
    return json({ error: insertError.message }, 400)
  }

  return json({
    id: userId,
    email,
    nombre,
    rol,
    cuentaNueva,
  })
})

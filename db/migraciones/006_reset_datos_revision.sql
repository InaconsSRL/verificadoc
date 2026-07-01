-- ============================================================
-- VERIFICADOC — Reset completo de datos para revisión final
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Mantiene: esquema, funciones, RLS, vistas (documentos_publicos).
-- Borra: documentos, correlativos, trabajadores, perfiles, empresas,
--        usuarios de Auth.
-- Restaura: las 8 empresas iniciales del grupo.
-- ============================================================

BEGIN;

TRUNCATE TABLE
  public.documentos,
  public.correlativos,
  public.trabajadores,
  public.usuarios_perfil,
  public.empresas
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;

INSERT INTO public.empresas (razon_social, ruc, prefijo, direccion, representante, cargo_rep) VALUES
  ('INACONS S.R.L.',   '20568587767', 'INS', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('VELIMAQ',          '20605665269', 'VLM', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('INDAGO',           '20604890862', 'IND', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('GELTECH',          '20605665251', 'GLT', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('INACONS S.A.C.',   '20607713368', 'INC', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('NUFAGO',           '20606360453', 'NFG', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('MAQNOVA S.A.C.',   '20614841142', 'MQN', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('EXPERTOP SAC',     '20614818469', 'EXP', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]')
ON CONFLICT (ruc) DO NOTHING;

COMMIT;

-- Siguiente paso: crear usuario SIG en Admin → Agregar usuario
-- (o Authentication → Users + INSERT en usuarios_perfil).

-- ============================================================
-- VERIFICADOC — Migración correctiva 002
-- Problema: la migración original usaba campos_extra JSONB
--           pero el código inserta columnas individuales.
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Añadir columnas faltantes en documentos
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS trabajador_id           UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_falta             DATE,
  ADD COLUMN IF NOT EXISTS descripcion_falta       TEXT,
  ADD COLUMN IF NOT EXISTS dias_suspension         INT,
  ADD COLUMN IF NOT EXISTS fecha_inicio_suspension DATE,
  ADD COLUMN IF NOT EXISTS fecha_limite_descargos  DATE,
  ADD COLUMN IF NOT EXISTS motivo_cese             TEXT;

-- 2. dni_trabajador era NOT NULL pero el código no lo enviaba → nullable
ALTER TABLE documentos
  ALTER COLUMN dni_trabajador DROP NOT NULL;

-- 3. Índice útil para búsqueda por trabajador_id
CREATE INDEX IF NOT EXISTS idx_documentos_trabajador ON documentos(trabajador_id);

-- ============================================================
-- PRIMER USUARIO (si aún no tienes tu perfil en usuarios_perfil)
-- Copia tu UUID desde Authentication → Users y ejecuta:
-- ============================================================
/*
INSERT INTO usuarios_perfil (id, nombre, rol)
VALUES (
  'pega-aqui-tu-uuid-de-auth',
  'Tu Nombre Completo',
  'sig'
)
ON CONFLICT (id) DO NOTHING;
*/

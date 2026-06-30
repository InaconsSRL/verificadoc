-- ============================================================
-- VERIFICADOC — Migración 004
-- Vista pública de documentos (solo columnas no sensibles) para anon.
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE OR REPLACE VIEW public.documentos_publicos AS
SELECT
  id,
  correlativo,
  tipo,
  estado,
  nombre_trabajador,
  cargo,
  fecha_ingreso,
  fecha_cese,
  fecha_emision,
  empresa_id
FROM public.documentos;

GRANT SELECT ON public.documentos_publicos TO anon;

-- ============================================================
-- VERIFICADOC — Migración 005
-- Correlativo global sin prefijo de empresa
-- Formato nuevo: TIPO-0001-2026 (contador único por tipo + año)
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- Idempotente: funciona aunque no exista la tabla antigua
-- correlativos (con empresa_id) o si la migración falló a medias.
-- ============================================================

DO $$
BEGIN
  -- Ya migrado: correlativos global (sin empresa_id)
  IF to_regclass('public.correlativos') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'correlativos'
         AND column_name = 'empresa_id'
     ) THEN
    RAISE NOTICE 'Migración 005: correlativos global ya existe, solo se actualiza la función.';
    RETURN;
  END IF;

  -- 1. Tabla nueva (o reutilizar si quedó a medias de un intento anterior)
  CREATE TABLE IF NOT EXISTS correlativos_v2 (
    tipo   TEXT NOT NULL,
    anio   INT  NOT NULL,
    ultimo INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (tipo, anio)
  );

  -- 2. Sembrar desde contadores por empresa (solo si existe tabla antigua)
  IF to_regclass('public.correlativos') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'correlativos'
         AND column_name = 'empresa_id'
     ) THEN
    INSERT INTO correlativos_v2 (tipo, anio, ultimo)
    SELECT tipo, anio, MAX(ultimo)
    FROM correlativos
    GROUP BY tipo, anio
    ON CONFLICT (tipo, anio) DO UPDATE
    SET ultimo = GREATEST(correlativos_v2.ultimo, EXCLUDED.ultimo);
  END IF;

  -- 3. Sembrar desde documentos ya emitidos (ambos formatos)
  IF to_regclass('public.documentos') IS NOT NULL THEN
    INSERT INTO correlativos_v2 (tipo, anio, ultimo)
    SELECT
      d.tipo,
      COALESCE(
        CASE
          WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 4
            THEN (string_to_array(d.correlativo, '-'))[3]::INT
          WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 3
            THEN (string_to_array(d.correlativo, '-'))[3]::INT
        END,
        EXTRACT(YEAR FROM d.fecha_emision)::INT
      ) AS anio,
      MAX(
        CASE
          WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 4
            THEN (string_to_array(d.correlativo, '-'))[4]::INT
          WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 3
            THEN (string_to_array(d.correlativo, '-'))[2]::INT
          ELSE 0
        END
      ) AS ultimo
    FROM documentos d
    GROUP BY d.tipo, anio
    HAVING MAX(
      CASE
        WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 4
          THEN (string_to_array(d.correlativo, '-'))[4]::INT
        WHEN array_length(string_to_array(d.correlativo, '-'), 1) = 3
          THEN (string_to_array(d.correlativo, '-'))[2]::INT
        ELSE 0
      END
    ) > 0
    ON CONFLICT (tipo, anio) DO UPDATE
    SET ultimo = GREATEST(correlativos_v2.ultimo, EXCLUDED.ultimo);
  END IF;

  -- 4. Reemplazar tabla antigua
  IF to_regclass('public.correlativos') IS NOT NULL THEN
    DROP POLICY IF EXISTS "correl_read" ON correlativos;
    DROP POLICY IF EXISTS "correl_write" ON correlativos;
    DROP TABLE correlativos;
  END IF;

  IF to_regclass('public.correlativos_v2') IS NOT NULL THEN
    ALTER TABLE correlativos_v2 RENAME TO correlativos;
  END IF;
END $$;

-- Prerequisito: perfiles de usuario (requerido por mi_rol() y la app)
CREATE TABLE IF NOT EXISTS usuarios_perfil (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  rol       TEXT NOT NULL
            CHECK (rol IN ('capital_humano', 'gerencia', 'sig')),
  activo    BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper RLS (requerido por políticas de correlativos; idempotente)
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT rol FROM usuarios_perfil WHERE id = auth.uid();
$func$;

ALTER TABLE usuarios_perfil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil_self" ON usuarios_perfil;
CREATE POLICY "perfil_self" ON usuarios_perfil
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR mi_rol() = 'sig');

DROP POLICY IF EXISTS "perfil_sig_write" ON usuarios_perfil;
CREATE POLICY "perfil_sig_write" ON usuarios_perfil
  FOR ALL TO authenticated
  USING (mi_rol() = 'sig')
  WITH CHECK (mi_rol() = 'sig');

ALTER TABLE correlativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "correl_read" ON correlativos;
CREATE POLICY "correl_read" ON correlativos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "correl_write" ON correlativos;
CREATE POLICY "correl_write" ON correlativos
  FOR ALL TO authenticated
  USING (mi_rol() IN ('capital_humano', 'sig'))
  WITH CHECK (mi_rol() IN ('capital_humano', 'sig'));

-- 5. Función actualizada: TIPO-0001-AÑO
CREATE OR REPLACE FUNCTION siguiente_correlativo(
  p_empresa_id UUID,
  p_tipo       TEXT,
  p_anio       INT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_numero INT;
  v_correl TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id = p_empresa_id) THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  INSERT INTO correlativos (tipo, anio, ultimo)
  VALUES (p_tipo, p_anio, 1)
  ON CONFLICT (tipo, anio)
  DO UPDATE SET ultimo = correlativos.ultimo + 1
  RETURNING ultimo INTO v_numero;

  v_correl := p_tipo || '-' || LPAD(v_numero::TEXT, 4, '0') || '-' || p_anio;

  RETURN v_correl;
END;
$$;

-- ============================================================
-- Si aún no tienes perfil, créalo (UUID desde Authentication → Users):
--
-- INSERT INTO usuarios_perfil (id, nombre, rol)
-- VALUES ('tu-uuid-aqui', 'Tu Nombre', 'sig')
-- ON CONFLICT (id) DO NOTHING;
-- ============================================================

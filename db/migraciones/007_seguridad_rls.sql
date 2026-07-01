-- ============================================================
-- VERIFICADOC — Migración 007
-- Endurecimiento de seguridad e integridad
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- 1. Elimina el acceso anónimo a la tabla documentos (fuga de
--    descripcion_falta, dni_trabajador y motivo_anulacion).
-- 2. Reemplaza la vista pública (listable en bloque) por un RPC
--    verificar_documento(codigo) que devuelve UNA fila por código
--    exacto — imposible enumerar el padrón de documentos.
-- 3. mi_rol() exige usuario activo: desactivar un perfil corta
--    todos sus permisos de escritura y lectura interna.
-- 4. emitir_documento(): correlativo + inserción en una sola
--    transacción (sin huecos de numeración) y registra el nombre
--    del emisor. Reemplaza a siguiente_correlativo().
-- 5. Los documentos emitidos pasan a ser inmutables: la anulación
--    solo es posible vía anular_documento(), que registra quién
--    y cuándo anuló.
-- ============================================================

-- ── 1. Cerrar el acceso anónimo a la tabla base ─────────────
DROP POLICY IF EXISTS "docs_public_read" ON documentos;

-- ── 2. Verificación pública por código exacto ───────────────
DROP VIEW IF EXISTS public.documentos_publicos;

CREATE OR REPLACE FUNCTION verificar_documento(p_codigo TEXT)
RETURNS TABLE (
  id                   UUID,
  correlativo          TEXT,
  tipo                 TEXT,
  estado               TEXT,
  nombre_trabajador    TEXT,
  cargo                TEXT,
  fecha_ingreso        DATE,
  fecha_cese           DATE,
  fecha_emision        TIMESTAMPTZ,
  empresa_razon_social TEXT,
  empresa_ruc          TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := TRIM(COALESCE(p_codigo, ''));
BEGIN
  IF v_codigo = '' THEN
    RETURN;
  END IF;

  IF v_codigo ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT d.id, d.correlativo, d.tipo, d.estado,
           d.nombre_trabajador, d.cargo,
           d.fecha_ingreso, d.fecha_cese, d.fecha_emision,
           e.razon_social, e.ruc
    FROM documentos d
    LEFT JOIN empresas e ON e.id = d.empresa_id
    WHERE d.id = v_codigo::uuid;
  ELSE
    RETURN QUERY
    SELECT d.id, d.correlativo, d.tipo, d.estado,
           d.nombre_trabajador, d.cargo,
           d.fecha_ingreso, d.fecha_cese, d.fecha_emision,
           e.razon_social, e.ruc
    FROM documentos d
    LEFT JOIN empresas e ON e.id = d.empresa_id
    WHERE UPPER(d.correlativo) = UPPER(v_codigo);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION verificar_documento(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verificar_documento(TEXT) TO anon, authenticated;

-- ── 3. mi_rol() solo para usuarios activos ──────────────────
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT rol FROM usuarios_perfil WHERE id = auth.uid() AND activo;
$func$;

-- Lecturas internas exigen perfil activo (antes: cualquier sesión)
DROP POLICY IF EXISTS "empresas_read" ON empresas;
CREATE POLICY "empresas_read" ON empresas
  FOR SELECT TO authenticated
  USING (mi_rol() IS NOT NULL);

DROP POLICY IF EXISTS "trabajadores_read" ON trabajadores;
CREATE POLICY "trabajadores_read" ON trabajadores
  FOR SELECT TO authenticated
  USING (mi_rol() IS NOT NULL);

DROP POLICY IF EXISTS "docs_auth_read" ON documentos;
CREATE POLICY "docs_auth_read" ON documentos
  FOR SELECT TO authenticated
  USING (mi_rol() IS NOT NULL);

DROP POLICY IF EXISTS "correl_read" ON correlativos;
CREATE POLICY "correl_read" ON correlativos
  FOR SELECT TO authenticated
  USING (mi_rol() IS NOT NULL);

-- "perfil_self" se mantiene: un usuario inactivo puede leer su
-- propio perfil (el frontend lo usa para mostrar "sin acceso").

-- ── 4. Emisión transaccional ────────────────────────────────
-- SECURITY INVOKER a propósito: las políticas RLS de documentos
-- y correlativos siguen decidiendo quién puede emitir.
CREATE OR REPLACE FUNCTION emitir_documento(
  p_empresa_id              UUID,
  p_tipo                    TEXT,
  p_dni_trabajador          TEXT,
  p_nombre_trabajador       TEXT,
  p_cargo                   TEXT,
  p_fecha_ingreso           DATE,
  p_fecha_cese              DATE  DEFAULT NULL,
  p_motivo_cese             TEXT  DEFAULT NULL,
  p_fecha_falta             DATE  DEFAULT NULL,
  p_descripcion_falta       TEXT  DEFAULT NULL,
  p_dias_suspension         INT   DEFAULT NULL,
  p_fecha_inicio_suspension DATE  DEFAULT NULL,
  p_fecha_limite_descargos  DATE  DEFAULT NULL,
  p_campos_extra            JSONB DEFAULT NULL
)
RETURNS TABLE (id UUID, correlativo TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_anio   INT := EXTRACT(YEAR FROM now())::INT;
  v_numero INT;
  v_correl TEXT;
  v_emisor TEXT;
BEGIN
  IF p_tipo NOT IN ('CT','CL','AM','SU','CP','CD') THEN
    RAISE EXCEPTION 'Tipo de documento inválido: %', p_tipo;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM empresas e WHERE e.id = p_empresa_id) THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  IF COALESCE(TRIM(p_nombre_trabajador), '') = '' THEN
    RAISE EXCEPTION 'El nombre del trabajador es obligatorio';
  END IF;

  INSERT INTO correlativos (tipo, anio, ultimo)
  VALUES (p_tipo, v_anio, 1)
  ON CONFLICT (tipo, anio)
  DO UPDATE SET ultimo = correlativos.ultimo + 1
  RETURNING ultimo INTO v_numero;

  v_correl := p_tipo || '-' || LPAD(v_numero::TEXT, 4, '0') || '-' || v_anio;

  SELECT u.nombre INTO v_emisor FROM usuarios_perfil u WHERE u.id = auth.uid();

  RETURN QUERY
  INSERT INTO documentos (
    correlativo, tipo, estado, empresa_id,
    dni_trabajador, nombre_trabajador, cargo, fecha_ingreso,
    fecha_cese, motivo_cese, fecha_falta, descripcion_falta,
    dias_suspension, fecha_inicio_suspension, fecha_limite_descargos,
    campos_extra, emitido_por, emitido_por_nombre
  ) VALUES (
    v_correl, p_tipo, 'activo', p_empresa_id,
    p_dni_trabajador, TRIM(p_nombre_trabajador), p_cargo, p_fecha_ingreso,
    p_fecha_cese, p_motivo_cese, p_fecha_falta, p_descripcion_falta,
    p_dias_suspension, p_fecha_inicio_suspension, p_fecha_limite_descargos,
    COALESCE(p_campos_extra, '{}'::jsonb), auth.uid(), v_emisor
  )
  RETURNING documentos.id, documentos.correlativo;
END;
$$;

REVOKE ALL ON FUNCTION emitir_documento(UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, DATE, TEXT, INT, DATE, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION emitir_documento(UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, DATE, TEXT, INT, DATE, DATE, JSONB) TO authenticated;

-- La función suelta de correlativos ya no debe ser invocable
-- (permitía quemar números fuera de una emisión real).
DROP FUNCTION IF EXISTS siguiente_correlativo(UUID, TEXT, INT);

-- ── 5. Documentos inmutables + anulación auditada ───────────
-- Sin política de UPDATE, ningún cliente puede modificar un
-- documento emitido. La única vía es este RPC.
DROP POLICY IF EXISTS "docs_anular" ON documentos;

CREATE OR REPLACE FUNCTION anular_documento(p_id UUID, p_motivo TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(mi_rol(), '') NOT IN ('capital_humano', 'sig') THEN
    RAISE EXCEPTION 'No autorizado para anular documentos';
  END IF;

  UPDATE documentos
  SET estado           = 'anulado',
      motivo_anulacion = NULLIF(TRIM(COALESCE(p_motivo, '')), ''),
      anulado_en       = now(),
      anulado_por      = auth.uid()
  WHERE id = p_id AND estado = 'activo';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado o ya anulado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION anular_documento(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anular_documento(UUID, TEXT) TO authenticated;

-- ============================================================
-- FIN — Después de ejecutar, desplegar el frontend actualizado
-- (usa verificar_documento, emitir_documento y anular_documento).
-- ============================================================

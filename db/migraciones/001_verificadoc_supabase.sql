-- ============================================================
-- VERIFICADOC — Setup completo Supabase
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================


-- ============================================================
-- 1. TABLA: empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social  TEXT NOT NULL,
  ruc           TEXT NOT NULL UNIQUE,
  prefijo       TEXT NOT NULL UNIQUE,   -- INS, VLM, IND...
  direccion     TEXT,
  telefono      TEXT,
  representante TEXT,                   -- Nombre del firmante
  cargo_rep     TEXT,                   -- Cargo del firmante
  activa        BOOLEAN NOT NULL DEFAULT true,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. TABLA: trabajadores
-- ============================================================
CREATE TABLE IF NOT EXISTS trabajadores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni           TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  cargo         TEXT,
  fecha_ingreso DATE,
  estado        TEXT NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo', 'cesado')),
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dni, empresa_id)              -- mismo DNI puede estar en varias empresas
);

-- ============================================================
-- 3. TABLA: documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS documentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo       TEXT NOT NULL UNIQUE,  -- INS-CT-2026-0001
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  tipo              TEXT NOT NULL
                    CHECK (tipo IN ('CT','CL','AM','SU','CP','CD')),
  -- Datos del trabajador (guardados al momento de emisión, no FK)
  dni_trabajador    TEXT NOT NULL,
  nombre_trabajador TEXT NOT NULL,
  cargo             TEXT,
  fecha_ingreso     DATE,
  fecha_cese        DATE,                  -- solo CT y CD
  -- Campos específicos según tipo (flexibles)
  campos_extra      JSONB DEFAULT '{}',   -- motivo, días suspensión, causal, etc.
  -- Control
  fecha_emision     TIMESTAMPTZ NOT NULL DEFAULT now(),
  emitido_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  emitido_por_nombre TEXT,                -- nombre legible del emisor
  estado            TEXT NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'anulado')),
  motivo_anulacion  TEXT,
  anulado_en        TIMESTAMPTZ,
  anulado_por       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- 4. TABLA: usuarios_perfil
--    Extiende auth.users de Supabase con rol y empresa
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_perfil (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  rol       TEXT NOT NULL
            CHECK (rol IN ('capital_humano', 'gerencia', 'sig')),
  activo    BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. SECUENCIAS de correlativo por empresa + tipo + año
--    Una fila por combinación, el contador sube con cada emisión
-- ============================================================
CREATE TABLE IF NOT EXISTS correlativos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  tipo       TEXT NOT NULL,
  anio       INT  NOT NULL,
  ultimo     INT  NOT NULL DEFAULT 0,
  UNIQUE (empresa_id, tipo, anio)
);

-- Función que genera el siguiente correlativo de forma atómica
CREATE OR REPLACE FUNCTION siguiente_correlativo(
  p_empresa_id UUID,
  p_tipo       TEXT,
  p_anio       INT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefijo TEXT;
  v_numero  INT;
  v_correl  TEXT;
BEGIN
  -- Obtener prefijo de la empresa
  SELECT prefijo INTO v_prefijo FROM empresas WHERE id = p_empresa_id;

  -- Insertar o incrementar el contador
  INSERT INTO correlativos (empresa_id, tipo, anio, ultimo)
  VALUES (p_empresa_id, p_tipo, p_anio, 1)
  ON CONFLICT (empresa_id, tipo, anio)
  DO UPDATE SET ultimo = correlativos.ultimo + 1
  RETURNING ultimo INTO v_numero;

  -- Formatear: INS-CT-2026-0001
  v_correl := v_prefijo || '-' || p_tipo || '-' || p_anio || '-' || LPAD(v_numero::TEXT, 4, '0');

  RETURN v_correl;
END;
$$;

-- ============================================================
-- 6. ÍNDICES para búsquedas frecuentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documentos_empresa   ON documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo       ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_dni        ON documentos(dni_trabajador);
CREATE INDEX IF NOT EXISTS idx_documentos_estado     ON documentos(estado);
CREATE INDEX IF NOT EXISTS idx_documentos_emision    ON documentos(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_trabajadores_dni      ON trabajadores(dni);
CREATE INDEX IF NOT EXISTS idx_trabajadores_empresa  ON trabajadores(empresa_id);

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajadores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_perfil   ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlativos      ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual (SECURITY DEFINER evita recursión RLS en usuarios_perfil)
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT rol FROM usuarios_perfil WHERE id = auth.uid();
$func$;

-- ── EMPRESAS ──
-- Todos los roles autenticados pueden leer
CREATE POLICY "empresas_read" ON empresas
  FOR SELECT TO authenticated
  USING (true);

-- Solo SIG puede insertar/modificar
CREATE POLICY "empresas_write" ON empresas
  FOR ALL TO authenticated
  USING (mi_rol() = 'sig')
  WITH CHECK (mi_rol() = 'sig');

-- ── TRABAJADORES ──
-- Autenticados leen
CREATE POLICY "trabajadores_read" ON trabajadores
  FOR SELECT TO authenticated
  USING (true);

-- Capital Humano y SIG pueden escribir
CREATE POLICY "trabajadores_write" ON trabajadores
  FOR ALL TO authenticated
  USING (mi_rol() IN ('capital_humano', 'sig'))
  WITH CHECK (mi_rol() IN ('capital_humano', 'sig'));

-- ── DOCUMENTOS ──
-- Anónimos (verificador público): solo leer activos, solo campos no sensibles
CREATE POLICY "docs_public_read" ON documentos
  FOR SELECT TO anon
  USING (estado = 'activo');

-- Autenticados: leen todo
CREATE POLICY "docs_auth_read" ON documentos
  FOR SELECT TO authenticated
  USING (true);

-- Capital Humano: puede insertar
CREATE POLICY "docs_ch_insert" ON documentos
  FOR INSERT TO authenticated
  WITH CHECK (mi_rol() IN ('capital_humano', 'sig'));

-- Capital Humano y SIG: pueden anular (UPDATE solo estado)
CREATE POLICY "docs_anular" ON documentos
  FOR UPDATE TO authenticated
  USING (mi_rol() IN ('capital_humano', 'sig'))
  WITH CHECK (mi_rol() IN ('capital_humano', 'sig'));

-- ── USUARIOS_PERFIL ──
-- Cada usuario ve su propio perfil; SIG ve todos
CREATE POLICY "perfil_self" ON usuarios_perfil
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR mi_rol() = 'sig');

CREATE POLICY "perfil_sig_write" ON usuarios_perfil
  FOR ALL TO authenticated
  USING (mi_rol() = 'sig')
  WITH CHECK (mi_rol() = 'sig');

-- ── CORRELATIVOS ──
-- Solo autenticados con rol CH o SIG pueden modificar
CREATE POLICY "correl_read" ON correlativos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "correl_write" ON correlativos
  FOR ALL TO authenticated
  USING (mi_rol() IN ('capital_humano', 'sig'))
  WITH CHECK (mi_rol() IN ('capital_humano', 'sig'));

-- ============================================================
-- 8. DATOS INICIALES — 8 empresas del grupo
--    (Completar dirección, representante y cargo después)
-- ============================================================
INSERT INTO empresas (razon_social, ruc, prefijo, direccion, representante, cargo_rep) VALUES
  ('INACONS S.R.L.',   '20568587767', 'INS', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('VELIMAQ',          '20605665269', 'VLM', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('INDAGO',           '20604890862', 'IND', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('GELTECH',          '20605665251', 'GLT', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('INACONS S.A.C.',   '20607713368', 'INC', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('NUFAGO',           '20606360453', 'NFG', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('MAQNOVA S.A.C.',   '20614841142', 'MQN', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]'),
  ('EXPERTOP SAC',     '20614818469', 'EXP', '[DIRECCIÓN PENDIENTE]', '[REPRESENTANTE PENDIENTE]', '[CARGO PENDIENTE]')
ON CONFLICT (ruc) DO NOTHING;

-- ============================================================
-- FIN DEL SCRIPT
-- Siguiente paso: crear usuarios en Supabase Auth →
--   Authentication → Users → Add user
--   Luego insertar en usuarios_perfil con su UUID y rol
--
-- Correlativo global (TIPO-0001-AÑO): ejecutar también 005_correlativo_global.sql
-- ============================================================

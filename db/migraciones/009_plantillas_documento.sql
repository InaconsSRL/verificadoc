-- ============================================================
-- VERIFICADOC — Migración 009
-- Plantillas editables de documentos
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- El texto legal de cada tipo de documento deja de vivir en el
-- código: se edita desde el módulo "Plantillas" (gerencia y SIG).
-- Cada cambio guarda la versión anterior en plantillas_historial
-- (quién la reemplazó y cuándo), y cada documento emitido congela
-- en campos_extra el texto con el que salió: cambiar la plantilla
-- nunca altera documentos ya emitidos.
-- ============================================================

-- ── 1. Plantilla vigente por tipo ────────────────────────────
CREATE TABLE IF NOT EXISTS plantillas_documento (
  tipo                   TEXT PRIMARY KEY
                         CHECK (tipo IN ('CT','CL','AM','SU','CP','CD')),
  cuerpo                 TEXT NOT NULL,
  actualizado_por        UUID,
  actualizado_por_nombre TEXT,
  actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Historial de versiones ────────────────────────────────
CREATE TABLE IF NOT EXISTS plantillas_historial (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                   TEXT NOT NULL,
  cuerpo                 TEXT NOT NULL,          -- la versión que se reemplazó
  vigente_desde          TIMESTAMPTZ,
  reemplazada_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  reemplazada_por        UUID,
  reemplazada_por_nombre TEXT
);

CREATE INDEX IF NOT EXISTS idx_plantillas_historial_tipo
  ON plantillas_historial(tipo, reemplazada_en DESC);

-- ── 3. RLS ───────────────────────────────────────────────────
ALTER TABLE plantillas_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_historial ENABLE ROW LEVEL SECURITY;

-- Leer: cualquier usuario activo (Emitir necesita la plantilla)
DROP POLICY IF EXISTS "plantillas_read" ON plantillas_documento;
CREATE POLICY "plantillas_read" ON plantillas_documento
  FOR SELECT TO authenticated
  USING (mi_rol() IS NOT NULL);

-- Editar: gerencia y SIG (sin INSERT/DELETE: los 6 tipos son fijos)
DROP POLICY IF EXISTS "plantillas_write" ON plantillas_documento;
CREATE POLICY "plantillas_write" ON plantillas_documento
  FOR UPDATE TO authenticated
  USING (mi_rol() IN ('gerencia', 'sig'))
  WITH CHECK (mi_rol() IN ('gerencia', 'sig'));

-- Historial: solo lectura para gerencia/SIG; lo escribe el trigger
DROP POLICY IF EXISTS "plantillas_hist_read" ON plantillas_historial;
CREATE POLICY "plantillas_hist_read" ON plantillas_historial
  FOR SELECT TO authenticated
  USING (mi_rol() IN ('gerencia', 'sig'));

-- ── 4. Trigger: versiona y firma cada cambio ─────────────────
CREATE OR REPLACE FUNCTION log_cambio_plantilla()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor        UUID := auth.uid();
  v_actor_nombre TEXT;
BEGIN
  SELECT nombre INTO v_actor_nombre FROM usuarios_perfil WHERE id = v_actor;

  IF NEW.cuerpo IS DISTINCT FROM OLD.cuerpo THEN
    INSERT INTO plantillas_historial
      (tipo, cuerpo, vigente_desde, reemplazada_por, reemplazada_por_nombre)
    VALUES
      (OLD.tipo, OLD.cuerpo, OLD.actualizado_en, v_actor, v_actor_nombre);
  END IF;

  NEW.actualizado_por        := v_actor;
  NEW.actualizado_por_nombre := v_actor_nombre;
  NEW.actualizado_en         := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plantillas_version ON plantillas_documento;
CREATE TRIGGER trg_plantillas_version
  BEFORE UPDATE ON plantillas_documento
  FOR EACH ROW EXECUTE FUNCTION log_cambio_plantilla();

-- ── 5. Semilla: los textos que estaban en el código ──────────
INSERT INTO plantillas_documento (tipo, cuerpo) VALUES
('CT', 'Se expide el presente certificado a solicitud del interesado y para los fines que estime conveniente, dentro del plazo de ley. El presente documento se limita a constatar hechos laborales y no contiene apreciaciones sobre la conducta o el desempeño del trabajador.'),

('CL', 'Se expide la presente constancia a solicitud del interesado, para los trámites administrativos o personales que estime pertinentes, sin que ello implique el término de la relación laboral.'),

('AM', E'Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:\n\nCon fecha {{fecha_falta}}, usted ha incurrido en la siguiente falta:\n\n{{descripcion_falta}}\n\nEn consecuencia, se le aplica la presente AMONESTACIÓN ESCRITA, en cumplimiento al Reglamento Interno de Trabajo y la normativa laboral vigente.\n\nSe le exhorta a no reincidir en dichas conductas. En caso de reincidencia, la empresa se reserva el derecho de aplicar medidas disciplinarias más severas.'),

('SU', E'Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:\n\nCon fecha {{fecha_falta}}, usted ha incurrido en la siguiente falta grave:\n\n{{descripcion_falta}}\n\nEn consecuencia, se le impone una SUSPENSIÓN SIN GOCE DE HABER por {{dias_suspension}} día(s) calendario(s), comprendida entre el {{fecha_inicio_suspension}} y el {{fecha_fin_suspension}}.\n\nEsta medida se aplica en cumplimiento al Reglamento Interno de Trabajo y la Ley de Productividad y Competitividad Laboral.'),

('CP', E'Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:\n\nCon fecha {{fecha_falta}}, usted habría incurrido en la siguiente falta grave:\n\n{{descripcion_falta}}\n\nEn virtud de lo dispuesto en el artículo 31° de la Ley de Productividad y Competitividad Laboral, se le otorga un plazo de seis (6) días hábiles contados a partir de la recepción del presente, para que presente sus descargos por escrito.\n\nFecha límite para presentar descargos: {{fecha_limite_descargos}}.\n\nTranscurrido dicho plazo sin presentar descargos, o evaluados los mismos, la empresa tomará la decisión que corresponda conforme a ley.'),

('CD', E'Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:\n\nCon fecha {{fecha_falta}}, usted incurrió en la siguiente falta grave:\n\n{{descripcion_falta}}\n\nHabiendo seguido el procedimiento previsto en el artículo 31° del D.S. 003-97-TR y evaluados los descargos presentados (o vencido el plazo sin recibirlos), la empresa ha decidido DAR POR CONCLUIDO EL VÍNCULO LABORAL con efectividad al {{fecha_cese}}.\n\nSe le hace entrega de la presente carta según lo exige la normativa laboral vigente.')

ON CONFLICT (tipo) DO NOTHING;

-- ============================================================
-- FIN — Desplegar el frontend actualizado (módulo Plantillas y
-- vista previa de solo lectura en Emitir).
-- ============================================================

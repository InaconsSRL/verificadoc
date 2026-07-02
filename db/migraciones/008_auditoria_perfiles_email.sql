-- ============================================================
-- VERIFICADOC — Migración 008
-- Auditoría de perfiles + email visible en Admin
-- Ejecutar en: Supabase → SQL Editor → New query → Run
--
-- 1. usuarios_perfil.email: copia del correo de auth.users para
--    poder mostrarlo en el panel de administración.
-- 2. auditoria_perfiles: log inmutable de creación de perfiles y
--    cambios de rol/activo (quién, qué y cuándo). Se escribe por
--    trigger; ningún cliente puede insertar ni modificar el log.
-- ============================================================

-- ── 1. Email en el perfil ────────────────────────────────────
ALTER TABLE usuarios_perfil ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill desde auth.users para perfiles existentes
UPDATE usuarios_perfil p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- ── 2. Tabla de auditoría ────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria_perfiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id            UUID NOT NULL,
  perfil_nombre        TEXT,
  accion               TEXT NOT NULL
                       CHECK (accion IN ('creado', 'rol_cambiado', 'activado', 'desactivado')),
  rol_anterior         TEXT,
  rol_nuevo            TEXT,
  realizado_por        UUID,
  realizado_por_nombre TEXT,
  realizado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_perfiles_fecha
  ON auditoria_perfiles(realizado_en DESC);

ALTER TABLE auditoria_perfiles ENABLE ROW LEVEL SECURITY;

-- Solo SIG puede leer el log; nadie puede escribirlo desde el
-- cliente (sin política de INSERT/UPDATE/DELETE: escribe el trigger).
DROP POLICY IF EXISTS "auditoria_sig_read" ON auditoria_perfiles;
CREATE POLICY "auditoria_sig_read" ON auditoria_perfiles
  FOR SELECT TO authenticated
  USING (mi_rol() = 'sig');

-- ── 3. Trigger de auditoría sobre usuarios_perfil ────────────
-- SECURITY DEFINER: el log se escribe aunque el rol llamante no
-- tenga (ni deba tener) permisos sobre auditoria_perfiles.
CREATE OR REPLACE FUNCTION log_cambio_perfil()
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

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_perfiles
      (perfil_id, perfil_nombre, accion, rol_nuevo, realizado_por, realizado_por_nombre)
    VALUES
      (NEW.id, NEW.nombre, 'creado', NEW.rol, v_actor, v_actor_nombre);
    RETURN NEW;
  END IF;

  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    INSERT INTO auditoria_perfiles
      (perfil_id, perfil_nombre, accion, rol_anterior, rol_nuevo, realizado_por, realizado_por_nombre)
    VALUES
      (NEW.id, NEW.nombre, 'rol_cambiado', OLD.rol, NEW.rol, v_actor, v_actor_nombre);
  END IF;

  IF NEW.activo IS DISTINCT FROM OLD.activo THEN
    INSERT INTO auditoria_perfiles
      (perfil_id, perfil_nombre, accion, realizado_por, realizado_por_nombre)
    VALUES
      (NEW.id, NEW.nombre,
       CASE WHEN NEW.activo THEN 'activado' ELSE 'desactivado' END,
       v_actor, v_actor_nombre);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_perfiles ON usuarios_perfil;
CREATE TRIGGER trg_auditoria_perfiles
  AFTER INSERT OR UPDATE ON usuarios_perfil
  FOR EACH ROW EXECUTE FUNCTION log_cambio_perfil();

-- ============================================================
-- FIN — Nota: cuando el cambio lo hace la edge function con la
-- service key, realizado_por queda NULL y el panel lo muestra
-- como "Sistema".
-- ============================================================

-- Corrige error 54001 "stack depth limit exceeded":
-- mi_rol() leía usuarios_perfil desde políticas RLS de la misma tabla → recursión infinita.
-- SECURITY DEFINER hace que la función omita RLS al leer el rol.

CREATE OR REPLACE FUNCTION mi_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT rol FROM usuarios_perfil WHERE id = auth.uid();
$func$;

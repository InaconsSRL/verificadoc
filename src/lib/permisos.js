// Fuente única de permisos por rol en el frontend.
// Las rutas (App.jsx), el menú (Layout.jsx) y los botones por página
// derivan de aquí: un cambio de permisos se hace en un solo lugar.
// La autoridad real sigue siendo RLS/RPCs en la base de datos.
export const PERMISOS = {
  emitir:     ['capital_humano', 'sig'],
  historial:  ['capital_humano', 'gerencia', 'sig'],
  anular:     ['capital_humano', 'sig'],
  plantillas: ['gerencia', 'sig'],
  admin:      ['sig'],
}

export function puede(rol, permiso) {
  return PERMISOS[permiso]?.includes(rol) ?? false
}

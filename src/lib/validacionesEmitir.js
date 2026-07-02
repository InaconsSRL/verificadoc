// Validaciones de coherencia de fechas antes de emitir.
// Las fechas llegan como strings ISO (YYYY-MM-DD): comparan bien
// lexicográficamente sin convertir a Date (evita líos de zona horaria).
export function validarFechasEmision(tipo, trab, campos) {
  const errores = []
  const ingreso = trab?.fecha_ingreso

  if (ingreso && campos?.fecha_cese && campos.fecha_cese < ingreso) {
    errores.push('La fecha de cese no puede ser anterior a la fecha de ingreso.')
  }

  if (ingreso && campos?.fecha_falta && campos.fecha_falta < ingreso) {
    errores.push('La fecha de la falta no puede ser anterior a la fecha de ingreso.')
  }

  if (campos?.fecha_inicio_suspension && campos?.fecha_falta
      && campos.fecha_inicio_suspension < campos.fecha_falta) {
    errores.push('El inicio de la suspensión no puede ser anterior a la fecha de la falta.')
  }

  if (tipo === 'CD' && campos?.fecha_cese && campos?.fecha_falta
      && campos.fecha_cese < campos.fecha_falta) {
    errores.push('La fecha de cese no puede ser anterior a la fecha de la falta.')
  }

  return errores
}

const DOMINIOS_TEMPORALES = [
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "trashmail.com",
];

export function validarDni(dni) {
  return /^\d{8}$/.test(String(dni).trim());
}

export function validarTelefono(telefono) {
  return /^\d{9}$/.test(String(telefono).trim());
}

export function validarTextoSeguro(texto) {
  const valor = String(texto ?? "").trim();
  return valor.length > 0 && !/[<>]/.test(valor);
}

export function validarCorreoPadre(correo) {
  const valor = String(correo ?? "").trim().toLowerCase();

  if (!valor) {
    return true;
  }

  const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  const dominio = valor.split("@")[1];

  return formatoValido && !DOMINIOS_TEMPORALES.includes(dominio);
}

// Simulación de las llamadas API al backend
// En producción, aquí se usaría apiClient.js para llamar a /api/estudiantes/...

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function validarDni(dni) {
  await delay(600);
  
  if (!/^\d{8}$/.test(dni)) {
    throw new Error("El DNI debe contener exactamente 8 dígitos numéricos.");
  }

  // Mock de respuesta exitosa del backend basada en el contrato de API del plan
  return {
    dni: dni,
    nombres: "Estudiante de Prueba", // En un caso real vendría de la BD
    programa: "CLUB DE TAREAS MATEMATICA",
    horario: "15:20 - 17:20",
    estadoPago: "Validado", // Cambiar a "Pendiente" para probar la validación de seguridad
    estadoInscripcion: "Inscrito"
  };
}

export async function validarQR(codigo) {
  await delay(500);
  if (!codigo.trim()) throw new Error("El código QR proporcionado no es válido.");
  // Simula la decodificación del QR a un DNI
  return validarDni("12345678");
}

export async function registrarAsistencia(dni, observacion) {
  await delay(600);
  // Seguridad: Validar texto seguro sin HTML
  if (/<[a-z][\s\S]*>/i.test(observacion)) {
    throw new Error("La observación contiene caracteres no permitidos (etiquetas HTML).");
  }
  return { success: true, fechaRegistro: new Date().toISOString() };
}
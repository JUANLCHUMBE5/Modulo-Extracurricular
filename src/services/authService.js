import { mockDb, syncMockDbFromStorage } from "./localDbClient";

const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms));

const usuariosInternos = {
  admin: { role: "administrador", name: "Administrador General" },
  secre: { role: "secretaria", name: "Secretaria" },
  caja: { role: "caja", name: "Caja" },
  coord: { role: "coordinacion", name: "Coordinación" },
  aux: { role: "auxiliar", name: "Auxiliar" },
  dir: { role: "direccion", name: "Dirección" },
  profe: { role: "coordinacion", name: "Profesor" },
};

export const loginPersonal = async (username, password) => {
  // Temporal: reemplazar por POST /api/auth/login cuando exista el backend real.
  await delay();

  const usuarioLimpio = String(username || "").trim().toLowerCase();
  const user = usuariosInternos[usuarioLimpio];

  if (user && password === "1234") {
    return { success: true, user: { username: usuarioLimpio, ...user } };
  }

  return { success: false, message: "Usuario o contraseña incorrectos." };
};

export const loginPadre = async (dni, fechaNacimiento) => {
  // Temporal: reemplazar por POST /api/padres/login cuando exista el backend real.
  await delay();
  await syncMockDbFromStorage();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(dniLimpio)) {
    return { success: false, message: "El DNI debe tener 8 numeros." };
  }

  const estudiante = mockDb.estudiantes[dniLimpio];
  if (!estudiante || estudiante.fechaNacimiento !== fechaNacimiento) {
    return { success: false, message: "DNI o fecha de nacimiento incorrectos." };
  }

  return {
    success: true,
    user: {
      username: dniLimpio,
      role: "padres",
      name: "Padre de familia",
      dni: dniLimpio,
      estudiante: estudiante.nombres,
    },
  };
};

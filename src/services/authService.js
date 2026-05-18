import { apiDb, syncApiDb } from "./dbApi";

const delay = (ms = 650) => new Promise((resolve) => setTimeout(resolve, ms));

const aliasesUsuario = {
  secre: "secretaria",
  coord: "coordinacion",
};

const rolesSistema = {
  Administrador: "administrador",
  Secretaria: "secretaria",
  Caja: "caja",
  Coordinacion: "coordinacion",
  Auxiliar: "auxiliar",
  Direccion: "direccion",
};

export const loginPersonal = async (username, password) => {
  await delay();
  await syncApiDb();

  const usuarioLimpio = String(username || "").trim().toLowerCase();
  const usuarioBuscado = aliasesUsuario[usuarioLimpio] || usuarioLimpio;
  const usuarios = Array.isArray(apiDb.usuarios) ? apiDb.usuarios : [];
  const usuario = usuarios.find((item) =>
    String(item.usuario || "").trim().toLowerCase() === usuarioBuscado
  );

  const contrasenaGuardada = String(usuario?.contrasena || "1234");

  if (usuario && usuario.estado !== "Inactivo" && String(password) === contrasenaGuardada) {
    return {
      success: true,
      user: {
        username: usuario.usuario,
        role: rolesSistema[usuario.rol] || String(usuario.rol || "").toLowerCase(),
        name: usuario.nombre,
      },
    };
  }

  return { success: false, message: "Usuario o contraseña incorrectos." };
};

export const loginPadre = async (dni, fechaNacimiento) => {
  // Temporal: reemplazar por POST /api/padres/login cuando exista el backend real.
  await delay();
  await syncApiDb();

  const dniLimpio = String(dni || "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(dniLimpio)) {
    return { success: false, message: "El DNI debe tener 8 numeros." };
  }

  const estudiante = apiDb.estudiantes[dniLimpio];
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

import { apiDb, nextApiId, saveApiDb, syncApiDb } from "../../services/dbApi";

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listarUsuarios() {
  await delay(300);
  await syncApiDb();
  return Array.isArray(apiDb.usuarios) ? [...apiDb.usuarios] : [];
}

export async function crearUsuario(datos) {
  await delay(600);
  await syncApiDb();
  
  // Validar si usuario ya existe
  const existe = apiDb.usuarios.some(u => u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso.");

  const nuevoUsuario = {
    id: `USR-${Date.now()}`,
    estado: "Activo",
    ...datos
  };

  apiDb.usuarios.push(nuevoUsuario);
  await saveApiDb();
  return nuevoUsuario;
}

export async function editarUsuario(id, datos) {
  await delay(600);
  await syncApiDb();
  
  const index = apiDb.usuarios.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Usuario no encontrado.");

  // Validar si el nuevo username ya existe en OTRO usuario
  const existe = apiDb.usuarios.some(u => u.id !== id && u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso por otra persona.");

  apiDb.usuarios[index] = {
    ...apiDb.usuarios[index],
    ...datos,
  };

  await saveApiDb();
  return apiDb.usuarios[index];
}

export async function cambiarEstadoUsuario(id, nuevoEstado) {
  await delay(400);
  await syncApiDb();
  
  const usuario = apiDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");
  
  // Evitar desactivar al unico administrador (opcional, pero buena practica)
  if (nuevoEstado === "Inactivo" && usuario.rol === "Administrador") {
    const adminsActivos = apiDb.usuarios.filter(u => u.rol === "Administrador" && u.estado === "Activo");
    if (adminsActivos.length <= 1) {
      throw new Error("No puede desactivar al unico administrador activo.");
    }
  }

  usuario.estado = nuevoEstado;
  await saveApiDb();
  return usuario;
}

export async function resetearContrasenaUsuario(id) {
  await delay(400);
  await syncApiDb();

  const usuario = apiDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");

  usuario.contrasena = "123456";
  await saveApiDb();
  return usuario;
}

import { mockDb, nextMockId, saveMockDb, syncMockDbFromStorage } from "../../services/localDbClient";

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listarUsuarios() {
  await delay(300);
  await syncMockDbFromStorage();
  return [...mockDb.usuarios];
}

export async function crearUsuario(datos) {
  await delay(600);
  await syncMockDbFromStorage();
  
  // Validar si usuario ya existe
  const existe = mockDb.usuarios.some(u => u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso.");

  const nuevoUsuario = {
    id: `USR-${Date.now()}`,
    estado: "Activo",
    ...datos
  };

  mockDb.usuarios.push(nuevoUsuario);
  saveMockDb();
  return nuevoUsuario;
}

export async function editarUsuario(id, datos) {
  await delay(600);
  await syncMockDbFromStorage();
  
  const index = mockDb.usuarios.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Usuario no encontrado.");

  // Validar si el nuevo username ya existe en OTRO usuario
  const existe = mockDb.usuarios.some(u => u.id !== id && u.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (existe) throw new Error("El nombre de usuario ya esta en uso por otra persona.");

  mockDb.usuarios[index] = {
    ...mockDb.usuarios[index],
    ...datos,
  };

  saveMockDb();
  return mockDb.usuarios[index];
}

export async function cambiarEstadoUsuario(id, nuevoEstado) {
  await delay(400);
  await syncMockDbFromStorage();
  
  const usuario = mockDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");
  
  // Evitar desactivar al unico administrador (opcional, pero buena practica)
  if (nuevoEstado === "Inactivo" && usuario.rol === "Administrador") {
    const adminsActivos = mockDb.usuarios.filter(u => u.rol === "Administrador" && u.estado === "Activo");
    if (adminsActivos.length <= 1) {
      throw new Error("No puede desactivar al unico administrador activo.");
    }
  }

  usuario.estado = nuevoEstado;
  saveMockDb();
  return usuario;
}

export async function resetearContrasenaUsuario(id) {
  await delay(400);
  await syncMockDbFromStorage();

  const usuario = mockDb.usuarios.find((item) => item.id === id);
  if (!usuario) throw new Error("Usuario no encontrado.");

  usuario.contrasena = "123456";
  saveMockDb();
  return usuario;
}

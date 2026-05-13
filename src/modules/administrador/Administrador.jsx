import { useEffect, useState } from "react";
import {
  Users, LogOut, Plus, Search,
  CheckCircle2, AlertCircle, Loader2, Edit3, X,
  ShieldAlert
} from "lucide-react";
import { Alert as MantineAlert } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  listarUsuarios, crearUsuario, editarUsuario, cambiarEstadoUsuario, resetearContrasenaUsuario
} from "./administradorService";
import "./Administrador.css";

const formInicial = { nombre: "", usuario: "", rol: "Secretaria", contrasena: "", estado: "Activo" };
const roles = ["Administrador", "Secretaria", "Caja", "Coordinacion", "Auxiliar", "Direccion"];

// --- Componentes Reutilizables ---

const Mensaje = ({ mensaje, tipo }) => {
  if (!mensaje) return null;
  return (
    <MantineAlert
      className="admin-message"
      color={tipo === "success" ? "sanrafael" : "orange"}
      radius="md"
      icon={tipo === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
    >
      {mensaje}
    </MantineAlert>
  );
};

const getPillClass = (estado) => {
  if (estado === "Activo") return "admin-pill-success";
  if (estado === "Regular") return "admin-pill-warning";
  return "admin-pill-disabled";
};

const TablaUsuarios = ({ usuarios, cargando, onEditar, onCambiarEstado, onResetear }) => {
  if (cargando) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        <Loader2 className="admin-spin" size={28} style={{ margin: "0 auto 12px" }} />
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return <div className="admin-empty"><Users size={24} /><p>No se encontraron usuarios.</p></div>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuario</th><th>Nombre completo</th><th>Rol</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td><strong>{u.usuario}</strong></td>
              <td>{u.nombre}</td>
              <td>{u.rol}</td>
              <td>
                <span className={`admin-pill ${getPillClass(u.estado)}`}>
                  {u.estado}
                </span>
              </td>
              <td>
                <div className="admin-table-actions">
                  <button className="admin-action-button admin-action-edit" onClick={() => onEditar(u)}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    className={`admin-action-button ${u.estado === "Activo" ? "admin-action-disable" : "admin-action-enable"}`}
                    onClick={() => onCambiarEstado(u)}
                  >
                    {u.estado === "Activo" ? "Desactivar" : "Activar"}
                  </button>
                  <button className="admin-action-button admin-action-reset" onClick={() => onResetear(u)}>
                    Reset
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ModalUsuario = ({ show, modoEditar, form, setForm, guardar, guardando, cerrar, mensaje, tipoMsg }) => {
  if (!show) return null;

  const actualizar = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  return (
    <div className="admin-modal-overlay" onClick={cerrar}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <span className="admin-modal-icon"><Users size={20} /></span>
            <div>
              <h2>{modoEditar ? "Editar usuario" : "Nuevo usuario"}</h2>
              <p>Complete los datos del personal.</p>
            </div>
          </div>
          <button className="admin-modal-close" onClick={cerrar}><X size={20} /></button>
        </div>
        
        <div className="admin-modal-body">
          <Mensaje mensaje={mensaje} tipo={tipoMsg} />
          
          <form id="form-usuario" onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="admin-field">
              <label>Nombre completo *</label>
              <input value={form.nombre} onChange={e => actualizar("nombre", e.target.value)} placeholder="Ej: Juan Pérez" />
            </div>
            <div className="admin-field">
              <label>Nombre de usuario *</label>
              <input value={form.usuario} onChange={e => actualizar("usuario", e.target.value)} placeholder="Ej: jperez" autoComplete="off" />
            </div>
            <div className="admin-field admin-modal-grid">
              <div>
                <label>Rol asignado *</label>
                <select value={form.rol} onChange={e => actualizar("rol", e.target.value)}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label>Estado actual</label>
                <select value={form.estado} onChange={e => actualizar("estado", e.target.value)}>
                  <option value="Activo">Activo (Verde)</option>
                  <option value="Regular">Regular (Amarillo)</option>
                  <option value="Inactivo">Inactivo (Rojo)</option>
                </select>
              </div>
            </div>
            <div className="admin-field">
              <label>{modoEditar ? "Nueva contraseña (dejar en blanco para no cambiar)" : "Contraseña *"}</label>
              <input type="password" value={form.contrasena} onChange={e => actualizar("contrasena", e.target.value)} placeholder="******" autoComplete="new-password" />
            </div>
          </form>
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="admin-secondary-button" onClick={cerrar}>Cancelar</button>
          <button type="submit" form="form-usuario" className="admin-primary-button" disabled={guardando}>
            {guardando ? <Loader2 className="admin-spin" size={17} /> : <CheckCircle2 size={17} />}
            <span>{guardando ? "Guardando" : modoEditar ? "Actualizar" : "Crear usuario"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal ---

export default function Administrador({ onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  
  const [msg, setMsg] = useState({ texto: "", tipo: "error" });
  const [cargando, setCargando] = useState(false);

  const [modal, setModal] = useState({ show: false, editar: false, guardando: false });
  const [form, setForm] = useState(formInicial);

  useEffect(() => { cargarDatos(); }, []);

  const mostrarMsg = (texto, tipo = "error") => {
    setMsg({ texto, tipo });
    notifications.show({
      color: tipo === "success" ? "sanrafael" : "orange",
      title: tipo === "success" ? "Administrador" : "Revisar datos",
      message: texto,
    });
    if (tipo === "success") setTimeout(() => setMsg({ texto: "", tipo: "error" }), 4000);
  };

  const cargarDatos = async () => {
    setCargando(true);
    try { setUsuarios(await listarUsuarios()); } 
    catch (err) { mostrarMsg("Error al cargar usuarios: " + err.message); }
    setCargando(false);
  };

  const usuariosFiltrados = usuarios.filter(u => 
    (u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.usuario.toLowerCase().includes(busqueda.toLowerCase())) &&
    (filtroRol === "todos" || u.rol === filtroRol)
  );

  const abrirModal = (u = null) => {
    setForm(u ? { ...u, contrasena: "" } : formInicial);
    setModal({ show: true, editar: !!u, guardando: false });
    setMsg({ texto: "", tipo: "error" });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return mostrarMsg("El nombre completo es obligatorio.");
    if (!form.usuario.trim()) return mostrarMsg("El nombre de usuario es obligatorio.");
    if (!modal.editar && !form.contrasena.trim()) return mostrarMsg("La contraseña es obligatoria.");

    setModal(m => ({ ...m, guardando: true }));
    try {
      const datos = { nombre: form.nombre.trim(), usuario: form.usuario.trim().toLowerCase(), rol: form.rol, estado: form.estado };
      if (form.contrasena.trim()) datos.contrasena = form.contrasena.trim();

      modal.editar ? await editarUsuario(form.id, datos) : await crearUsuario(datos);
      
      mostrarMsg(`Usuario ${modal.editar ? "actualizado" : "creado"} correctamente.`, "success");
      await cargarDatos();
      setModal(m => ({ ...m, show: false }));
    } catch (err) { mostrarMsg(err.message); }
    setModal(m => ({ ...m, guardando: false }));
  };

  const alternarEstado = async (usuario) => {
    const nuevoEstado = usuario.estado === "Activo" ? "Inactivo" : "Activo";
    try {
      await cambiarEstadoUsuario(usuario.id, nuevoEstado);
      mostrarMsg(`Usuario ${nuevoEstado === "Activo" ? "activado" : "desactivado"} correctamente.`, "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  };

  const resetearContrasena = async (usuario) => {
    try {
      await resetearContrasenaUsuario(usuario.id);
      mostrarMsg(`Contraseña de ${usuario.usuario} reiniciada a 123456.`, "success");
      await cargarDatos();
    } catch (err) {
      mostrarMsg(err.message);
    }
  };

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-copy">
            <span>Panel Administrador</span>
            <h1>Usuarios y accesos del sistema</h1>
          </div>
          <button className="admin-secondary-button" type="button" onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </header>
        
        <section className="admin-workspace admin-workspace-single">
          <article className="admin-card admin-users-card">
            <div className="admin-card-title">
              <span className="admin-title-icon"><ShieldAlert size={21} /></span>
              <div><h2>Usuarios internos</h2><p>Administre los accesos, roles y contraseñas del personal.</p></div>
            </div>

            <div className="admin-form">
              <div className="admin-filtros-row">
                <div className="admin-field admin-field-grow">
                  <label><Search size={14} /> Buscar</label>
                  <input placeholder="Buscar por nombre o usuario..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <div className="admin-field">
                  <label>Rol</label>
                  <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                    <option value="todos">Todos los roles</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button className="admin-primary-button" type="button" onClick={() => abrirModal()}>
                  <Plus size={17} /><span>Nuevo usuario</span>
                </button>
              </div>
            </div>

            {!modal.show && <Mensaje mensaje={msg.texto} tipo={msg.tipo} />}

            <TablaUsuarios 
              usuarios={usuariosFiltrados} 
              cargando={cargando} 
              onEditar={abrirModal} 
              onCambiarEstado={alternarEstado}
              onResetear={resetearContrasena}
            />
          </article>

        </section>

        <ModalUsuario 
          show={modal.show} modoEditar={modal.editar} form={form} setForm={setForm} 
          guardar={guardar} guardando={modal.guardando} cerrar={() => setModal(m => ({ ...m, show: false }))} 
          mensaje={msg.texto} tipoMsg={msg.tipo} 
        />
      </main>
    </div>
  );
}

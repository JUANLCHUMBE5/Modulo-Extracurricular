import { useEffect, useState, useMemo } from "react";
import {
  IconCircleCheck as CheckCircle2,
  IconEdit as Edit3,
  IconLoader2 as Loader2,
  IconLogout as LogOut,
  IconPlus as Plus,
  IconSearch as Search,
  IconShieldLock as ShieldLock,
  IconUsers as Users,
  IconX as X,
  IconKey as Key,
  IconUserCheck as UserCheck,
  IconUserOff as UserOff,
  IconRefresh as Refresh,
  IconChevronDown as ChevronDown,
  IconEye as Eye,
  IconEyeOff as EyeOff,
  IconUserPlus as UserPlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstadoUsuario,
  resetearContrasenaUsuario,
} from "./administradorService";
import "./Administrador.css";

const formInicial = {
  nombre: "",
  usuario: "",
  rol: "Secretaria",
  contrasena: "",
  estado: "Activo",
};

const roles = [
  "Administrador",
  "Secretaria",
  "Caja",
  "Coordinacion",
  "Auxiliar",
  "Direccion",
];

const LOGO_COLEGIO_SRC = "/assets/padres/logo.png.jpg";



// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ label, value, icon: Icon, delay = 0 }) => (
  <div className="adm-stat-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="adm-stat-icon"><Icon size={20} /></div>
    <div>
      <p className="adm-stat-label">{label}</p>
      <p className="adm-stat-value">{value}</p>
    </div>
    <div className="adm-stat-glow" />
  </div>
);

// â”€â”€ Rol Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RolBadge = ({ rol }) => (
  <span className="adm-rol-badge" data-rol={rol}>
    <span className="adm-rol-dot" />
    {rol}
  </span>
);

// â”€â”€ Estado Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EstadoBadge = ({ estado }) => (
  <span className="adm-estado-badge" data-estado={estado}>
    <span className="adm-estado-dot" />
    {estado}
  </span>
);

// â”€â”€ Avatar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Avatar = ({ nombre = "" }) => {
  const initials = nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return <div className="adm-avatar">{initials || "?"}</div>;
};

// â”€â”€ User Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UserRow = ({ u, onEditar, onCambiarEstado, onResetear, visible }) => {
  return (
    <tr className={`adm-user-row ${visible ? "adm-row-visible" : ""}`}>
      <td>
        <div className="adm-user-cell">
          <Avatar nombre={u.nombre} />
          <div>
            <p className="adm-user-name">{u.nombre}</p>
            <p className="adm-user-handle">@{u.usuario}</p>
          </div>
        </div>
      </td>
      <td><RolBadge rol={u.rol} /></td>
      <td><EstadoBadge estado={u.estado} /></td>
      <td>
        <div className="adm-action-group">
          <button className="adm-btn-icon adm-btn-edit" onClick={() => onEditar(u)} title="Editar">
            <Edit3 size={15} />
          </button>
          <button
            className={`adm-btn-icon ${u.estado === "Activo" ? "adm-btn-disable" : "adm-btn-enable"}`}
            onClick={() => onCambiarEstado(u)}
            title={u.estado === "Activo" ? "Desactivar" : "Activar"}
          >
            {u.estado === "Activo" ? <UserOff size={15} /> : <UserCheck size={15} />}
          </button>
          <button className="adm-btn-icon adm-btn-reset" onClick={() => onResetear(u)} title="Reset contrasena">
            <Key size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// â”€â”€ Tabla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TablaUsuarios = ({ usuarios, cargando, onEditar, onCambiarEstado, onResetear }) => {
  if (cargando) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Cargando usuarios...</p>
      </div>
    );
  }
  if (usuarios.length === 0) {
    return (
      <div className="adm-empty">
        <div className="adm-empty-icon"><Users size={32} /></div>
        <p>No se encontraron usuarios</p>
        <span>Intenta cambiar los filtros de busqueda</span>
      </div>
    );
  }
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u, i) => (
            <UserRow
              key={u.id}
              u={u}
              onEditar={onEditar}
              onCambiarEstado={onCambiarEstado}
              onResetear={onResetear}
              visible={true}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ModalUsuario = ({ show, modoEditar, form, setForm, guardar, guardando, cerrar }) => {
  const [showPass, setShowPass] = useState(false);
  if (!show) return null;
  const actualizar = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  return (
    <div className="adm-overlay" onClick={cerrar}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="adm-modal-header">
          <div className="adm-modal-hicon">
            <UserPlus size={22} />
          </div>
          <div>
            <h2>{modoEditar ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p>Complete la informacion del personal</p>
          </div>
          <button className="adm-modal-close" onClick={cerrar}><X size={18} /></button>
        </div>

        {/* Body */}
        <form id="form-usuario" onSubmit={guardar}>
          <div className="adm-modal-body">

            <div className="adm-mfield">
              <label>Nombre completo <span>*</span></label>
              <input
                value={form.nombre}
                onChange={e => actualizar("nombre", e.target.value)}
                  placeholder="Ej: Juan Perez Gomez"
              />
            </div>

            <div className="adm-mfield">
              <label>Nombre de usuario <span>*</span></label>
              <div className="adm-input-prefix">
                <span>@</span>
                <input
                  value={form.usuario}
                  onChange={e => actualizar("usuario", e.target.value)}
                  placeholder="jperez"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="adm-modal-grid2">
              <div className="adm-mfield">
                <label>Rol asignado <span>*</span></label>
                <div className="adm-select-wrap">
                  <select value={form.rol} onChange={e => actualizar("rol", e.target.value)}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="adm-select-arrow" />
                </div>
              </div>
              <div className="adm-mfield">
                <label>Estado</label>
                <div className="adm-select-wrap">
                  <select value={form.estado} onChange={e => actualizar("estado", e.target.value)}>
                    <option value="Activo">Activo</option>
                    <option value="Regular">Regular</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                  <ChevronDown size={14} className="adm-select-arrow" />
                </div>
              </div>
            </div>

            <div className="adm-mfield">
              <label>
                {modoEditar ? "Nueva contrasena (vacio = sin cambio)" : "Contrasena *"}
              </label>
              <div className="adm-pass-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.contrasena}
                  onChange={e => actualizar("contrasena", e.target.value)}
                  placeholder="********"
                  autoComplete="new-password"
                />
                <button type="button" className="adm-pass-toggle" onClick={() => setShowPass(s => !s)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn-cancel" onClick={cerrar}>Cancelar</button>
            <button type="submit" className="adm-btn-save" disabled={guardando}>
              {guardando
                ? <><Loader2 size={16} className="adm-spin-icon" /> Guardando...</>
                : <><CheckCircle2 size={16} /> {modoEditar ? "Actualizar" : "Crear usuario"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// â”€â”€ Componente Principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Administrador({ onLogout }) {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState({ show: false, editar: false, guardando: false });
  const [form, setForm] = useState(formInicial);

  useEffect(() => { cargarDatos(); }, []);

  const notify = (message, type = "error") => {
    if (type === "success") {
      toast.success("Listo", { description: message });
    } else {
      toast.error("Atencion", { description: message });
    }
  };

  const cargarDatos = async () => {
    setCargando(true);
    try { setUsuarios(await listarUsuarios()); }
    catch (err) { notify("Error al cargar: " + err.message); }
    setCargando(false);
  };

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      (u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
       u.usuario.toLowerCase().includes(busqueda.toLowerCase())) &&
      (filtroRol === "todos" || u.rol === filtroRol) &&
      (filtroEstado === "todos" || u.estado === filtroEstado)
    ), [usuarios, busqueda, filtroRol, filtroEstado]);

  // Stats
  const totalActivos  = usuarios.filter(u => u.estado === "Activo").length;
  const totalInactivos = usuarios.filter(u => u.estado === "Inactivo").length;
  const totalRoles    = new Set(usuarios.map(u => u.rol)).size;

  const abrirModal = (u = null) => {
    setForm(u ? { ...u, contrasena: "" } : formInicial);
    setModal({ show: true, editar: !!u, guardando: false });
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return notify("El nombre completo es obligatorio.");
    if (!form.usuario.trim()) return notify("El nombre de usuario es obligatorio.");
    if (!modal.editar && !form.contrasena.trim()) return notify("La contrasena es obligatoria.");

    setModal(m => ({ ...m, guardando: true }));
    try {
      const datos = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim().toLowerCase(),
        rol: form.rol,
        estado: form.estado,
      };
      if (form.contrasena.trim()) datos.contrasena = form.contrasena.trim();
      modal.editar ? await editarUsuario(form.id, datos) : await crearUsuario(datos);
      notify(`Usuario ${modal.editar ? "actualizado" : "creado"} correctamente.`, "success");
      await cargarDatos();
      setModal(m => ({ ...m, show: false }));
    } catch (err) { notify(err.message); }
    setModal(m => ({ ...m, guardando: false }));
  };

  const alternarEstado = async (u) => {
    const nuevo = u.estado === "Activo" ? "Inactivo" : "Activo";
    try {
      await cambiarEstadoUsuario(u.id, nuevo);
      notify(`Usuario ${nuevo === "Activo" ? "activado" : "desactivado"}.`, "success");
      await cargarDatos();
    } catch (err) { notify(err.message); }
  };

  const resetear = async (u) => {
    try {
      await resetearContrasenaUsuario(u.id);
      notify(`Contrasena de @${u.usuario} reiniciada a 123456.`, "success");
    } catch (err) { notify(err.message); }
  };

  return (
    <div className="adm-root">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-brand" aria-label="Colegio San Rafael">
          <img className="adm-brand-logo" src={LOGO_COLEGIO_SRC} alt="Colegio San Rafael" />
        </div>
        <p className="adm-module-label">Modulo Administrador</p>

        <nav className="adm-nav">
          <button className="adm-nav-item adm-nav-active">
            <Users size={18} />
            <span>Usuarios y accesos</span>
            <span className="adm-nav-badge">{usuarios.length}</span>
          </button>
        </nav>

        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="adm-main">
        {/* Topbar */}
        <header className="adm-topbar">
          <div>
            <p className="adm-topbar-sub">Panel de control</p>
            <h1>Administracion de usuarios</h1>
          </div>
          <div className="adm-topbar-actions">
            <button className="adm-new-btn" onClick={() => abrirModal()}>
              <Plus size={18} />
              Nuevo usuario
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="adm-stats">
          <StatCard label="Total usuarios" value={usuarios.length} icon={Users}     delay={0}   />
          <StatCard label="Activos"        value={totalActivos}   icon={UserCheck}  delay={60}  />
          <StatCard label="Inactivos"      value={totalInactivos} icon={UserOff}    delay={120} />
          <StatCard label="Roles unicos"   value={totalRoles}     icon={ShieldLock} delay={180} />
        </section>

        {/* Tabla card */}
        <section className="adm-content">
          <div className="adm-card-header">
            <div>
              <h2>Directorio de usuarios</h2>
              <p>{filtrados.length} de {usuarios.length} usuarios</p>
            </div>
            <button className="adm-refresh-btn" onClick={cargarDatos} title="Actualizar">
              <Refresh size={16} />
            </button>
          </div>

          {/* Filtros */}
          <div className="adm-filters">
            <div className="adm-search-box">
              <Search size={16} />
              <input
                placeholder="Buscar por nombre o usuario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className="adm-search-clear" onClick={() => setBusqueda("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="adm-filter-group">
              <div className="adm-select-wrap adm-filter-select">
                <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                  <option value="todos">Todos los roles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="adm-select-arrow" />
              </div>

              <div className="adm-select-wrap adm-filter-select">
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="todos">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="Regular">Regular</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
                <ChevronDown size={14} className="adm-select-arrow" />
              </div>
            </div>
          </div>

          {/* Tabla */}
          <TablaUsuarios
            usuarios={filtrados}
            cargando={cargando}
            onEditar={abrirModal}
            onCambiarEstado={alternarEstado}
            onResetear={resetear}
          />
        </section>
      </main>

      {/* Modal */}
      <ModalUsuario
        show={modal.show}
        modoEditar={modal.editar}
        form={form}
        setForm={setForm}
        guardar={guardar}
        guardando={modal.guardando}
        cerrar={() => setModal(m => ({ ...m, show: false }))}
      />
    </div>
  );
}

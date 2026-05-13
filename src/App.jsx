import React, { useState } from "react";
import Login from "./components/Login/Login";
import Coordinacion from "./modules/coordinacion/Coordinacion";
import Secretaria from "./modules/secretaria/Secretaria";
import Administrador from "./modules/administrador/Administrador";
import Padres from "./modules/padres/Padres";

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderModule = () => {
    switch (user.role) {
      case "administrador":
        return <Administrador onLogout={handleLogout} />;
      case "coordinacion":
        return <Coordinacion onLogout={handleLogout} />;
      case "secretaria":
        return <Secretaria onLogout={handleLogout} />;
      case "padres":
        return <Padres user={user} onLogout={handleLogout} />;
      default:
        return (
          <div className="module-placeholder">
            <section className="module-placeholder-card">
              <span>SR</span>
              <h2>Módulo {user.name} en construcción</h2>
              <p>Este módulo aún no tiene su interfaz implementada.</p>
            </section>
            <button onClick={handleLogout} className="module-placeholder-button">
              Cerrar sesión
            </button>
          </div>
        );
    }
  };

  return <>{renderModule()}</>;
}

export default App;

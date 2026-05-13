import { useState } from "react";
import {
  Alert,
  Button,
  Paper,
  PasswordInput,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  AlertCircle,
  Calendar,
  IdCard,
  Loader2,
  Lock,
  LogIn,
  User,
} from "lucide-react";
import { loginPadre, loginPersonal } from "../../services/authService";
import { fechaActualInput } from "../../services/dateService";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [loginType, setLoginType] = useState("personal");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dni, setDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function mostrarError(texto) {
    setError(texto);
    notifications.show({
      color: loginType === "padre" ? "blue" : "sanrafael",
      title: "Acceso al sistema",
      message: texto,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (loginType === "personal") {
      if (!username.trim() || !password) {
        mostrarError("Ingrese usuario y contraseña.");
        return;
      }
    } else {
      if (!/^\d{8}$/.test(dni)) {
        mostrarError("El DNI debe tener 8 números.");
        return;
      }
      if (!fechaNacimiento) {
        mostrarError("Seleccione la fecha de nacimiento.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = loginType === "personal"
        ? await loginPersonal(username, password)
        : await loginPadre(dni, fechaNacimiento);

      if (response.success) {
        onLoginSuccess(response.user);
      } else {
        mostrarError(response.message);
      }
    } catch {
      mostrarError("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  function cambiarTipo(tipo) {
    setLoginType(tipo);
    setError("");
    setUsername("");
    setPassword("");
    setDni("");
    setFechaNacimiento("");
  }

  const today = fechaActualInput();
  const esPadre = loginType === "padre";

  return (
    <main className={`login-page ${esPadre ? "login-page-padre" : "login-page-personal"}`}>
      <Paper
        component="section"
        className="login-shell"
        aria-label="Acceso al sistema extracurricular"
        radius="lg"
        shadow="xl"
      >
        <section className="login-panel">
          <div className="login-heading">
            <span className="login-school-logo-frame">
              <img
                className="login-school-logo"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8ss429VynuUkBBQBrN6Up-lUBby7o0oqjvQ&s"
                alt="Marca del colegio"
              />
            </span>
            <h2>Iniciar sesión</h2>
            <p>{esPadre ? "Ingrese el DNI y fecha de nacimiento del estudiante." : "Bienvenido de nuevo. Ingrese sus credenciales para continuar."}</p>
          </div>

          <div className="login-mode-switch" role="tablist" aria-label="Tipo de acceso">
            <button
              type="button"
              className={loginType === "personal" ? "is-active" : ""}
              onClick={() => cambiarTipo("personal")}
              disabled={isLoading}
            >
              Personal
            </button>
            <button
              type="button"
              className={loginType === "padre" ? "is-active" : ""}
              onClick={() => cambiarTipo("padre")}
              disabled={isLoading}
            >
              Padres
            </button>
          </div>

          {error ? (
            <Alert
              className="login-error"
              color={esPadre ? "blue" : "sanrafael"}
              radius="md"
              icon={<AlertCircle size={17} />}
              role="alert"
            >
              {error}
            </Alert>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit}>
            {esPadre ? (
              <>
                <TextInput
                  label="DNI del estudiante"
                  value={dni}
                  onChange={(event) => { setDni(event.currentTarget.value.replace(/\D/g, "").slice(0, 8)); setError(""); }}
                  placeholder="DNI del estudiante*"
                  maxLength={8}
                  inputMode="numeric"
                  disabled={isLoading}
                  leftSection={<IdCard size={17} />}
                  radius="md"
                  aria-label="DNI del estudiante"
                />
                <TextInput
                  label=""
                  type="date"
                  value={fechaNacimiento}
                  onChange={(event) => { setFechaNacimiento(event.currentTarget.value); setError(""); }}
                  disabled={isLoading}
                  max={today}
                  leftSection={<Calendar size={17} />}
                  radius="md"
                  aria-label="Fecha de nacimiento"
                />
              </>
            ) : (
              <>
                <TextInput
                  label=""
                  value={username}
                  onChange={(event) => { setUsername(event.currentTarget.value); setError(""); }}
                  placeholder="Usuario*"
                  disabled={isLoading}
                  leftSection={<User size={17} />}
                  radius="md"
                  aria-label="Usuario"
                />
                <PasswordInput
                  label=""
                  value={password}
                  onChange={(event) => { setPassword(event.currentTarget.value); setError(""); }}
                  placeholder="Contraseña*"
                  disabled={isLoading}
                  leftSection={<Lock size={17} />}
                  radius="md"
                  aria-label="Contraseña"
                />
              </>
            )}

            <Button
              className={`login-submit ${esPadre ? "login-submit-padre" : "login-submit-personal"}`}
              type="submit"
              disabled={isLoading}
              leftSection={isLoading ? <Loader2 className="login-spin" size={18} /> : <LogIn size={18} />}
              fullWidth
            >
              {isLoading ? "Validando" : "Ingresar"}
            </Button>
          </form>
        </section>
      </Paper>
    </main>
  );
}

export default Login;

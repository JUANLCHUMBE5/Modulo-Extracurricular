import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App.jsx";
import { mantineTheme } from "./mantineTheme";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={mantineTheme}>
      <Notifications position="top-center" zIndex={3000} containerWidth={420} />
      <App />
    </MantineProvider>
  </React.StrictMode>
);

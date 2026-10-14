import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AccessibilityShell from "./components/AccessibilityShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessibilityShell><App /></AccessibilityShell>
  </StrictMode>
);

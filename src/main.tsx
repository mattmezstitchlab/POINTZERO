import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import PhotoSouvenir from "./components/PhotoSouvenir";
import StorageRecoveryNotice from "./components/StorageRecoveryNotice";
import AccessibilityShell from "./components/AccessibilityShell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccessibilityShell><StorageRecoveryNotice/>{new URLSearchParams(window.location.search).get("parcours") === "photo-souvenir" ? <PhotoSouvenir /> : <App />}</AccessibilityShell>
  </StrictMode>
);

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import PhotoSouvenir from "./components/PhotoSouvenir";
import { loadStored } from "./lib/store";
import { saveLibrary } from "./lib/library";
import { type Pattern } from "./lib/pattern";
import { preparePhotoHandoff } from "./lib/photoHandoff";
import StorageRecoveryNotice from "./components/StorageRecoveryNotice";
import AccessibilityShell from "./components/AccessibilityShell";

function Entry() {
  const [pattern, setPattern] = useState<Pattern>();
  const [photo, setPhoto] = useState(new URLSearchParams(window.location.search).get('parcours') === 'photo-souvenir');
  return photo ? <PhotoSouvenir onContinue={async next => {
    const previous = loadStored();
    const prepared = await preparePhotoHandoff(next, previous, async project => { await saveLibrary(project, true); });
    window.history.replaceState(null, '', '/atelier?studio=embroidery');
    setPattern(prepared); setPhoto(false);
  }} /> : <App initialPattern={pattern} />;
}
createRoot(document.getElementById("root")!).render(
  <StrictMode><AccessibilityShell><StorageRecoveryNotice/><Entry /></AccessibilityShell></StrictMode>
);

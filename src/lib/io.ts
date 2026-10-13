import { fromObject, toObject, type Pattern } from "./pattern";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "motif"
  );
}

export function saveProjectFile(p: Pattern) {
  const blob = new Blob([JSON.stringify(toObject(p))], { type: "application/json" });
  downloadBlob(blob, `${slugify(p.name)}.pointzero.json`);
}

export async function readProjectFile(file: File): Promise<Pattern | null> {
  try {
    return fromObject(JSON.parse(await file.text()));
  } catch {
    return null;
  }
}

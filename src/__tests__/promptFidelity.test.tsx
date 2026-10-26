import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, pollinationsUrl } from "../lib/promptcraft";
import { flossIndex } from "../lib/dmc";
import PromptStudio from "../components/PromptStudio";
import { loadRemoteImage } from "../lib/convert";
import { imageToDmc } from "../lib/dither";

vi.mock("../lib/convert", () => ({ loadRemoteImage: vi.fn() }));
vi.mock("../lib/dither", () => ({ imageToDmc: vi.fn() }));
let root: Root | undefined, host: HTMLDivElement | undefined;
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = undefined; vi.restoreAllMocks(); });
const input = { subject: 'Deux chats dans un jardin bleu, avec le prénom « Léa »', main: "", second: "", relation: "", style: "description" as const, detail: "equilibre" as const, format: "carre" as const };
describe("Description fidèle et génération unifiée", () => {
  it("préserve intégralement scène, couleurs et texte sans contraintes contradictoires", () => {
    const prompt = buildPrompt(input);
    expect(prompt).toContain(input.subject);
    for (const forbidden of ["centered single subject", "plain solid white background", "no letters", "no extra objects", "photorealistic"]) expect(prompt).not.toContain(forbidden);
    const url = new URL(pollinationsUrl(prompt, 1024, 1024, 42));
    expect(url.searchParams.get("enhance")).toBe("false");
    expect(decodeURIComponent(url.pathname)).toContain(input.subject);
  });
  it("garde la description même avec des sujets et un style précisés", () => {
    const prompt = buildPrompt({ ...input, main: "chat roux", second: "chat noir", relation: "côte à côte", style: "minimal" });
    expect(prompt).toContain(input.subject);
    expect(prompt).toContain("chat roux"); expect(prompt).toContain("chat noir"); expect(prompt).toContain("côte à côte");
  });
  it("un clic produit l’image et la grille, puis une validation explicite transmet le patron", async () => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,AA==");
    vi.mocked(loadRemoteImage).mockResolvedValue({ src: "data:image/png;base64,AA==" } as HTMLImageElement);
    vi.mocked(imageToDmc).mockImplementation((_image, w, h) => ({ cross: new Int16Array(w * h).fill(flossIndex("321")), palette: [flossIndex("321")] }));
    const onImport = vi.fn();
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(async () => root!.render(<PromptStudio initialPrompt={input.subject} onClose={vi.fn()} onImport={onImport} embedded/>));
    const find = (text: string) => [...host!.querySelectorAll("button")].find(b => b.textContent?.includes(text))!;
    await act(async () => find("Générer mon motif").click());
    expect(loadRemoteImage).toHaveBeenCalledTimes(1);
    expect(imageToDmc).toHaveBeenCalledTimes(1);
    expect(onImport).not.toHaveBeenCalled();
    expect(find("Utiliser dans ma grille").disabled).toBe(false);
    await act(async () => find("Utiliser dans ma grille").click());
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport.mock.calls[0][0].notes).toContain(input.subject);
    expect(vi.mocked(imageToDmc).mock.calls[0][3].dropWhite).toBe(false);
    await act(async () => {
      const textarea = host!.querySelector("textarea")!;
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Une nouvelle scène");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(find("Utiliser dans ma grille").disabled).toBe(true);
  });
});

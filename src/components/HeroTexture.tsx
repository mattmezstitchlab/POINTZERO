import { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

/**
 * Le fond du hero : un dithering animé.
 *
 * Clin d'œil exact : le dithering est le geste même qui, dans l'atelier,
 * convertit une image en croix — trame de Bayer, erreur diffusée. Le voir
 * onduler lentement derrière le titre, c'est montrer le moteur sans le
 * raconter. Réglages repris de la référence Paper, couleurs ramenées à deux
 * gris presque noirs : sobre, comme demandé.
 *
 * Sans WebGL — navigateur ancien, économie d'énergie, tests — une texture CSS
 * en point de croix prend le relais, dérivant lentement elle aussi. Le hero
 * n'est jamais nu.
 */
export default function HeroTexture() {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  return (
    <div className="hero-texture" aria-hidden="true">
      {webgl === true && (
        <Dithering
          speed={0.04}
          shape="ripple"
          type="4x4"
          size={1.5}
          scale={0.86}
          colorBack="#00000000"
          colorFront="#232329"
          style={{ position: "absolute", inset: 0, backgroundColor: "#0b0b0d", width: "100%", height: "100%" }}
        />
      )}
      {webgl === false && <div className="hero-texture-css" />}
      <div className="hero-texture-vignette" />
    </div>
  );
}

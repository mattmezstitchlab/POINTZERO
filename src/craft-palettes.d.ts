declare module "craft-color-codes/data/json/miyuki-delica.json" {
  interface RawColor {
    code: string;
    name: string;
    hex: string;
    rgb: [number, number, number];
    glass?: string;
    discontinued?: true;
  }
  const palette: {
    id: string;
    brand: string;
    product: string;
    craft: string;
    unit: string;
    count: number;
    status: string;
    notes: string;
    license: string;
    sources: { name: string; url: string }[];
    colors: RawColor[];
  };
  export default palette;
}

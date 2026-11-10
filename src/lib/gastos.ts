// categorías de gastos y cosas de plata que usan Gastos y Resumen

export type Marca = "seancut" | "seannova";

export const MARCAS: { id: Marca; label: string; ayuda: string }[] = [
  { id: "seancut", label: "Sean Cut", ayuda: "la barbería" },
  { id: "seannova", label: "SeanNova", ayuda: "la ropa" },
];

export const NOMBRE_MARCA: Record<string, string> = {
  seancut: "Sean Cut",
  seannova: "SeanNova",
};

// `marca` es el negocio que se marca solo al elegir la categoría
export const CATEGORIAS = [
  { id: "mercaderia", label: "Mercadería", ejemplos: "poleras, gorros, polerones para vender", marca: "seannova" },
  { id: "herramientas", label: "Herramientas", ejemplos: "navajas, tijeras, máquinas", marca: "seancut" },
  { id: "insumos", label: "Insumos", ejemplos: "hojas, gel, cera, toallas", marca: "seancut" },
  { id: "ropa", label: "Ropa de trabajo", ejemplos: "chaleco, capa, delantal", marca: "seancut" },
  { id: "local", label: "Local", ejemplos: "arriendo, luz, agua, internet", marca: "seancut" },
  { id: "otro", label: "Otro", ejemplos: "lo que no calce arriba", marca: "seancut" },
] as const satisfies readonly { id: string; label: string; ejemplos: string; marca: Marca }[];

export type Categoria = (typeof CATEGORIAS)[number]["id"];

// los gastos que se anotaron antes de existir las categorías vienen en null
export function nombreCategoria(id: string | null) {
  return CATEGORIAS.find((c) => c.id === id)?.label ?? "Sin categoría";
}

export function clp(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("es-CL");
}

export const FALTA_SQL_GASTOS =
  "Falta correr supabase/2026-11-10_gastos.sql en Supabase (SQL Editor).";

// postgres (42703) o la api (PGRST204) avisan que falta la columna category
export function mensajeGastos(error: { code: string; message: string }) {
  return error.code === "42703" || error.code === "PGRST204" ? FALTA_SQL_GASTOS : error.message;
}

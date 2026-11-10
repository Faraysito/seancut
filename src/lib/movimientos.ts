import { createClient } from "@/lib/supabase/server";
import type { Tables } from "./supabase/database.types";
import { rangoMes } from "./mes";

export type Movimiento = Pick<
  Tables<"ledger">,
  "id" | "brand" | "direction" | "amount_clp" | "category" | "reason" | "happened_at"
>;

const PAGINA = 1000;

// todo lo que entró y salió de la caja en un mes (o solo los gastos).
// va de a 1000 porque supabase corta cada respuesta en 1000 filas y un
// resumen al que le faltan filas da una ganancia equivocada
export async function movimientosDelMes(mes: string, soloGastos = false) {
  const supabase = await createClient();
  const { desde, hasta } = rangoMes(mes);
  const filas: Movimiento[] = [];

  for (let i = 0; ; i += PAGINA) {
    let consulta = supabase
      .from("ledger")
      .select("id, brand, direction, amount_clp, category, reason, happened_at")
      .gte("happened_at", desde)
      .lt("happened_at", hasta);
    if (soloGastos) consulta = consulta.eq("direction", "out");

    const { data, error } = await consulta
      .order("happened_at", { ascending: false })
      .order("id")
      .range(i, i + PAGINA - 1);

    if (error) return { filas, error };
    filas.push(...data);
    if (data.length < PAGINA) break;
  }

  return { filas, error: null };
}

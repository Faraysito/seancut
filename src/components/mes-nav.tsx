import Link from "next/link";
import { conMayuscula, nombreMes, sumarMeses } from "@/lib/mes";

const LINK =
  "shrink-0 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-400 hover:text-white";

// ← octubre   Noviembre de 2026   diciembre →  (no deja ir a meses futuros)
export function MesNav({ ruta, mes, actual }: { ruta: string; mes: string; actual: string }) {
  const antes = sumarMeses(mes, -1);
  const despues = sumarMeses(mes, 1);

  return (
    <nav aria-label="Cambiar mes" className="flex items-center justify-between gap-3">
      <Link href={ruta + "?mes=" + antes} className={LINK}>
        ← {nombreMes(antes, false)}
      </Link>
      <p className="text-center font-medium">{conMayuscula(nombreMes(mes))}</p>
      {mes < actual ? (
        <Link href={despues === actual ? ruta : ruta + "?mes=" + despues} className={LINK}>
          {nombreMes(despues, false)} →
        </Link>
      ) : (
        <span aria-hidden className={LINK + " invisible"}>
          {nombreMes(despues, false)} →
        </span>
      )}
    </nav>
  );
}

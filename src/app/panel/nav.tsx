"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/panel", label: "Hoy" },
  { href: "/panel/agenda", label: "Agenda" },
  { href: "/panel/caja", label: "Caja" },
  { href: "/panel/gastos", label: "Gastos" },
  { href: "/panel/catalogo", label: "Administrar catálogo/cortes" },
  { href: "/panel/horarios", label: "Administrar horarios" },
  { href: "/panel/notas", label: "Notas" },
  { href: "/panel/resumen", label: "Resumen" },
];

export default function PanelNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm md:text-base">
      {LINKS.map((l) => {
        // "/panel" es prefijo de todas las demás, así que para Hoy
        // pido match exacto; para el resto basta el prefijo, y así
        // /panel/catalogo/nuevo también marca Catálogo
        const activo =
          l.href === "/panel" ? pathname === "/panel" : pathname.startsWith(l.href);

        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={activo ? "page" : undefined}
            className={
              activo
                ? "font-semibold text-white underline decoration-2 underline-offset-8"
                : "text-neutral-500 transition hover:text-neutral-300"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { logout } from "../login/actions";

const LINKS = [
  { href: "/panel", label: "Hoy" },
  { href: "/panel/agenda", label: "Agenda" },
  { href: "/panel/caja", label: "Caja" },
  { href: "/panel/catalogo", label: "Catálogo" },
  { href: "/panel/resumen", label: "Resumen" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-lg p-6 md:max-w-3xl md:p-10">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-800 pb-3 md:mb-10 md:pb-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm md:text-base">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:underline">{l.label}</Link>
            ))}
          </div>
          <form action={logout}>
            <button className="text-sm text-neutral-500 underline">salir</button>
          </form>
        </nav>
        {children}
      </div>
    </div>
  );
}

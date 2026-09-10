import Link from "next/link";
import { logout } from "../login/actions";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <nav className="mb-6 flex items-center justify-between border-b pb-3">
        <div className="flex gap-4 text-sm">
          <Link href="/panel" className="hover:underline">Hoy</Link>
          <Link href="/panel/caja" className="hover:underline">Caja</Link>
          <Link href="/panel/resumen" className="hover:underline">Resumen</Link>
        </div>
        <form action={logout}>
          <button className="text-sm text-neutral-500 underline">salir</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
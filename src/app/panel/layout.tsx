import { logout } from "../login/actions";
import PanelNav from "./nav";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto w-full max-w-lg p-6 md:max-w-3xl md:p-10">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-800 pb-3 md:mb-10 md:pb-4">
          <PanelNav />
          <form action={logout}>
            <button className="text-sm text-neutral-500 underline">salir</button>
          </form>
        </nav>
        {children}
      </div>
    </div>
  );
}

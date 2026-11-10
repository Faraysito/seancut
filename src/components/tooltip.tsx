"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";

type Align = "start" | "center" | "end";

const LADO: Record<Align, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

// distancia mínima entre la burbuja y el borde de la pantalla
const MARGEN = 8;

// tooltip que funciona con mouse (hover), con teclado (foco) y en el celu
// (tap). el title nativo del html no se ve en mobile, por eso existe esto.
export function Tooltip({
  text,
  align = "center",
  tone = "default",
  className = "inline-flex",
  children,
}: {
  text: string;
  align?: Align;
  tone?: "default" | "danger";
  className?: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);
  const burbuja = useRef<HTMLSpanElement>(null);
  const flecha = useRef<HTMLSpanElement>(null);
  const puntero = useRef("");
  const id = useId();

  // se cierra al tocar en cualquier otro lado o con escape
  useEffect(() => {
    if (!abierto) return;

    function afuera(e: PointerEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }

    document.addEventListener("pointerdown", afuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  // si la burbuja se sale de la pantalla (los días de las orillas, un botón
  // que bajó de línea en el celu) la corro lo justo para que entre, y la
  // flecha sigue apuntando al centro de lo que se tocó
  useLayoutEffect(() => {
    const c = caja.current;
    const b = burbuja.current;
    const f = flecha.current;
    if (!abierto || !c || !b || !f) return;

    b.style.transform = "";
    const r = b.getBoundingClientRect();
    let dx = 0;
    if (r.left < MARGEN) dx = MARGEN - r.left;
    else if (r.right > window.innerWidth - MARGEN) dx = window.innerWidth - MARGEN - r.right;
    if (dx) b.style.transform = "translateX(" + dx + "px)";

    const t = c.getBoundingClientRect();
    const x = t.left + t.width / 2 - (r.left + dx) - 4;
    f.style.left = Math.min(Math.max(x, 6), r.width - 14) + "px";
  }, [abierto]);

  return (
    <span
      ref={caja}
      className={"relative " + className}
      onPointerDown={(e) => {
        puntero.current = e.pointerType;
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setAbierto(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setAbierto(false);
      }}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setAbierto(true);
      }}
      onBlur={() => setAbierto(false)}
      onClick={() => {
        // con mouse ya se abrió con el hover; en el celu (o con enter)
        // el toque es lo que lo abre y lo cierra
        if (puntero.current === "mouse") setAbierto(true);
        else setAbierto((v) => !v);
        puntero.current = "";
      }}
    >
      {cloneElement(children, { "aria-describedby": id })}
      <span
        ref={burbuja}
        id={id}
        role="tooltip"
        className={
          "pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-56 whitespace-normal rounded-md px-2.5 py-1.5 text-left text-xs font-medium normal-case leading-snug tracking-normal shadow-lg transition-opacity duration-150 " +
          LADO[align] +
          (tone === "danger" ? " bg-red-600 text-white" : " bg-white text-neutral-950") +
          (abierto ? " visible opacity-100" : " invisible opacity-0")
        }
      >
        {text}
        <span
          ref={flecha}
          aria-hidden
          className={"absolute top-full -mt-1 h-2 w-2 rotate-45 " + (tone === "danger" ? "bg-red-600" : "bg-white")}
        />
      </span>
    </span>
  );
}

// el "?" chiquito al lado de un título, para explicar sin llenar la
// pantalla de texto
export function InfoTip({ text, align = "center" }: { text: string; align?: Align }) {
  return (
    <Tooltip text={text} align={align}>
      <button
        type="button"
        aria-label="Más información"
        className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-neutral-700 text-[11px] font-semibold leading-none text-neutral-400 transition hover:border-neutral-400 hover:text-white"
      >
        ?
      </button>
    </Tooltip>
  );
}

// whatsapp e instagram de los clientes: lo usan el formulario de reserva
// y el panel, así los links se arman igual en todos lados

// lo que se muestra si la base todavía no tiene la columna instagram
// o la función book_appointment_v2
export const FALTA_SQL_CONTACTO =
  "Falta correr supabase/2026-11-10_contacto.sql en Supabase (SQL Editor).";

// wa.me quiere el número con código de país y sin signos
export function numeroWa(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length === 9) return "56" + d; // 9 1234 5678
  if (d.length === 8) return "569" + d; // 1234 5678, sin el 9
  return d;
}

export function linkWhatsApp(tel: string, texto?: string) {
  return "https://wa.me/" + numeroWa(tel) + (texto ? "?text=" + encodeURIComponent(texto) : "");
}

// "+56932153527" -> "+56 9 3215 3527". si no es un celu chileno lo dejo como viene
export function telefonoLegible(tel: string) {
  const d = numeroWa(tel);
  if (d.length === 11 && d.startsWith("569")) {
    return "+56 9 " + d.slice(3, 7) + " " + d.slice(7);
  }
  return tel;
}

// acepta "@usuario", "usuario" o el link del perfil, y deja solo "usuario"
export function usuarioInstagram(v: string) {
  return v
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "");
}

export function linkInstagram(usuario: string) {
  return "https://www.instagram.com/" + usuarioInstagram(usuario) + "/";
}

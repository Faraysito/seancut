"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    null
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">SEAN CUT</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-neutral-500">panel</p>
        </div>

        <input name="email" type="email" required placeholder="email" className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500" />
        <input name="password" type="password" required placeholder="contraseña" className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500" />

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button type="submit" disabled={pending} className="w-full rounded-full bg-white px-3 py-3 font-semibold text-neutral-950 disabled:opacity-40">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

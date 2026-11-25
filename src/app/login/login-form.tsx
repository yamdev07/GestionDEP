"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "@/lib/actions/auth";
import { Button, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({ next = null }: { next?: string | null }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="toi@exemple.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

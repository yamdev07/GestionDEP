"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser, type RegisterState } from "@/lib/actions/auth";
import { Button, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerUser,
    undefined,
  );

  // La server action renvoie `undefined` en cas de succès (et un objet si erreur).
  useEffect(() => {
    if (state === undefined && pending === false && done) {
      router.push("/login?created=1");
    }
  }, [state, pending, done, router]);

  return (
    <form
      action={formAction}
      onSubmit={() => setDone(true)}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="name">Nom (optionnel)</Label>
        <Input id="name" name="name" type="text" placeholder="Ton prénom" />
      </div>
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
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="6 caractères minimum"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>

      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

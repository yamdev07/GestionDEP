"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { changePassword } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/transactions";
import { Button, Input, Label } from "@/components/ui";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(changePassword, undefined);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div>
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="6 caractères minimum"
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || !current || !next || !confirm}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Mot de passe modifié
          </>
        ) : pending ? (
          "Modification…"
        ) : (
          "Changer le mot de passe"
        )}
      </Button>
    </form>
  );
}

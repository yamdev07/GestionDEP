"use client";

import { useActionState, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteMyAccount } from "@/lib/actions/profile";
import { Button, Label } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import type { ActionResult } from "@/lib/actions/transactions";

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(deleteMyAccount, undefined);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full border-danger/40 text-danger hover:bg-danger/10"
      >
        <Trash2 className="h-4 w-4" />
        Supprimer mon compte
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Action <strong>irréversible</strong> : toutes tes données (opérations,
          comptes, budgets, épargne) seront définitivement supprimées. Saisis ton
          mot de passe pour confirmer.
        </p>
      </div>
      <div>
        <Label htmlFor="del-pass">Mot de passe</Label>
        <PasswordInput
          id="del-pass"
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
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuler
        </Button>
        <Button type="submit" variant="danger" className="flex-1" disabled={pending}>
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </Button>
      </div>
    </form>
  );
}

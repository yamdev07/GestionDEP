"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { updateProfile } from "@/lib/actions/profile";
import { CURRENCIES } from "@/lib/currencies";
import type { ActionResult } from "@/lib/actions/transactions";
import { Button, Input, Label } from "@/components/ui";

export function ProfileForm({
  name,
  currency,
}: {
  name: string;
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(updateProfile, undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" defaultValue={name} placeholder="Ton nom" maxLength={80} />
      </div>

      <div>
        <Label htmlFor="currency">Devise</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={currency}
          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Enregistré
          </>
        ) : pending ? (
          "Enregistrement…"
        ) : (
          "Enregistrer"
        )}
      </Button>
    </form>
  );
}

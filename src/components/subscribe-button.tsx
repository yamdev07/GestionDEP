"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/lib/actions/subscription";
import type { PlanKey, Cycle } from "@/lib/plans";
import { Button } from "@/components/ui";

export function SubscribeButton({
  plan,
  cycle,
  label,
  variant = "primary",
}: {
  plan: PlanKey;
  cycle: Cycle;
  label: string;
  variant?: "primary" | "outline";
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function go() {
    setErr(null);
    start(async () => {
      const r = await startCheckout(plan, cycle);
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setErr(r.error ?? "Erreur");
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        onClick={go}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Redirection…" : label}
      </Button>
      {err && <p className="mt-1 text-center text-xs text-danger">{err}</p>}
    </div>
  );
}

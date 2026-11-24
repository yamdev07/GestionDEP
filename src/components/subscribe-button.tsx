"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startCheckout } from "@/lib/actions/subscription";
import type { PlanKey, Cycle } from "@/lib/plans";
import { Button } from "@/components/ui";

export function SubscribeButton({
  plan,
  cycle,
  label,
  variant = "primary",
  autoStart = false,
}: {
  plan: PlanKey;
  cycle: Cycle;
  label: string;
  variant?: "primary" | "outline";
  autoStart?: boolean;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(autoStart);
  const fired = useRef(false);

  function go() {
    setErr(null);
    start(async () => {
      const r = await startCheckout(plan, cycle);
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setAuto(false);
        setErr(r.error ?? "Erreur");
      }
    });
  }

  // Redirection directe vers FedaPay quand on arrive avec un plan payant choisi.
  useEffect(() => {
    if (autoStart && !fired.current) {
      fired.current = true;
      go();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (auto) {
    return (
      <Button type="button" variant={variant} disabled className="w-full">
        Redirection vers le paiement…
      </Button>
    );
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

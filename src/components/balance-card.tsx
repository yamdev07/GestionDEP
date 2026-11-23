"use client";

import { useState } from "react";
import { Eye, EyeOff, CalendarDays, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export function BalanceCard({
  balanceCents,
  monthLabel,
  currency,
}: {
  balanceCents: number;
  monthLabel: string;
  currency: string;
}) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="gradient-primary relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-primary/20">
      {/* Décor */}
      <div className="pointer-events-none absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            Solde disponible
            <button
              type="button"
              onClick={() => setHidden((h) => !h)}
              aria-label={hidden ? "Afficher le solde" : "Masquer le solde"}
              className="text-white/70 transition hover:text-white"
            >
              {hidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="mt-1.5 text-4xl font-extrabold tracking-tight">
            {hidden ? "••• •••" : formatMoney(balanceCents, currency)}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium capitalize">
            <CalendarDays className="h-3.5 w-3.5" />
            {monthLabel}
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

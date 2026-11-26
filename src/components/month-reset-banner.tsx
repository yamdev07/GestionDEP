"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, X } from "lucide-react";

/**
 * Bannière affichée à la première ouverture d'un nouveau mois, quand des budgets
 * ont été reportés. Non bloquante, masquable, une seule fois par mois (localStorage).
 */
export function MonthResetBanner({
  period,
  count,
}: {
  period: string; // "YYYY-MM" du mois courant
  count: number; // nombre de budgets reportés
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Lecture après montage (localStorage indispo en SSR) : évite tout mismatch
    // d'hydratation. Le setState est donc volontaire ici.
    try {
      if (localStorage.getItem("mb_month_reset_seen") !== period) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShow(true);
      }
    } catch {
      // ignore
    }
  }, [period]);

  if (!show || count <= 0) return null;

  function dismiss() {
    try {
      localStorage.setItem("mb_month_reset_seen", period);
    } catch {
      // ignore
    }
    setShow(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <CalendarClock className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">
          Nouveau mois : {count} budget{count > 1 ? "s" : ""} reporté
          {count > 1 ? "s" : ""}
        </p>
        <Link
          href="/budgets/historique"
          className="text-xs font-medium text-primary underline"
        >
          Voir le récap du mois passé
        </Link>
      </div>
      <button
        onClick={dismiss}
        title="Masquer"
        className="shrink-0 rounded-lg p-1.5 text-primary/70 transition hover:bg-primary/10 hover:text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

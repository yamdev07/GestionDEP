import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import type { Upcoming } from "@/lib/forecast";

/** Carte « solde prévu fin de mois » (Premium). Rien si aucune récurrence à venir. */
export function ForecastCard({
  currentNetCents,
  upcoming,
  currency,
}: {
  currentNetCents: number;
  upcoming: Upcoming;
  currency: string;
}) {
  if (upcoming.occurrences === 0) return null;
  const projected =
    currentNetCents + upcoming.incomeCents - upcoming.expenseCents;

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
        <TrendingUp className="h-5 w-5 text-primary" /> Solde prévu fin de mois
      </h2>
      <p
        className="text-2xl font-extrabold tabular-nums"
        style={{ color: projected >= 0 ? "var(--success)" : "var(--danger)" }}
      >
        {formatMoney(projected, currency)}
      </p>
      <div className="mt-2 space-y-1 text-sm text-muted">
        <div className="flex justify-between">
          <span>Solde actuel du mois</span>
          <span className="tabular-nums">{formatMoney(currentNetCents, currency)}</span>
        </div>
        {upcoming.incomeCents > 0 && (
          <div className="flex justify-between">
            <span>Entrées à venir</span>
            <span className="tabular-nums text-success">
              +{formatMoney(upcoming.incomeCents, currency)}
            </span>
          </div>
        )}
        {upcoming.expenseCents > 0 && (
          <div className="flex justify-between">
            <span>Dépenses à venir</span>
            <span className="tabular-nums text-danger">
              -{formatMoney(upcoming.expenseCents, currency)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

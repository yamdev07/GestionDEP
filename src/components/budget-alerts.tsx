import { Bell } from "lucide-react";
import { Card } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { formatMoney } from "@/lib/utils";
import type { BudgetAlert } from "@/lib/budget-alerts";

/** Carte d'alertes de budget (Premium). Ne rend rien s'il n'y a aucune alerte. */
export function BudgetAlerts({
  alerts,
  currency,
  title = "Attention à vos dépenses",
}: {
  alerts: BudgetAlert[];
  currency: string;
  title?: string;
}) {
  if (alerts.length === 0) return null;
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Bell className="h-5 w-5 text-primary" /> {title}
      </h2>
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li key={a.categoryId} className="flex items-center gap-3">
            <CategoryIcon
              icon={a.icon}
              color={a.color}
              className="h-9 w-9 shrink-0 rounded-xl"
              size={16}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{a.name}</span>
                <span
                  className="shrink-0 font-semibold tabular-nums"
                  style={{ color: a.over ? "var(--danger)" : "#f59e0b" }}
                >
                  {a.over
                    ? a.spentCents > a.budgetCents
                      ? `Budget dépassé de ${formatMoney(a.spentCents - a.budgetCents, currency)}`
                      : "Limite atteinte"
                    : `Proche de la limite · ${a.pct}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, a.pct)}%`,
                    backgroundColor: a.over ? "var(--danger)" : "#f59e0b",
                  }}
                />
              </div>
              <p className="mt-0.5 text-xs text-muted tabular-nums">
                {formatMoney(a.spentCents, currency)} / {formatMoney(a.budgetCents, currency)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

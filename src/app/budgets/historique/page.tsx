import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { closeDueMonths } from "@/lib/budget-periods";
import { AppShell } from "@/components/app-shell";
import { CategoryIcon } from "@/components/category-icon";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export default async function BudgetHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");
  const currency = user.currency;

  // S'assure que les mois échus sont bien archivés avant d'afficher.
  await closeDueMonths(userId);

  const periods = await prisma.budgetPeriod.findMany({
    where: { userId },
    orderBy: [{ period: "desc" }, { categoryName: "asc" }],
    take: 300,
  });

  // Regroupe par mois.
  const byMonth = new Map<string, typeof periods>();
  for (const p of periods) {
    const list = byMonth.get(p.period) ?? [];
    list.push(p);
    byMonth.set(p.period, list);
  }

  function monthLabel(key: string): string {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href="/budgets"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              Historique des budgets
            </h1>
            <p className="text-sm text-muted">
              Mois clôturés : plafond, dépensé et report.
            </p>
          </div>
        </div>

        {byMonth.size === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <Archive className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              Aucun mois clôturé pour l&apos;instant. L&apos;historique se
              remplit au changement de mois.
            </p>
          </Card>
        ) : (
          [...byMonth.entries()].map(([key, items]) => {
            const totalBudget = items.reduce((s, i) => s + i.budgetCents, 0);
            const totalSpent = items.reduce((s, i) => s + i.spentCents, 0);
            return (
              <Card key={key}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold capitalize">
                    {monthLabel(key)}
                  </h2>
                  <span className="text-sm text-muted tabular-nums">
                    {formatMoney(totalSpent, currency)} /{" "}
                    {formatMoney(totalBudget, currency)}
                  </span>
                </div>
                <ul className="space-y-3">
                  {items.map((i) => {
                    const pct =
                      i.budgetCents > 0
                        ? Math.round((i.spentCents / i.budgetCents) * 100)
                        : i.spentCents > 0
                          ? 100
                          : 0;
                    const over = pct >= 100;
                    const rolloverPositive = i.rolloverCents >= 0;
                    return (
                      <li key={i.id} className="flex items-center gap-3">
                        <CategoryIcon
                          icon={i.categoryIcon}
                          color={i.categoryColor}
                          className="h-9 w-9 shrink-0 rounded-xl"
                          size={16}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium">
                              {i.categoryName}
                            </span>
                            <span className="shrink-0 text-xs text-muted tabular-nums">
                              {formatMoney(i.spentCents, currency)} /{" "}
                              {formatMoney(i.budgetCents, currency)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, pct)}%`,
                                backgroundColor: over
                                  ? "var(--danger)"
                                  : i.categoryColor,
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-xs tabular-nums text-muted">
                            Report vers le mois suivant :{" "}
                            <span
                              style={{
                                color: rolloverPositive
                                  ? "var(--success)"
                                  : "var(--danger)",
                              }}
                            >
                              {rolloverPositive ? "+" : ""}
                              {formatMoney(i.rolloverCents, currency)}
                            </span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

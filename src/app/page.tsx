import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ArrowDownRight, Plus, ChevronRight, PiggyBank } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAccount } from "@/lib/actions/accounts";
import { materializeRecurring } from "@/lib/actions/recurring";
import { getPlanStatus } from "@/lib/subscription";
import { canBudgetAlerts, canForecast } from "@/lib/plans";
import { getBudgetAlerts } from "@/lib/budget-alerts";
import { getUpcomingRecurring } from "@/lib/forecast";
import { BudgetAlerts } from "@/components/budget-alerts";
import { AlertNotifier } from "@/components/alert-notifier";
import { ForecastCard } from "@/components/forecast-card";
import { accountTypeIcon } from "@/lib/account-types";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { BalanceCard } from "@/components/balance-card";
import { CategoryChart } from "@/components/category-chart";
import { CategoryIcon } from "@/components/category-icon";
import {
  TransactionRow,
  type TransactionView,
} from "@/components/transaction-row";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { toTransactionView } from "@/lib/views";

export default async function DashboardPage() {
  const session = await auth();
  // Visiteur non connecté : page de présentation publique.
  if (!session?.user?.id) return <Landing />;
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  });
  if (!user) redirect("/login");
  const currency = user.currency;

  await ensureDefaultAccount(userId);
  // Génère les opérations récurrentes dues (Premium ; sans effet sinon).
  await materializeRecurring(userId);

  const status = await getPlanStatus(userId);
  const budgetAlerts = canBudgetAlerts(status.plan)
    ? await getBudgetAlerts(userId)
    : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const [monthTx, recent, accounts, accountGroups, savingsAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      include: { category: { select: { name: true, color: true, icon: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 6,
      include: { category: { select: { name: true, color: true, icon: true } } },
    }),
    prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null } },
      _sum: { amountCents: true },
    }),
    prisma.savingsGoal.aggregate({
      where: { userId },
      _sum: { savedCents: true },
      _count: true,
    }),
  ]);

  const savedCents = savingsAgg._sum.savedCents ?? 0;
  const goalCount = savingsAgg._count;

  // Solde par compte = solde de départ + revenus − dépenses.
  const accountSums = new Map<string, number>();
  for (const g of accountGroups) {
    if (!g.accountId) continue;
    const delta =
      (g.type === "INCOME" ? 1 : -1) * (g._sum.amountCents ?? 0);
    accountSums.set(g.accountId, (accountSums.get(g.accountId) ?? 0) + delta);
  }
  const accountRows = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    color: a.color,
    balanceCents: a.initialBalanceCents + (accountSums.get(a.id) ?? 0),
  }));

  const incomeCents = monthTx
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = monthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amountCents, 0);
  const balanceCents = incomeCents - expenseCents;

  // Solde prévisionnel (Premium) : récurrences à venir d'ici la fin du mois.
  const upcoming = canForecast(status.plan)
    ? await getUpcomingRecurring(userId, now, monthEnd)
    : { incomeCents: 0, expenseCents: 0, occurrences: 0 };

  // Répartition des dépenses par catégorie (ce mois).
  const byCat = new Map<string, { name: string; value: number; color: string }>();
  for (const t of monthTx) {
    if (t.type !== "EXPENSE") continue;
    const key = t.category?.name ?? "Sans catégorie";
    const color = t.category?.color ?? "#9ca3af";
    const entry = byCat.get(key) ?? { name: key, value: 0, color };
    entry.value += t.amountCents;
    byCat.set(key, entry);
  }
  const chartData = [...byCat.values()].sort((a, b) => b.value - a.value);

  const recentViews: TransactionView[] = recent.map(toTransactionView);

  return (
    <AppShell>
      <div className="space-y-5">
        <BalanceCard
          balanceCents={balanceCents}
          monthLabel={monthLabel}
          currency={currency}
        />

        <ForecastCard
          currentNetCents={balanceCents}
          upcoming={upcoming}
          currency={currency}
        />

        <BudgetAlerts alerts={budgetAlerts} currency={currency} />
        <AlertNotifier
          alerts={budgetAlerts.map((a) => ({
            categoryId: a.categoryId,
            name: a.name,
            pct: a.pct,
            over: a.over,
            spentCents: a.spentCents,
            budgetCents: a.budgetCents,
          }))}
          currency={currency}
        />

        {/* Revenus / Dépenses */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Entrées"
            value={formatMoney(incomeCents, currency)}
            tone="success"
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          <SummaryCard
            label="Dépenses"
            value={formatMoney(expenseCents, currency)}
            tone="danger"
            icon={<ArrowDownRight className="h-5 w-5" />}
          />
        </div>

        {/* Mes comptes */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Mes comptes</h2>
            <Link
              href="/comptes"
              className="flex items-center text-sm font-medium text-primary hover:underline"
            >
              Gérer <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {accountRows.map((a) => (
              <Link
                key={a.id}
                href="/comptes"
                className="flex min-w-[8.5rem] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface-muted/60 p-3 transition hover:bg-surface-muted"
              >
                <CategoryIcon
                  icon={accountTypeIcon(a.type)}
                  color={a.color}
                  className="h-9 w-9 rounded-xl"
                  size={16}
                />
                <span className="truncate text-sm font-medium">{a.name}</span>
                <span className="text-sm font-bold tabular-nums">
                  {formatMoney(a.balanceCents, currency)}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Épargne */}
        <Link href="/epargne" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-muted">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            >
              <PiggyBank className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted">Épargne</p>
              <p className="text-lg font-bold tabular-nums">
                {formatMoney(savedCents, currency)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted">
              {goalCount} objectif{goalCount > 1 ? "s" : ""}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
          </Card>
        </Link>

        {/* Répartition */}
        <Card>
          <h2 className="mb-4 text-base font-bold">Répartition des dépenses</h2>
          <CategoryChart data={chartData} currency={currency} />
        </Card>

        {/* Ajouter */}
        <Link
          href="/ajouter"
          className="gradient-primary flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white shadow-lg shadow-primary/25 transition active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" /> Ajouter une opération
        </Link>

        {/* Dernières opérations */}
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold">Dernières opérations</h2>
            <Link
              href="/operations"
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>
          {recentViews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucune opération. Ajoute la première avec le bouton + ☝️
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentViews.map((t) => (
                <TransactionRow key={t.id} tx={t} currency={currency} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "success" | "danger";
  icon: React.ReactNode;
}) {
  const color = tone === "success" ? "var(--success)" : "var(--danger)";
  return (
    <Card className="p-4">
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          color,
          backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        }}
      >
        {icon}
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
    </Card>
  );
}

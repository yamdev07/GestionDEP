import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import {
  TransactionRow,
  type TransactionView,
} from "@/components/transaction-row";
import { CategoryIcon } from "@/components/category-icon";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { toTransactionView } from "@/lib/views";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");
  const currency = user.currency;

  const category = await prisma.category.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      budget: { select: { amountCents: true } },
    },
  });
  if (!category) notFound();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [agg, monthAgg, transactions] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, categoryId: category.id, type: "EXPENSE" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        categoryId: category.id,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amountCents: true },
    }),
    prisma.transaction.findMany({
      where: { userId, categoryId: category.id, type: "EXPENSE" },
      orderBy: { date: "desc" },
      take: 300,
      include: { category: { select: { name: true, color: true, icon: true } } },
    }),
  ]);

  const totalCents = agg._sum.amountCents ?? 0;
  const count = agg._count;
  const monthCents = monthAgg._sum.amountCents ?? 0;
  const budgetCents = category.budget?.amountCents ?? 0;
  const budgetPct =
    budgetCents > 0 ? Math.round((monthCents / budgetCents) * 100) : 0;

  // Répartition par mois (6 derniers mois) calculée depuis les opérations récentes.
  const months: { key: string; label: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      cents: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const t of transactions) {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx].cents += t.amountCents;
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.cents));

  const views: TransactionView[] = transactions.map(toTransactionView);

  return (
    <AppShell>
      <div className="space-y-5">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <Link
            href="/categories"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <CategoryIcon
            icon={category.icon}
            color={category.color}
            className="h-11 w-11 shrink-0 rounded-2xl"
            size={20}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold leading-tight">
              {category.name}
            </h1>
            <p className="text-sm text-muted">
              {count} dépense{count > 1 ? "s" : ""} · {formatMoney(totalCents, currency)} au total
            </p>
          </div>
          <Link
            href={`/categories/${category.id}/saisie`}
            title="Ajouter des dépenses"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={formatMoney(totalCents, currency)} />
          <Stat label="Ce mois-ci" value={formatMoney(monthCents, currency)} />
          <Stat label="Dépenses" value={String(count)} />
        </div>

        {/* Budget du mois (si défini) */}
        {budgetCents > 0 && (
          <Card>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Budget du mois</span>
              <span
                className="font-semibold tabular-nums"
                style={{
                  color:
                    budgetPct >= 100
                      ? "var(--danger)"
                      : budgetPct >= 80
                        ? "#f59e0b"
                        : "var(--success)",
                }}
              >
                {budgetPct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, budgetPct)}%`,
                  backgroundColor:
                    budgetPct >= 100
                      ? "var(--danger)"
                      : budgetPct >= 80
                        ? "#f59e0b"
                        : "var(--success)",
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted tabular-nums">
              {formatMoney(monthCents, currency)} / {formatMoney(budgetCents, currency)}
            </p>
          </Card>
        )}

        {/* Répartition par mois */}
        {totalCents > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Par mois
            </h2>
            <ul className="space-y-2.5">
              {months.map((m) => (
                <li key={m.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted">
                    {m.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((m.cents / maxMonth) * 100)}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-xs font-medium tabular-nums">
                    {formatMoney(m.cents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Liste détaillée des dépenses */}
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Détail des dépenses
          </h2>
          {views.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucune dépense dans cette catégorie pour l&apos;instant.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {views.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  currency={currency}
                  deletable
                  editable
                />
              ))}
            </ul>
          )}
          {count > views.length && (
            <p className="pt-3 text-center text-xs text-muted">
              Les {views.length} dépenses les plus récentes sont affichées.
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
    </Card>
  );
}

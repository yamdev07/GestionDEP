import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { BalanceCard } from "@/components/balance-card";
import { CategoryChart } from "@/components/category-chart";
import {
  TransactionRow,
  type TransactionView,
} from "@/components/transaction-row";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { toTransactionView } from "@/lib/views";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, currency: true },
  });
  if (!user) redirect("/login");
  const currency = user.currency;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const [monthTx, recent] = await Promise.all([
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
  ]);

  const incomeCents = monthTx
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = monthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amountCents, 0);
  const balanceCents = incomeCents - expenseCents;

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

        {/* Revenus / Dépenses */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Revenus"
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

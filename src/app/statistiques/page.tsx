import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { CategoryChart } from "@/components/category-chart";
import { PremiumGate } from "@/components/premium-gate";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { getPlanStatus } from "@/lib/subscription";
import { canAdvancedStats } from "@/lib/plans";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");
  const currency = user.currency;

  const status = await getPlanStatus(userId);
  if (!canAdvancedStats(status.plan)) {
    return (
      <AppShell>
        <div className="space-y-5">
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <PremiumGate
            title="Fonction des plans payants"
            description="Répartition des dépenses par catégorie et tendance sur 6 mois. Disponible dès le plan Essentiel."
            pay={null}
          />
        </div>
      </AppShell>
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Début de la fenêtre de 6 mois.
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [monthTx, windowTx] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: windowStart, lt: monthEnd } },
      select: { type: true, amountCents: true, date: true },
    }),
  ]);

  const income = monthTx
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amountCents, 0);
  const expense = monthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amountCents, 0);

  // Répartition des dépenses du mois.
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

  // Tendance mensuelle (6 mois) : dépenses & revenus par mois.
  const months: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      income: 0,
      expense: 0,
    });
  }
  for (const t of windowTx) {
    const d = new Date(t.date);
    const idx =
      5 - (now.getFullYear() * 12 + now.getMonth() - (d.getFullYear() * 12 + d.getMonth()));
    if (idx >= 0 && idx < 6) {
      if (t.type === "INCOME") months[idx].income += t.amountCents;
      else months[idx].expense += t.amountCents;
    }
  }
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Statistiques</h1>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Entrées" value={formatMoney(income, currency)} tone="success" />
          <MiniStat label="Dépenses" value={formatMoney(expense, currency)} tone="danger" />
          <MiniStat
            label="Solde"
            value={formatMoney(income - expense, currency)}
            tone="primary"
          />
        </div>

        <Card>
          <h2 className="mb-4 text-base font-bold">Dépenses par catégorie (ce mois)</h2>
          <CategoryChart data={chartData} currency={currency} />
        </Card>

        <Card>
          <h2 className="mb-5 text-base font-bold">Tendance sur 6 mois</h2>
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {months.map((m, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t-md"
                    style={{
                      height: `${(m.income / maxMonth) * 100}%`,
                      minHeight: m.income > 0 ? 4 : 0,
                      backgroundColor: "var(--success)",
                    }}
                    title={`Entrées : ${formatMoney(m.income, currency)}`}
                  />
                  <div
                    className="w-1/2 rounded-t-md"
                    style={{
                      height: `${(m.expense / maxMonth) * 100}%`,
                      minHeight: m.expense > 0 ? 4 : 0,
                      backgroundColor: "var(--danger)",
                    }}
                    title={`Dépenses : ${formatMoney(m.expense, currency)}`}
                  />
                </div>
                <span className="text-xs capitalize text-muted">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-5 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
              Entrées
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
              Dépenses
            </span>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "primary";
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "danger"
        ? "var(--danger)"
        : "var(--primary)";
  return (
    <Card className="p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </Card>
  );
}

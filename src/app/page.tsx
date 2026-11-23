import { redirect } from "next/navigation";
import { TrendingUp, Receipt, CalendarDays } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { QuickAddForm } from "@/components/quick-add-form";
import { CategoryChart } from "@/components/category-chart";
import { ExpenseRow, type ExpenseView } from "@/components/expense-row";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

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
  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const [categories, monthExpenses, recent] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: monthStart } },
      include: { category: { select: { name: true, color: true } } },
    }),
    prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 8,
      include: { category: { select: { name: true, color: true } } },
    }),
  ]);

  // Totaux
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amountCents, 0);
  const count = monthExpenses.length;

  // Répartition par catégorie
  const byCat = new Map<string, { name: string; value: number; color: string }>();
  for (const e of monthExpenses) {
    const key = e.category?.name ?? "Sans catégorie";
    const color = e.category?.color ?? "#6b7280";
    const entry = byCat.get(key) ?? { name: key, value: 0, color };
    entry.value += e.amountCents;
    byCat.set(key, entry);
  }
  const chartData = [...byCat.values()].sort((a, b) => b.value - a.value);

  const recentViews: ExpenseView[] = recent.map((e) => ({
    id: e.id,
    amountCents: e.amountCents,
    note: e.note,
    date: e.date.toISOString(),
    categoryName: e.category?.name ?? null,
    categoryColor: e.category?.color ?? null,
  }));

  return (
    <AppShell userName={user.name}>
      <div className="space-y-5">
        {/* Saisie éclair */}
        <Card className="bg-surface">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Nouvelle dépense
          </h2>
          <QuickAddForm categories={categories} currency={currency} />
        </Card>

        {/* Statistiques du mois */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label={`Total ${monthLabel}`}
            value={formatMoney(monthTotal, currency)}
          />
          <StatCard
            icon={<Receipt className="h-5 w-5" />}
            label="Dépenses"
            value={String(count)}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Moyenne / dépense"
            value={formatMoney(count ? Math.round(monthTotal / count) : 0, currency)}
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* Répartition */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Répartition du mois
          </h2>
          <CategoryChart data={chartData} currency={currency} />
        </Card>

        {/* Dépenses récentes */}
        <Card>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
            Dernières dépenses
          </h2>
          {recentViews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Aucune dépense pour l&apos;instant. Ajoute ta première ci-dessus ☝️
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentViews.map((e) => (
                <ExpenseRow key={e.id} expense={e} currency={currency} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className ?? ""}`}>
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </Card>
  );
}

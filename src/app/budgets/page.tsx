import Link from "next/link";
import { redirect } from "next/navigation";
import { Tag, Archive } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { BudgetManager, type BudgetRowData } from "@/components/budget-manager";
import { BudgetAlerts } from "@/components/budget-alerts";
import { Card } from "@/components/ui";
import { getPlanStatus } from "@/lib/subscription";
import { canBudgetAlerts } from "@/lib/plans";
import { getBudgetAlerts } from "@/lib/budget-alerts";
import { closeDueMonths } from "@/lib/budget-periods";

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  if (!user) redirect("/login");

  // Archive les mois échus (report inclus) avant d'afficher.
  await closeDueMonths(userId);

  const status = await getPlanStatus(userId);
  const alerts = canBudgetAlerts(status.plan) ? await getBudgetAlerts(userId) : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [categories, monthExpenses] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { budget: { select: { amountCents: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const spentByCat = new Map<string, number>();
  for (const g of monthExpenses) {
    if (g.categoryId) spentByCat.set(g.categoryId, g._sum.amountCents ?? 0);
  }

  const rows: BudgetRowData[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    budgetCents: c.budget?.amountCents ?? null,
    spentCents: spentByCat.get(c.id) ?? 0,
  }));

  const monthLabel = now.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Mes limites de dépenses</h1>
            <p className="text-sm text-muted">Vos limites pour {monthLabel}</p>
          </div>
          <Link
            href="/budgets/historique"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-border px-3.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </Link>
        </div>

        <p className="-mt-2 text-sm text-muted">
          Définissez combien vous souhaitez dépenser au maximum dans chaque
          catégorie. Nous vous avertirons lorsque vous approcherez de cette
          limite.
        </p>

        <BudgetAlerts
          alerts={alerts}
          currency={user.currency}
          title="Dépenses à surveiller"
        />

        {rows.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <Tag className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              Crée d&apos;abord des catégories pour définir des budgets.
            </p>
            <Link
              href="/categories"
              className="text-sm font-medium text-primary hover:underline"
            >
              Gérer les catégories
            </Link>
          </Card>
        ) : (
          <BudgetManager rows={rows} currency={user.currency} />
        )}
      </div>
    </AppShell>
  );
}

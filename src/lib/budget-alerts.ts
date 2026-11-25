import { prisma } from "@/lib/prisma";

export type BudgetAlert = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  spentCents: number;
  budgetCents: number;
  pct: number;
  over: boolean; // budget dépassé
};

/**
 * Catégories dont les dépenses du mois atteignent ou dépassent 80% du budget.
 * Fonction Premium (le déclencheur gère le gating par plan).
 */
export async function getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });
  if (budgets.length === 0) return [];

  const spends = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: monthStart, lt: monthEnd },
      categoryId: { in: budgets.map((b) => b.categoryId) },
    },
    _sum: { amountCents: true },
  });
  const spentByCat = new Map<string, number>();
  for (const g of spends) {
    if (g.categoryId) spentByCat.set(g.categoryId, g._sum.amountCents ?? 0);
  }

  const alerts: BudgetAlert[] = [];
  for (const b of budgets) {
    if (b.amountCents <= 0) continue;
    const spent = spentByCat.get(b.categoryId) ?? 0;
    const pct = Math.round((spent / b.amountCents) * 100);
    if (pct >= 80) {
      alerts.push({
        categoryId: b.categoryId,
        name: b.category.name,
        color: b.category.color,
        icon: b.category.icon,
        spentCents: spent,
        budgetCents: b.amountCents,
        pct,
        over: pct >= 100,
      });
    }
  }
  return alerts.sort((a, b) => b.pct - a.pct);
}

import { prisma } from "@/lib/prisma";
import { sendPushToUser, isPushConfigured } from "@/lib/push";
import { formatMoney } from "@/lib/utils";

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

/** Niveau de notification d'une alerte. */
function alertLevel(a: BudgetAlert): "NEAR" | "OVER" {
  return a.over ? "OVER" : "NEAR";
}

/**
 * Évalue les alertes de budget d'un utilisateur et envoie une notification push
 * pour chaque NOUVELLE alerte (niveau non encore notifié ce mois-ci).
 * Idempotent : appelable en boucle (cron) sans spammer.
 * Renvoie le nombre de notifications envoyées.
 *
 * Le gating par plan (Premium) est à la charge de l'appelant.
 */
export async function notifyBudgetAlerts(userId: string): Promise<number> {
  if (!isPushConfigured()) return 0;

  const alerts = await getBudgetAlerts(userId);
  if (alerts.length === 0) return 0;

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true },
  });
  const currency = user?.currency ?? "XOF";

  let sent = 0;
  for (const a of alerts) {
    const level = alertLevel(a);
    // Déjà notifié pour ce mois + ce niveau ? On passe.
    const already = await prisma.alertNotification.findUnique({
      where: {
        userId_categoryId_period_level: {
          userId,
          categoryId: a.categoryId,
          period,
          level,
        },
      },
      select: { id: true },
    });
    if (already) continue;

    const title = a.over
      ? `Budget dépassé : ${a.name}`
      : `Budget bientôt atteint : ${a.name}`;
    const body = `${formatMoney(a.spentCents, currency)} / ${formatMoney(a.budgetCents, currency)} (${a.pct} %)`;

    const n = await sendPushToUser(userId, {
      title,
      body,
      url: "/budgets",
      tag: `budget-${a.categoryId}-${period}`,
    });

    // On enregistre la trace même si aucun appareil n'était joignable, pour
    // éviter de réévaluer en boucle ; un nouveau niveau (OVER) renotifiera.
    await prisma.alertNotification
      .create({
        data: { userId, categoryId: a.categoryId, period, level },
      })
      .catch(() => {});

    sent += n;
  }

  return sent;
}

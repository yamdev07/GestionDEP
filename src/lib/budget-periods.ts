import { prisma } from "@/lib/prisma";
import { sendPushToUser, isPushConfigured } from "@/lib/push";

/** categoryId sentinelle pour dédupliquer la notif mensuelle (réutilise AlertNotification). */
const MONTH_RESET_SENTINEL = "__MONTH_RESET__";

/** Clé de mois "YYYY-MM" (comparable lexicographiquement). */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Premier jour du mois d'une clé "YYYY-MM". */
function keyToStart(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Décale une clé de mois de n mois (n peut être négatif). */
export function addMonthKey(key: string, n: number): string {
  const d = keyToStart(key);
  d.setMonth(d.getMonth() + n);
  return monthKey(d);
}

/**
 * Clôture tous les mois échus (jusqu'au mois précédent inclus) pour les budgets
 * de l'utilisateur, en chaînant le report (rollover). Idempotent : un mois déjà
 * archivé n'est pas recréé (contrainte unique). Peu coûteux et sûr à rappeler.
 *
 * Renvoie la liste des clés de mois nouvellement archivées.
 */
export async function closeDueMonths(userId: string): Promise<string[]> {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
  if (budgets.length === 0) return [];

  const currentKey = monthKey(new Date());
  const newlyClosed = new Set<string>();

  for (const b of budgets) {
    const last = await prisma.budgetPeriod.findFirst({
      where: { userId, categoryId: b.categoryId },
      orderBy: { period: "desc" },
      select: { period: true, rolloverCents: true },
    });

    // Point de départ : le mois suivant la dernière archive, sinon le mois de
    // création du budget (on n'archive pas avant son existence).
    let startKey = last
      ? addMonthKey(last.period, 1)
      : monthKey(b.createdAt);
    let rollover = last?.rolloverCents ?? 0;

    // Clôture chaque mois de startKey jusqu'au mois courant (exclu). Garde-fou.
    let guard = 0;
    while (startKey < currentKey && guard < 36) {
      const start = keyToStart(startKey);
      const end = keyToStart(addMonthKey(startKey, 1));

      const spentAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          type: "EXPENSE",
          date: { gte: start, lt: end },
        },
        _sum: { amountCents: true },
      });
      const spent = spentAgg._sum.amountCents ?? 0;
      const effCap = b.amountCents + rollover;
      const outRollover = effCap - spent;

      try {
        await prisma.budgetPeriod.create({
          data: {
            userId,
            categoryId: b.categoryId,
            categoryName: b.category.name,
            categoryColor: b.category.color,
            categoryIcon: b.category.icon,
            period: startKey,
            budgetCents: effCap,
            spentCents: spent,
            rolloverCents: outRollover,
          },
        });
        newlyClosed.add(startKey);
      } catch {
        // Déjà archivé (course concurrente) : on ignore.
      }

      rollover = outRollover;
      startKey = addMonthKey(startKey, 1);
      guard += 1;
    }
  }

  return [...newlyClosed];
}

/**
 * Report entrant du mois courant par catégorie (= report sortant du mois
 * précédent archivé). Sert à calculer le plafond EFFECTIF du mois en cours.
 */
export async function getRolloverByCategory(
  userId: string,
): Promise<Map<string, number>> {
  const prev = addMonthKey(monthKey(new Date()), -1);
  const rows = await prisma.budgetPeriod.findMany({
    where: { userId, period: prev },
    select: { categoryId: true, rolloverCents: true },
  });
  return new Map(rows.map((r) => [r.categoryId, r.rolloverCents]));
}

/**
 * Clôture les mois échus et, si le mois précédent vient d'être archivé (bascule
 * de mois), envoie UNE notification push de rappel (dédupliquée par mois).
 * Renvoie true si un report de mois vient d'avoir lieu (pour la bannière in-app).
 */
export async function processMonthRollover(userId: string): Promise<boolean> {
  const closed = await closeDueMonths(userId);
  const currentKey = monthKey(new Date());
  const prev = addMonthKey(currentKey, -1);
  if (!closed.includes(prev)) return false;

  // Dédup de la notif : une seule fois pour ce mois (contrainte unique).
  try {
    await prisma.alertNotification.create({
      data: {
        userId,
        categoryId: MONTH_RESET_SENTINEL,
        period: currentKey,
        level: "RESET",
      },
    });
  } catch {
    return true; // déjà notifié ce mois-ci ; le report est bien fait
  }

  if (isPushConfigured()) {
    const count = await prisma.budgetPeriod.count({
      where: { userId, period: prev },
    });
    await sendPushToUser(userId, {
      title: "Nouveau mois : budgets reportés",
      body: `${count} budget${count > 1 ? "s" : ""} reporté${count > 1 ? "s" : ""}. Vois le récap du mois passé.`,
      url: "/budgets/historique",
      tag: `month-reset-${currentKey}`,
    });
  }
  return true;
}

/** Report entrant pour UNE catégorie (mois courant). */
export async function getCategoryRollover(
  userId: string,
  categoryId: string,
): Promise<number> {
  const prev = addMonthKey(monthKey(new Date()), -1);
  const row = await prisma.budgetPeriod.findUnique({
    where: {
      userId_categoryId_period: { userId, categoryId, period: prev },
    },
    select: { rolloverCents: true },
  });
  return row?.rolloverCents ?? 0;
}

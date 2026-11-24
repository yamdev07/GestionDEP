import { prisma } from "@/lib/prisma";
import { SAAS_LAUNCH, FREE_LIMITS, planRank } from "@/lib/plans";

/** Plan effectif : grandfathered (compte ancien) → Premium ; sinon le plan si encore valide, sinon Gratuit. */
export function effectivePlan(u: {
  plan: string;
  planUntil: Date | null;
  createdAt: Date;
}): string {
  if (u.createdAt.getTime() < SAAS_LAUNCH.getTime()) return "PREMIUM";
  if (u.planUntil && u.planUntil.getTime() > Date.now()) return u.plan;
  return "GRATUIT";
}

export type PlanStatus = {
  plan: string;
  rank: number;
  planUntil: Date | null;
  grandfathered: boolean;
  trial: boolean; // plan payant actif issu de l'essai gratuit (aucun paiement encore)
  daysLeft: number | null; // jours restants avant expiration du plan payant
};

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const [u, paidCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planUntil: true, createdAt: true },
    }),
    prisma.payment.count({ where: { userId, status: "APPROVED" } }),
  ]);
  if (!u) {
    return {
      plan: "GRATUIT",
      rank: 0,
      planUntil: null,
      grandfathered: false,
      trial: false,
      daysLeft: null,
    };
  }
  const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
  const plan = effectivePlan(u);
  const now = Date.now();
  const active = !!u.planUntil && u.planUntil.getTime() > now;
  const daysLeft =
    active && u.planUntil
      ? Math.max(1, Math.ceil((u.planUntil.getTime() - now) / 86400000))
      : null;
  // Essai = plan payant actif, pas grandfathered, et aucun paiement validé.
  const trial = active && !grandfathered && planRank(plan) >= 1 && paidCount === 0;
  return {
    plan,
    rank: planRank(plan),
    planUntil: u.planUntil,
    grandfathered,
    trial,
    daysLeft,
  };
}

/** Bornes du mois courant (pour compter les opérations). */
export function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export { FREE_LIMITS };

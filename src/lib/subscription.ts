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
};

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planUntil: true, createdAt: true },
  });
  if (!u) {
    return { plan: "GRATUIT", rank: 0, planUntil: null, grandfathered: false };
  }
  const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
  const plan = effectivePlan(u);
  return { plan, rank: planRank(plan), planUntil: u.planUntil, grandfathered };
}

/** Bornes du mois courant (pour compter les opérations). */
export function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export { FREE_LIMITS };

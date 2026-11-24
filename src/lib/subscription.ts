import { prisma } from "@/lib/prisma";
import { SAAS_LAUNCH, FREE_LIMITS } from "@/lib/plans";

/** Premium si grandfathered (compte ancien) ou abonnement encore valide. */
export function computeIsPremium(u: {
  premiumUntil: Date | null;
  createdAt: Date;
}): boolean {
  if (u.createdAt.getTime() < SAAS_LAUNCH.getTime()) return true;
  return !!u.premiumUntil && u.premiumUntil.getTime() > Date.now();
}

export type PlanStatus = {
  premium: boolean;
  premiumUntil: Date | null;
  grandfathered: boolean;
};

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumUntil: true, createdAt: true },
  });
  if (!u) return { premium: false, premiumUntil: null, grandfathered: false };
  const grandfathered = u.createdAt.getTime() < SAAS_LAUNCH.getTime();
  return {
    premium: computeIsPremium(u),
    premiumUntil: u.premiumUntil,
    grandfathered,
  };
}

/** Bornes du mois courant (pour compter les opérations). */
export function monthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export { FREE_LIMITS };

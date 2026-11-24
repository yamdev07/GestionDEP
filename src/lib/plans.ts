/** Plans, tarifs (centimes) et fonctionnalités. Tout se règle ici. */

export type PlanKey = "GRATUIT" | "ESSENTIEL" | "PREMIUM";
export type Cycle = "MENSUEL" | "ANNUEL";

export const PLANS: Record<
  PlanKey,
  { label: string; monthlyCents: number; annualCents: number; rank: number }
> = {
  GRATUIT: { label: "Gratuit", monthlyCents: 0, annualCents: 0, rank: 0 },
  ESSENTIEL: { label: "Essentiel", monthlyCents: 20000, annualCents: 200000, rank: 1 }, // 200 F/mois, 2 000 F/an
  PREMIUM: { label: "Premium", monthlyCents: 40000, annualCents: 400000, rank: 2 }, // 400 F/mois, 4 000 F/an
};

/**
 * Comptes créés AVANT cette date : plan Premium offert à vie (grandfather),
 * sans écriture en base. Les comptes créés après sont en Gratuit par défaut.
 */
export const SAAS_LAUNCH = new Date("2026-11-25T00:00:00Z");

/**
 * Essai gratuit : à l'inscription, tout nouveau compte reçoit le plan ci-dessous
 * pendant TRIAL_DAYS jours, puis bascule automatiquement en Gratuit (bridé).
 */
export const TRIAL_DAYS = 3;
export const TRIAL_PLAN: PlanKey = "PREMIUM";

/** Limites du plan Gratuit (rang 0) — volontairement serrées pour inciter à passer payant. */
export const FREE_LIMITS = {
  accounts: 1,
  txPerMonth: 10,
  goals: 1,
};

export function planRank(plan: string): number {
  return PLANS[plan as PlanKey]?.rank ?? 0;
}

export function priceCentsFor(plan: PlanKey, cycle: Cycle): number {
  return cycle === "ANNUEL" ? PLANS[plan].annualCents : PLANS[plan].monthlyCents;
}

// Fonctionnalités par rang de plan.
export const isUnlimited = (plan: string) => planRank(plan) >= 1; // portefeuilles/opérations/objectifs
export const canBudgets = (plan: string) => planRank(plan) >= 1;
export const canAdvancedStats = (plan: string) => planRank(plan) >= 1;
export const canExport = (plan: string) => planRank(plan) >= 2;

export const PLAN_LABELS: Record<string, string> = {
  GRATUIT: "Gratuit",
  ESSENTIEL: "Essentiel",
  PREMIUM: "Premium",
  MENSUEL: "Mensuel",
  ANNUEL: "Annuel",
};

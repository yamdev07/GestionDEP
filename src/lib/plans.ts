/** Tarifs et limites des plans (montants en centimes). Faciles à modifier ici. */

export const PRICE_MONTHLY_CENTS = 30000; // 300 F CFA / mois
export const PRICE_ANNUAL_CENTS = 300000; // 3 000 F CFA / an (≈ 2 mois offerts)

/**
 * Comptes créés AVANT cette date : Premium offert à vie (grandfather),
 * sans aucune écriture en base. Les comptes créés après sont en Gratuit par défaut.
 */
export const SAAS_LAUNCH = new Date("2026-11-25T00:00:00Z");

/** Limites du plan Gratuit. */
export const FREE_LIMITS = {
  accounts: 1, // portefeuilles
  txPerMonth: 50, // opérations par mois
  goals: 1, // objectifs d'épargne
};

/** Fonctionnalités réservées au Premium. */
export const PREMIUM_ONLY = {
  budgets: true,
  advancedStats: true,
  export: true,
};

export const PLAN_LABELS: Record<string, string> = {
  GRATUIT: "Gratuit",
  PREMIUM: "Premium",
  MENSUEL: "Mensuel",
  ANNUEL: "Annuel",
};

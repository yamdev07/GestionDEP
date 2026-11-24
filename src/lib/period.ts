import { toDateInputValue } from "@/lib/utils";

/** Raccourcis de période disponibles pour le journal des dépenses. */
export type PeriodKey = "mois" | "mois-dernier" | "30j" | "annee" | "perso";

export type ResolvedPeriod = {
  key: PeriodKey;
  label: string;
  start: Date; // inclus
  end: Date; // exclu
  from: string; // YYYY-MM-DD (premier jour, pour les champs date)
  to: string; // YYYY-MM-DD (dernier jour inclus, pour les champs date)
};

const KEYS: PeriodKey[] = ["mois", "mois-dernier", "30j", "annee", "perso"];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  mois: "Ce mois",
  "mois-dernier": "Mois dernier",
  "30j": "30 derniers jours",
  annee: "Cette année",
  perso: "Personnalisée",
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Parse une saisie "YYYY-MM-DD" (heure locale) ; null si invalide. */
function parseDateInput(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Calcule la fenêtre de dates [start, end) à partir des paramètres d'URL.
 * Partagé par la page Journal et la route d'export pour garantir la cohérence.
 */
export function resolvePeriod(
  params: { p?: string; from?: string; to?: string },
  now: Date = new Date(),
): ResolvedPeriod {
  const today = startOfDay(now);
  const key: PeriodKey = KEYS.includes(params.p as PeriodKey)
    ? (params.p as PeriodKey)
    : "mois";

  let start: Date;
  let end: Date;

  switch (key) {
    case "mois-dernier":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "30j":
      start = addDays(today, -29);
      end = addDays(today, 1); // aujourd'hui inclus
      break;
    case "annee":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    case "perso": {
      const a = parseDateInput(params.from) ?? today;
      const b = parseDateInput(params.to) ?? today;
      const lo = a <= b ? a : b;
      const hi = a <= b ? b : a;
      start = startOfDay(lo);
      end = addDays(hi, 1); // dernier jour inclus
      break;
    }
    case "mois":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
  }

  const lastDay = addDays(end, -1); // dernier jour inclus
  return {
    key,
    label: PERIOD_LABELS[key],
    start,
    end,
    from: toDateInputValue(start),
    to: toDateInputValue(lastDay),
  };
}

/** Nombre de jours « écoulés » de la période (borné à aujourd'hui) pour la moyenne/jour. */
export function periodDays(p: ResolvedPeriod, now: Date = new Date()): number {
  const todayEnd = new Date(startOfDay(now).getTime() + 86400000);
  const effectiveEnd = p.end.getTime() < todayEnd.getTime() ? p.end : todayEnd;
  const ms = effectiveEnd.getTime() - p.start.getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind proprement (gère les conflits). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un montant (en centimes) vers une chaîne monétaire lisible. */
export function formatMoney(amountCents: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(amountCents / 100);
  } catch {
    // Devise inconnue d'Intl : repli simple.
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

/** Convertit une saisie texte ("12,50" ou "12.5") en centimes entiers. */
export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Date au format YYYY-MM-DD (pour les input type=date), en heure locale. */
export function toDateInputValue(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

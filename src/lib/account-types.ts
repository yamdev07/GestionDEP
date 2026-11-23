/** Métadonnées des types de compte (libellé + icône lucide). */
export const ACCOUNT_TYPES = [
  { value: "CASH", label: "Espèces", icon: "banknote" },
  { value: "MOBILE_MONEY", label: "Mobile Money", icon: "smartphone" },
  { value: "BANK", label: "Banque", icon: "landmark" },
  { value: "OTHER", label: "Autre", icon: "wallet" },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? "Autre";
}

export function accountTypeIcon(type: string): string {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.icon ?? "wallet";
}

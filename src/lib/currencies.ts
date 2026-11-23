/** Devises proposées dans l'application. */
export const CURRENCIES = [
  { code: "XOF", label: "Franc CFA (Ouest) — F CFA" },
  { code: "XAF", label: "Franc CFA (Centrale) — FCFA" },
  { code: "EUR", label: "Euro — €" },
  { code: "USD", label: "Dollar US — $" },
  { code: "MAD", label: "Dirham marocain — DH" },
  { code: "CAD", label: "Dollar canadien — $" },
] as const;

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [
  string,
  ...string[],
];

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setBudget, deleteBudget } from "@/lib/actions/budgets";
import type { ActionResult } from "@/lib/actions/transactions";
import { Button, Card, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { formatMoney, currencySymbol } from "@/lib/utils";

export type BudgetRowData = {
  id: string;
  name: string;
  color: string;
  icon: string;
  budgetCents: number | null;
  spentCents: number;
};

export function BudgetManager({
  rows,
  currency,
}: {
  rows: BudgetRowData[];
  currency: string;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <BudgetRow key={r.id} row={r} currency={currency} />
      ))}
    </div>
  );
}

function BudgetRow({
  row,
  currency,
}: {
  row: BudgetRowData;
  currency: string;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(
    row.budgetCents != null ? String(Math.round(row.budgetCents / 100)) : "",
  );
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(setBudget, undefined);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    // Ferme le formulaire une fois la limite enregistrée (résultat du server action).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setEditing(false);
  }, [state]);

  const hasBudget = row.budgetCents != null && row.budgetCents > 0;
  const ratio = hasBudget ? row.spentCents / row.budgetCents! : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const over = hasBudget && row.spentCents > row.budgetCents!;

  const barColor = over
    ? "var(--danger)"
    : ratio >= 0.8
      ? "#f59e0b"
      : "var(--success)";

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <CategoryIcon
          icon={row.icon}
          color={row.color}
          className="h-10 w-10 shrink-0 rounded-xl"
          size={18}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="text-xs text-muted">
            Dépensé : {formatMoney(row.spentCents, currency)}
            {hasBudget
              ? ` sur une limite de ${formatMoney(row.budgetCents!, currency)}`
              : ""}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            {hasBudget ? "Modifier ma limite" : "Fixer une limite"}
          </button>
        )}
      </div>

      {hasBudget && !editing && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <p
            className="mt-1.5 text-xs font-medium"
            style={{ color: over ? "var(--danger)" : "var(--muted)" }}
          >
            {over
              ? `Budget dépassé de ${formatMoney(row.spentCents - row.budgetCents!, currency)}`
              : `${pct} % de votre limite utilisée · ${formatMoney(row.budgetCents! - row.spentCents, currency)} restant`}
          </p>
        </div>
      )}

      {editing && (
        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="categoryId" value={row.id} />
          <p className="text-sm text-muted">
            Catégorie :{" "}
            <span className="font-medium text-foreground">{row.name}</span>
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Montant maximum à dépenser
            </label>
            <div className="relative">
              <Input
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ex : 10 000"
                autoFocus
                className="h-11 pr-16"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                {currencySymbol(currency)}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted">
            Période :{" "}
            <span className="font-medium text-foreground">Chaque mois</span>
          </p>
          <p className="text-xs text-muted">
            Nous vous avertirons lorsque vos dépenses approcheront du montant
            défini.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              <Check className="h-4 w-4" /> Enregistrer ma limite
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Annuler
            </Button>
            {hasBudget && (
              <Button
                type="button"
                variant="danger"
                disabled={deletePending}
                onClick={() =>
                  startDelete(async () => {
                    await deleteBudget(row.id);
                    setEditing(false);
                  })
                }
              >
                Supprimer
              </Button>
            )}
          </div>
        </form>
      )}

      {state?.error && editing && (
        <p className="mt-2 text-xs text-danger">{state.error}</p>
      )}
    </Card>
  );
}

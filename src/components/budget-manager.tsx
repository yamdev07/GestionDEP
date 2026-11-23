"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setBudget, deleteBudget } from "@/lib/actions/budgets";
import type { ActionResult } from "@/lib/actions/transactions";
import { Button, Card, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { formatMoney } from "@/lib/utils";

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
            {formatMoney(row.spentCents, currency)}
            {hasBudget ? ` / ${formatMoney(row.budgetCents!, currency)}` : ""}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            {hasBudget ? "Modifier" : "Définir"}
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
              ? `Dépassé de ${formatMoney(row.spentCents - row.budgetCents!, currency)}`
              : `${pct}% utilisé · reste ${formatMoney(row.budgetCents! - row.spentCents, currency)}`}
          </p>
        </div>
      )}

      {editing && (
        <form action={formAction} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="categoryId" value={row.id} />
          <Input
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Plafond mensuel"
            autoFocus
            className="h-10"
          />
          <Button type="submit" size="icon" disabled={pending} title="Enregistrer">
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Annuler"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          {hasBudget && (
            <Button
              type="button"
              variant="danger"
              size="icon"
              title="Supprimer le budget"
              disabled={deletePending}
              onClick={() =>
                startDelete(async () => {
                  await deleteBudget(row.id);
                  setEditing(false);
                })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
      )}

      {state?.error && editing && (
        <p className="mt-2 text-xs text-danger">{state.error}</p>
      )}
    </Card>
  );
}

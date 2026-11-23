"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/utils";

export type ExpenseView = {
  id: string;
  amountCents: number;
  note: string;
  date: string; // ISO
  categoryName: string | null;
  categoryColor: string | null;
};

export function ExpenseRow({
  expense,
  currency,
}: {
  expense: ExpenseView;
  currency: string;
}) {
  const [pending, startTransition] = useTransition();

  const dateLabel = new Date(expense.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });

  function onDelete() {
    if (!confirm("Supprimer cette dépense ?")) return;
    startTransition(async () => {
      await deleteExpense(expense.id);
    });
  }

  return (
    <li
      className={`flex items-center gap-3 py-3 transition ${
        pending ? "opacity-40" : ""
      }`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: expense.categoryColor ?? "#6b7280" }}
      >
        {(expense.categoryName ?? "?").slice(0, 1).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {expense.note || expense.categoryName || "Dépense"}
        </p>
        <p className="text-xs text-muted">
          {expense.categoryName ?? "Sans catégorie"} · {dateLabel}
        </p>
      </div>

      <span className="font-semibold">
        {formatMoney(expense.amountCents, currency)}
      </span>

      <button
        onClick={onDelete}
        disabled={pending}
        title="Supprimer"
        className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

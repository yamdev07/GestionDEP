"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2, Wallet, Pencil } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/transactions";
import { formatMoney, cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/category-icon";

export type TransactionView = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  note: string;
  date: string; // ISO
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

export function TransactionRow({
  tx,
  currency,
  deletable = false,
  editable = false,
}: {
  tx: TransactionView;
  currency: string;
  deletable?: boolean;
  editable?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const isIncome = tx.type === "INCOME";

  const dateLabel = new Date(tx.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  function onDelete() {
    if (!confirm("Supprimer cette opération ?")) return;
    startTransition(async () => {
      await deleteTransaction(tx.id);
    });
  }

  const title = tx.note || tx.categoryName || (isIncome ? "Revenu" : "Dépense");
  const subtitle = isIncome
    ? `Revenu · ${dateLabel}`
    : `${tx.categoryName ?? "Sans catégorie"} · ${dateLabel}`;

  const amountStr = formatMoney(tx.amountCents, currency);
  const color = isIncome ? "var(--success)" : "var(--danger)";

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3.5 transition",
        pending && "opacity-40",
      )}
    >
      {isIncome ? (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ color: "var(--success)", backgroundColor: "color-mix(in srgb, var(--success) 14%, transparent)" }}
        >
          <Wallet className="h-5 w-5" />
        </span>
      ) : (
        <CategoryIcon
          icon={tx.categoryIcon}
          color={tx.categoryColor ?? "#6b7280"}
          className="h-11 w-11 shrink-0 rounded-2xl"
          size={20}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>

      <span className="shrink-0 font-bold tabular-nums" style={{ color }}>
        {isIncome ? "+ " : "- "}
        {amountStr}
      </span>

      {editable && (
        <Link
          href={`/operations/${tx.id}`}
          title="Modifier"
          className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      )}

      {deletable && (
        <button
          onClick={onDelete}
          disabled={pending}
          title="Supprimer"
          className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

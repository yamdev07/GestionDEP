import type { TransactionView } from "@/components/transaction-row";

type TxWithCategory = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  note: string;
  date: Date;
  category: { name: string; color: string; icon: string } | null;
};

/** Transforme une transaction Prisma (avec catégorie) en vue client sérialisable. */
export function toTransactionView(t: TxWithCategory): TransactionView {
  return {
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    note: t.note,
    date: t.date.toISOString(),
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
    categoryIcon: t.category?.icon ?? null,
  };
}

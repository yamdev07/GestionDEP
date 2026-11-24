"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar, Pencil, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  createTransaction,
  updateTransaction,
  type ActionResult,
} from "@/lib/actions/transactions";
import { Button, Input } from "@/components/ui";
import { cn, toDateInputValue, currencySymbol } from "@/lib/utils";

type Cat = { id: string; name: string; color: string };
type Acc = { id: string; name: string; color: string };

export type TransactionInitial = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  note: string;
  date: string; // ISO
  categoryId: string | null;
  accountId: string | null;
};

/** Convertit des centimes en valeur de saisie ("1350" ou "12.5"). */
function centsToInput(amountCents: number): string {
  const value = amountCents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function AddTransactionForm({
  categories,
  accounts,
  currency,
  defaultType = "EXPENSE",
  initial = null,
}: {
  categories: Cat[];
  accounts: Acc[];
  currency: string;
  defaultType?: "INCOME" | "EXPENSE";
  initial?: TransactionInitial | null;
}) {
  const router = useRouter();
  const isEdit = initial !== null;

  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(isEdit ? updateTransaction : createTransaction, undefined);

  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    initial?.type ?? defaultType,
  );
  const [amount, setAmount] = useState(
    initial ? centsToInput(initial.amountCents) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(() =>
    toDateInputValue(initial ? new Date(initial.date) : new Date()),
  );
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [accountId, setAccountId] = useState<string>(
    initial?.accountId ?? accounts[0]?.id ?? "",
  );
  const amountRef = useRef<HTMLInputElement>(null);

  // Après un enregistrement réussi : édition → liste, création → accueil.
  useEffect(() => {
    if (state?.ok) {
      router.push(isEdit ? "/operations" : "/");
      router.refresh();
    }
  }, [state, router, isEdit]);

  const symbol = currencySymbol(currency);
  const isIncome = type === "INCOME";
  const selectedCat = categories.find((c) => c.id === categoryId);
  const isOther =
    !isIncome && selectedCat?.name?.trim().toLowerCase() === "autre";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="type" value={type} />
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      {/* Bascule Dépense / Revenu */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1.5">
        <button
          type="button"
          onClick={() => setType("EXPENSE")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
            !isIncome
              ? "bg-surface text-danger shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          <ArrowDownCircle className="h-4 w-4" /> Dépense
        </button>
        <button
          type="button"
          onClick={() => setType("INCOME")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
            isIncome
              ? "bg-surface text-success shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          <ArrowUpCircle className="h-4 w-4" /> Revenu
        </button>
      </div>

      {/* Montant */}
      <div className="relative">
        <Input
          ref={amountRef}
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          required
          autoFocus
          className="h-20 px-16 text-center text-5xl font-bold tracking-tight"
        />
        <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted">
          {symbol}
        </span>
      </div>

      {/* Compte / portefeuille */}
      {accounts.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Compte</p>
          <input type="hidden" name="accountId" value={accountId} />
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const active = a.id === accountId;
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                  style={active ? { backgroundColor: a.color } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active ? "#ffffff" : a.color }}
                  />
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catégories (dépenses uniquement) */}
      {!isIncome && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Catégorie</p>
          <input type="hidden" name="categoryId" value={categoryId} />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                  style={active ? { backgroundColor: c.color } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active ? "#ffffff" : c.color }}
                  />
                  {c.name}
                </button>
              );
            })}
            {categories.length === 0 && (
              <span className="text-sm text-muted">
                Crée d&apos;abord une catégorie.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Précision obligatoire quand la catégorie est « Autre » */}
      {isOther && (
        <p className="-mt-2 text-sm font-medium text-primary">
          Catégorie « Autre » : précise de quoi il s&apos;agit ci-dessous.
        </p>
      )}

      {/* Note + date */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <Pencil className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isIncome
                ? "Libellé (ex: Salaire)"
                : isOther
                  ? "Préciser « Autre » (ex: Cadeau, Imprévu)"
                  : "Note (ex: Courses)"
            }
            className={cn("pl-9", isOther && "border-primary ring-2 ring-primary/20")}
            maxLength={200}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || !amount}
      >
        {state?.ok ? (
          <>
            <Check className="h-5 w-5" /> Enregistré !
          </>
        ) : pending ? (
          "Enregistrement…"
        ) : isEdit ? (
          "Enregistrer les modifications"
        ) : isIncome ? (
          "Ajouter le revenu"
        ) : (
          "Ajouter la dépense"
        )}
      </Button>
    </form>
  );
}

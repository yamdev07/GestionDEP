"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Plus, Calendar, Pencil } from "lucide-react";
import { createExpense, type ActionResult } from "@/lib/actions/expenses";
import { Button, Input } from "@/components/ui";
import { cn, toDateInputValue } from "@/lib/utils";

type Cat = { id: string; name: string; color: string };

export function QuickAddForm({
  categories,
  currency,
}: {
  categories: Cat[];
  currency: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createExpense, undefined);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? "",
  );
  const [showDetails, setShowDetails] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  // Réinitialise après un ajout réussi.
  useEffect(() => {
    if (state?.ok) {
      setAmount("");
      setNote("");
      setDate(toDateInputValue(new Date()));
      setShowDetails(false);
      setJustAdded(true);
      amountRef.current?.focus();
      const t = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const symbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;

  return (
    <form action={formAction} className="space-y-4">
      {/* Montant */}
      <div className="relative">
        <Input
          ref={amountRef}
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          required
          autoFocus
          className="h-16 pr-12 text-center text-4xl font-bold tracking-tight"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted">
          {symbol}
        </span>
      </div>

      {/* Catégories (chips) */}
      <input type="hidden" name="categoryId" value={categoryId} />
      <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Détails optionnels */}
      {showDetails ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Pencil className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (ex: Courses Carrefour)"
              className="pl-9"
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
      ) : (
        <>
          <input type="hidden" name="note" value={note} />
          <input type="hidden" name="date" value={date} />
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Ajouter une note / changer la date
          </button>
        </>
      )}

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
        {justAdded ? (
          <>
            <Check className="h-5 w-5" /> Ajoutée !
          </>
        ) : (
          <>
            <Plus className="h-5 w-5" />
            {pending ? "Enregistrement…" : "Ajouter la dépense"}
          </>
        )}
      </Button>
    </form>
  );
}

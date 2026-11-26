"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { addPastExpense } from "@/lib/actions/transactions";
import { Button, Input } from "@/components/ui";
import { UpgradeNotice } from "@/components/upgrade-notice";
import {
  cn,
  currencySymbol,
  formatMoney,
  toDateInputValue,
} from "@/lib/utils";

type Acc = { id: string; name: string; color: string };
type Expense = {
  id: string;
  amountCents: number;
  date: string; // ISO
  note: string;
};

/** Date ISO → libellé court (ex: "12 mars 2026"). */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function BatchExpenseEntry({
  categoryId,
  accounts,
  currency,
  recent,
}: {
  categoryId: string;
  accounts: Acc[];
  currency: string;
  recent: Expense[];
}) {
  const router = useRouter();
  const symbol = currencySymbol(currency);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");

  const [added, setAdded] = useState<Expense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startSave] = useTransition();

  const amountRef = useRef<HTMLInputElement>(null);

  const sessionTotal = added.reduce((s, e) => s + e.amountCents, 0);

  function handleAdd() {
    if (!amount.trim()) {
      setError("Montant requis");
      return;
    }
    setError(null);
    setUpgrade(false);
    startSave(async () => {
      const res = await addPastExpense({
        amount,
        date,
        note: note.trim() || undefined,
        categoryId,
        accountId: accountId || undefined,
      });
      if (res.ok) {
        setAdded((prev) => [res.expense, ...prev]);
        setAmount("");
        setNote("");
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1200);
        amountRef.current?.focus();
        // Garde la même date et le même compte pour enchaîner la saisie.
        router.refresh();
      } else {
        setError(res.error);
        setUpgrade(!!res.upgrade);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Formulaire de saisie */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        {/* Montant */}
        <div className="relative">
          <Input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            autoFocus
            className="h-16 px-14 text-center text-4xl font-bold tracking-tight"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted">
            {symbol}
          </span>
        </div>

        {/* Date (c'est l'intérêt : antidater) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Date de la dépense (passée possible)
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={toDateInputValue(new Date())}
          />
        </div>

        {/* Note */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">
            Note (optionnel)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="ex: Courses du samedi"
            maxLength={200}
          />
        </div>

        {/* Compte (si plusieurs) */}
        {accounts.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Compte</p>
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

        {error &&
          (upgrade ? (
            <UpgradeNotice message={error} />
          ) : (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ))}

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleAdd}
          disabled={pending || !amount.trim()}
        >
          {justSaved ? (
            <>
              <Check className="h-5 w-5" /> Ajoutée !
            </>
          ) : pending ? (
            "Ajout…"
          ) : (
            <>
              <Plus className="h-5 w-5" /> Ajouter et continuer
            </>
          )}
        </Button>
      </div>

      {/* Récap de la session de saisie */}
      {added.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Saisi à l&apos;instant ({added.length})
            </h2>
            <span className="font-semibold">
              {formatMoney(sessionTotal, currency)}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {added.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-muted">{formatDate(e.date)}</p>
                  {e.note && (
                    <p className="truncate text-sm text-foreground">{e.note}</p>
                  )}
                </div>
                <span className="shrink-0 font-medium text-danger">
                  −{formatMoney(e.amountCents, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dépenses déjà enregistrées dans cette catégorie */}
      {recent.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Déjà enregistré dans cette catégorie
          </h2>
          <ul className="divide-y divide-border">
            {recent.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-muted">{formatDate(e.date)}</p>
                  {e.note && (
                    <p className="truncate text-sm text-foreground">{e.note}</p>
                  )}
                </div>
                <span className="shrink-0 font-medium text-foreground">
                  {formatMoney(e.amountCents, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  Calendar,
  Pencil,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Trash2,
  Pause,
  Play,
} from "lucide-react";
import {
  createRecurring,
  toggleRecurring,
  deleteRecurring,
} from "@/lib/actions/recurring";
import type { ActionResult } from "@/lib/actions/transactions";
import { Button, Card, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { useConfirm } from "@/components/confirm-dialog";
import { cn, formatMoney, currencySymbol, toDateInputValue } from "@/lib/utils";

type Cat = { id: string; name: string; color: string; icon: string };
type Acc = { id: string; name: string; color: string };

export type RecurringView = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amountCents: number;
  note: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextRunAt: string;
  active: boolean;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  accountName: string | null;
};

const FREQ_LABEL: Record<RecurringView["frequency"], string> = {
  WEEKLY: "Chaque semaine",
  MONTHLY: "Chaque mois",
  YEARLY: "Chaque année",
};

export function RecurringManager({
  categories,
  accounts,
  currency,
  items,
}: {
  categories: Cat[];
  accounts: Acc[];
  currency: string;
  items: RecurringView[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createRecurring, undefined);

  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [frequency, setFrequency] = useState<RecurringView["frequency"]>("MONTHLY");
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      setAmount("");
      setNote("");
    }
  }, [state]);

  const symbol = currencySymbol(currency);
  const isIncome = type === "INCOME";

  return (
    <div className="space-y-5">
      {/* Formulaire d'ajout */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
          <Repeat className="h-5 w-5 text-primary" /> Nouvelle récurrence
        </h2>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="accountId" value={accountId} />
          <input type="hidden" name="frequency" value={frequency} />

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1.5">
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                !isIncome ? "bg-surface text-danger shadow-sm" : "text-muted",
              )}
            >
              <ArrowDownCircle className="h-4 w-4" /> Dépense
            </button>
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                isIncome ? "bg-surface text-success shadow-sm" : "text-muted",
              )}
            >
              <ArrowUpCircle className="h-4 w-4" /> Entrée
            </button>
          </div>

          <div className="relative">
            <Input
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              required
              className="h-16 px-16 text-center text-3xl font-bold"
            />
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-muted">
              {symbol}
            </span>
          </div>

          {/* Fréquence */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Fréquence</p>
            <div className="flex flex-wrap gap-2">
              {(["WEEKLY", "MONTHLY", "YEARLY"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    f === frequency
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                >
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Compte */}
          {accounts.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Compte</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                      a.id === accountId
                        ? "border-transparent text-white"
                        : "border-border bg-surface text-foreground hover:bg-surface-muted",
                    )}
                    style={a.id === accountId ? { backgroundColor: a.color } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: a.id === accountId ? "#fff" : a.color }}
                    />
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Catégorie (dépenses) */}
          {!isIncome && categories.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Catégorie</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                      c.id === categoryId
                        ? "border-transparent text-white"
                        : "border-border bg-surface text-foreground hover:bg-surface-muted",
                    )}
                    style={c.id === categoryId ? { backgroundColor: c.color } : undefined}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: c.id === categoryId ? "#fff" : c.color }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Pencil className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isIncome ? "Libellé (ex: Salaire)" : "Note (ex: Loyer)"}
                className="pl-9"
                maxLength={200}
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {state?.error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending || !amount}>
            {state?.ok ? (
              <>
                <Check className="h-5 w-5" /> Récurrence ajoutée
              </>
            ) : pending ? (
              "Enregistrement…"
            ) : (
              "Ajouter la récurrence"
            )}
          </Button>
        </form>
      </Card>

      {/* Liste */}
      <Card>
        <h2 className="mb-3 text-base font-bold">Mes récurrences</h2>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Aucune récurrence. Ajoute ton loyer, ton salaire ou tes abonnements
            ci-dessus — ils seront créés automatiquement.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((r) => (
              <RecurringRow key={r.id} r={r} currency={currency} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RecurringRow({ r, currency }: { r: RecurringView; currency: string }) {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const isIncome = r.type === "INCOME";
  const title = r.note || r.categoryName || (isIncome ? "Entrée" : "Dépense");
  const nextLabel = new Date(r.nextRunAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function onDelete() {
    const ok = await confirm({
      title: "Supprimer la récurrence",
      message: `« ${title} » ne sera plus générée. Les opérations déjà créées restent.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    start(async () => {
      await deleteRecurring(r.id);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-3.5", (pending || !r.active) && "opacity-50")}>
      {isIncome ? (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ color: "var(--success)", backgroundColor: "color-mix(in srgb, var(--success) 14%, transparent)" }}
        >
          <ArrowUpCircle className="h-5 w-5" />
        </span>
      ) : (
        <CategoryIcon
          icon={r.categoryIcon}
          color={r.categoryColor ?? "#6b7280"}
          className="h-11 w-11 shrink-0 rounded-2xl"
          size={20}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-xs text-muted">
          {FREQ_LABEL[r.frequency]} · prochaine : {nextLabel}
          {!r.active && " · en pause"}
        </p>
      </div>
      <span
        className="shrink-0 font-bold tabular-nums"
        style={{ color: isIncome ? "var(--success)" : "var(--danger)" }}
      >
        {isIncome ? "+ " : "- "}
        {formatMoney(r.amountCents, currency)}
      </span>
      <button
        onClick={() => start(async () => { await toggleRecurring(r.id); })}
        disabled={pending}
        title={r.active ? "Mettre en pause" : "Réactiver"}
        className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-primary/10 hover:text-primary"
      >
        {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        onClick={onDelete}
        disabled={pending}
        title="Supprimer"
        className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

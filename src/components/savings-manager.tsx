"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2, PiggyBank, Minus } from "lucide-react";
import { createGoal, adjustGoal, deleteGoal } from "@/lib/actions/savings";
import type { ActionResult } from "@/lib/actions/transactions";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { useConfirm } from "@/components/confirm-dialog";
import { Button, Card, Input } from "@/components/ui";
import { cn, formatMoney, currencySymbol } from "@/lib/utils";

export type GoalRowData = {
  id: string;
  name: string;
  color: string;
  targetCents: number;
  savedCents: number;
  deadline: string | null; // ISO
};

const PRESET_COLORS = [
  "#6d28d9", "#22c55e", "#3b82f6", "#f59e0b",
  "#a855f7", "#ef4444", "#ec4899", "#06b6d4",
];

export function SavingsManager({
  goals,
  currency,
}: {
  goals: GoalRowData[];
  currency: string;
}) {
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createGoal, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setColor(PRESET_COLORS[0]);
    }
  }, [state]);

  const symbol = currencySymbol(currency);

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Nouvel objectif
        </h2>
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="color" value={color} />
          <Input name="name" placeholder="Nom (ex: Vacances, Urgences)" required maxLength={60} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative">
              <Input name="target" inputMode="decimal" placeholder="Objectif (optionnel)" className="pr-14" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{symbol}</span>
            </div>
            <div className="relative">
              <Input name="initial" inputMode="decimal" placeholder="Déjà mis de côté" className="pr-14" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{symbol}</span>
            </div>
          </div>

          <Input name="deadline" type="date" className="text-muted" />

          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full transition"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>

          {state?.error &&
            (state.upgrade ? (
              <UpgradeNotice message={state.error} />
            ) : (
              <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
            ))}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {pending ? "Création…" : "Créer l'objectif"}
          </Button>
        </form>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">
            Aucun objectif d&apos;épargne. Crée le premier ci-dessus ☝️
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <GoalItem key={g.id} goal={g} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalItem({ goal, currency }: { goal: GoalRowData; currency: string }) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const hasTarget = goal.targetCents > 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((goal.savedCents / goal.targetCents) * 100))
    : 0;
  const done = hasTarget && goal.savedCents >= goal.targetCents;

  function run(direction: "deposit" | "withdraw") {
    setErr(null);
    startTransition(async () => {
      const res = await adjustGoal(goal.id, amount, direction);
      if (res.ok) setAmount("");
      else setErr(res.error ?? "Erreur");
    });
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Supprimer « ${goal.name} »`,
      message: "Cet objectif d'épargne sera définitivement supprimé.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteGoal(goal.id);
    });
  }

  return (
    <Card className={cn(pending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ color: goal.color, backgroundColor: `${goal.color}1f` }}
        >
          <PiggyBank className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{goal.name}</p>
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">
              {formatMoney(goal.savedCents, currency)}
            </span>
            {hasTarget && <> / {formatMoney(goal.targetCents, currency)}</>}
            {goal.deadline && (
              <> · {new Date(goal.deadline).toLocaleDateString("fr-FR")}</>
            )}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={pending}
          title="Supprimer"
          className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {hasTarget && (
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: done ? "var(--success)" : goal.color,
              }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted">
            {done ? "Objectif atteint 🎉" : `${pct}%`}
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="Montant"
          className="h-10"
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => run("deposit")}
          disabled={pending || !amount}
          title="Ajouter"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => run("withdraw")}
          disabled={pending || !amount}
          title="Retirer"
          className="shrink-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </Card>
  );
}

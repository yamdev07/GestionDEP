"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createAccount, deleteAccount } from "@/lib/actions/accounts";
import type { ActionResult } from "@/lib/actions/transactions";
import { ACCOUNT_TYPES, accountTypeIcon, accountTypeLabel } from "@/lib/account-types";
import { Button, Card, Input } from "@/components/ui";
import { CategoryIcon } from "@/components/category-icon";
import { useConfirm } from "@/components/confirm-dialog";
import { cn, formatMoney, currencySymbol } from "@/lib/utils";

export type AccountRowData = {
  id: string;
  name: string;
  type: string;
  color: string;
  balanceCents: number;
  txCount: number;
};

const PRESET_COLORS = [
  "#6d28d9", "#22c55e", "#3b82f6", "#f59e0b",
  "#a855f7", "#ef4444", "#ec4899", "#06b6d4",
  "#14b8a6", "#f97316", "#8b5cf6", "#6b7280",
];

export function AccountManager({
  accounts,
  currency,
}: {
  accounts: AccountRowData[];
  currency: string;
}) {
  const [type, setType] = useState<string>("CASH");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | undefined,
    FormData
  >(createAccount, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setType("CASH");
      setColor(PRESET_COLORS[0]);
    }
  }, [state]);

  const symbol = currencySymbol(currency);

  return (
    <div className="space-y-5">
      {/* Ajout */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Nouveau compte
        </h2>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="color" value={color} />

          <Input name="name" placeholder="Nom (ex: Wave, Compte courant)" required maxLength={40} />

          {/* Type */}
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_TYPES.map((t) => {
              const active = t.value === type;
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Couleur */}
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

          {/* Solde de départ */}
          <div className="relative">
            <Input
              name="initialBalance"
              inputMode="decimal"
              placeholder="Solde de départ (optionnel)"
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
              {symbol}
            </span>
          </div>

          {state?.error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {pending ? "Ajout…" : "Ajouter le compte"}
          </Button>
        </form>
      </Card>

      {/* Liste */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Mes comptes ({accounts.length})
        </h2>
        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Aucun compte pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {accounts.map((a) => (
              <AccountItem key={a.id} account={a} currency={currency} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AccountItem({
  account,
  currency,
}: {
  account: AccountRowData;
  currency: string;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function onDelete() {
    const ok = await confirm({
      title: `Supprimer « ${account.name} »`,
      message:
        account.txCount > 0
          ? `Les ${account.txCount} opération${account.txCount > 1 ? "s" : ""} liée${account.txCount > 1 ? "s" : ""} seront conservées mais passeront en « sans compte ».`
          : "Ce compte sera définitivement supprimé.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteAccount(account.id);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-3", pending && "opacity-40")}>
      <CategoryIcon
        icon={accountTypeIcon(account.type)}
        color={account.color}
        className="h-10 w-10 shrink-0 rounded-xl"
        size={18}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{account.name}</p>
        <p className="text-xs text-muted">{accountTypeLabel(account.type)}</p>
      </div>
      <span className="shrink-0 font-bold tabular-nums">
        {formatMoney(account.balanceCents, currency)}
      </span>
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

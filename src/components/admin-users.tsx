"use client";

import { useState, useTransition } from "react";
import { Trash2, KeyRound, Check, ShieldCheck } from "lucide-react";
import { deleteUser, resetUserPassword } from "@/lib/actions/admin";
import { useConfirm } from "@/components/confirm-dialog";
import { Button, Card, Input } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  currency: string;
  createdAt: string; // ISO
  txCount: number;
  accountCount: number;
  incomeCents: number;
  expenseCents: number;
  isAdmin: boolean;
};

export function AdminUsers({ rows }: { rows: AdminUserRow[] }) {
  return (
    <Card className="p-0">
      <ul className="divide-y divide-border">
        {rows.map((u) => (
          <AdminUserItem key={u.id} user={u} />
        ))}
        {rows.length === 0 && (
          <li className="px-5 py-6 text-center text-sm text-muted">
            Aucun compte.
          </li>
        )}
      </ul>
    </Card>
  );
}

function AdminUserItem({ user }: { user: AdminUserRow }) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const balance = user.incomeCents - user.expenseCents;

  async function onDelete() {
    const ok = await confirm({
      title: "Supprimer ce compte",
      message: `« ${user.email} » et TOUTES ses données (opérations, catégories, comptes, budgets) seront définitivement supprimés.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (!res.ok) setMsg({ ok: false, text: res.error ?? "Erreur" });
    });
  }

  function onReset() {
    setMsg(null);
    startTransition(async () => {
      const res = await resetUserPassword(user.id, pwd);
      if (res.ok) {
        setMsg({ ok: true, text: "Mot de passe réinitialisé." });
        setPwd("");
        setResetOpen(false);
      } else {
        setMsg({ ok: false, text: res.error ?? "Erreur" });
      }
    });
  }

  return (
    <li className={cn("px-5 py-4", pending && "opacity-50")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{user.name || "Sans nom"}</span>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            {user.txCount} opé. · {user.accountCount} compte
            {user.accountCount > 1 ? "s" : ""} · inscrit le{" "}
            {new Date(user.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
            <span className="text-success">
              +{formatMoney(user.incomeCents, user.currency)}
            </span>
            <span className="text-danger">
              -{formatMoney(user.expenseCents, user.currency)}
            </span>
            <span className="font-semibold">
              = {formatMoney(balance, user.currency)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => {
              setResetOpen((v) => !v);
              setMsg(null);
            }}
            disabled={pending}
            title="Réinitialiser le mot de passe"
            className="rounded-lg p-2 text-muted transition hover:bg-primary/10 hover:text-primary"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          {!user.isAdmin && (
            <button
              onClick={onDelete}
              disabled={pending}
              title="Supprimer le compte"
              className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {resetOpen && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-muted p-3 sm:flex-row sm:items-center">
          <Input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe (6 car. min.)"
            autoComplete="new-password"
            className="bg-surface"
          />
          <Button
            type="button"
            onClick={onReset}
            disabled={pending || pwd.length < 6}
            className="shrink-0"
          >
            Appliquer
          </Button>
        </div>
      )}

      {msg && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 text-sm",
            msg.ok ? "text-success" : "text-danger",
          )}
        >
          {msg.ok && <Check className="h-4 w-4" />}
          {msg.text}
        </p>
      )}
    </li>
  );
}

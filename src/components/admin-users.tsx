"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Trash2,
  KeyRound,
  Check,
  ShieldCheck,
  Crown,
  Pencil,
  History,
  Search,
} from "lucide-react";
import { deleteUser, resetUserPassword, updateUserAdmin } from "@/lib/actions/admin";
import { grantPremium, cancelPremium } from "@/lib/actions/subscription";
import { useConfirm } from "@/components/confirm-dialog";
import { CURRENCIES } from "@/lib/currencies";
import { PLAN_LABELS } from "@/lib/plans";
import { Button, Card, Input } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

export type AdminSub = {
  id: string;
  cycle: string;
  priceCents: number;
  startedAt: string;
  endsAt: string;
  status: string;
  note: string;
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  currency: string;
  createdAt: string;
  txCount: number;
  accountCount: number;
  incomeCents: number;
  expenseCents: number;
  isAdmin: boolean;
  premium: boolean;
  grandfathered: boolean;
  premiumUntil: string | null;
  subscriptions: AdminSub[];
};

type SortKey = "recent" | "name" | "balance" | "premium";

export function AdminUsers({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows.filter(
      (u) =>
        !needle ||
        u.email.toLowerCase().includes(needle) ||
        (u.name ?? "").toLowerCase().includes(needle),
    );
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "name":
          return (a.name ?? a.email).localeCompare(b.name ?? b.email);
        case "balance":
          return b.incomeCents - b.expenseCents - (a.incomeCents - a.expenseCents);
        case "premium":
          return Number(b.premium) - Number(a.premium);
        default:
          return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
    return r;
  }, [rows, q, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par email ou nom…"
            className="pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="recent">Plus récents</option>
          <option value="name">Nom (A→Z)</option>
          <option value="balance">Solde (élevé→bas)</option>
          <option value="premium">Premium d&apos;abord</option>
        </select>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {list.map((u) => (
            <AdminUserItem key={u.id} user={u} />
          ))}
          {list.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-muted">
              Aucun compte trouvé.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function AdminUserItem({ user }: { user: AdminUserRow }) {
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<null | "reset" | "edit" | "history">(null);
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState(user.name ?? "");
  const [currency, setCurrency] = useState(user.currency);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const balance = user.incomeCents - user.expenseCents;

  function toggle(p: "reset" | "edit" | "history") {
    setMsg(null);
    setPanel((cur) => (cur === p ? null : p));
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (okMsg) setMsg({ ok: true, text: okMsg });
      } else setMsg({ ok: false, text: res.error ?? "Erreur" });
    });
  }

  async function onDelete() {
    const ok = await confirm({
      title: "Supprimer ce compte",
      message: `« ${user.email} » et TOUTES ses données seront définitivement supprimés.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    act(() => deleteUser(user.id));
  }

  const planBadge = user.premium
    ? user.grandfathered
      ? "Premium (offert)"
      : user.premiumUntil
        ? `Premium · ${new Date(user.premiumUntil).toLocaleDateString("fr-FR")}`
        : "Premium"
    : "Gratuit";

  return (
    <li className={cn("px-5 py-4", pending && "opacity-50")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="truncate">{user.name || "Sans nom"}</span>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                user.premium
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-muted text-muted",
              )}
            >
              <Crown className="h-3 w-3" /> {planBadge}
            </span>
          </p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            {user.txCount} opé. · {user.accountCount} compte
            {user.accountCount > 1 ? "s" : ""} · inscrit le{" "}
            {new Date(user.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
            <span className="text-success">+{formatMoney(user.incomeCents, user.currency)}</span>
            <span className="text-danger">-{formatMoney(user.expenseCents, user.currency)}</span>
            <span className="font-semibold">= {formatMoney(balance, user.currency)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <IconBtn title="Historique abonnements" onClick={() => toggle("history")} active={panel === "history"}>
            <History className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Modifier" onClick={() => toggle("edit")} active={panel === "edit"}>
            <Pencil className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Mot de passe" onClick={() => toggle("reset")} active={panel === "reset"}>
            <KeyRound className="h-4 w-4" />
          </IconBtn>
          {!user.isAdmin && (
            <IconBtn title="Supprimer" danger onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      </div>

      {/* Abonnement : boutons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="md" className="h-9" disabled={pending}
          onClick={() => act(() => grantPremium(user.id, "MENSUEL"), "Premium +1 mois activé.")}>
          <Crown className="h-4 w-4" /> +1 mois
        </Button>
        <Button type="button" size="md" variant="outline" className="h-9" disabled={pending}
          onClick={() => act(() => grantPremium(user.id, "ANNUEL"), "Premium +1 an activé.")}>
          +1 an
        </Button>
        {user.premium && !user.grandfathered && (
          <Button type="button" size="md" variant="danger" className="h-9" disabled={pending}
            onClick={() => act(() => cancelPremium(user.id), "Premium annulé.")}>
            Annuler
          </Button>
        )}
      </div>

      {/* Panneau : réinitialiser mot de passe */}
      {panel === "reset" && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-muted p-3 sm:flex-row">
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe (6 car. min.)" autoComplete="new-password" className="bg-surface" />
          <Button type="button" className="shrink-0" disabled={pending || pwd.length < 6}
            onClick={() => act(async () => {
              const r = await resetUserPassword(user.id, pwd);
              if (r.ok) { setPwd(""); setPanel(null); }
              return r;
            }, "Mot de passe réinitialisé.")}>
            Appliquer
          </Button>
        </div>
      )}

      {/* Panneau : édition nom/devise */}
      {panel === "edit" && (
        <div className="mt-3 space-y-2 rounded-xl bg-surface-muted p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" maxLength={80} className="bg-surface" />
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-foreground outline-none focus:border-primary">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <Button type="button" disabled={pending}
            onClick={() => act(async () => {
              const r = await updateUserAdmin(user.id, name, currency);
              if (r.ok) setPanel(null);
              return r;
            }, "Compte mis à jour.")}>
            Enregistrer
          </Button>
        </div>
      )}

      {/* Panneau : historique d'abonnements */}
      {panel === "history" && (
        <div className="mt-3 rounded-xl bg-surface-muted p-3">
          {user.subscriptions.length === 0 ? (
            <p className="text-sm text-muted">Aucun abonnement enregistré.</p>
          ) : (
            <ul className="divide-y divide-border">
              {user.subscriptions.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {PLAN_LABELS[s.cycle] ?? s.cycle}{" "}
                      <span className="text-xs font-normal text-muted">({s.status})</span>
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(s.startedAt).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(s.endsAt).toLocaleDateString("fr-FR")} · {s.note}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(s.priceCents, user.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {msg && (
        <p className={cn("mt-2 flex items-center gap-1.5 text-sm", msg.ok ? "text-success" : "text-danger")}>
          {msg.ok && <Check className="h-4 w-4" />}
          {msg.text}
        </p>
      )}
    </li>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  active,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-2 text-muted transition",
        danger ? "hover:bg-danger/10 hover:text-danger" : "hover:bg-primary/10 hover:text-primary",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

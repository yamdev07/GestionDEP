import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Lock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { canExport } from "@/lib/plans";
import { resolvePeriod, periodDays, type PeriodKey } from "@/lib/period";
import { AppShell } from "@/components/app-shell";
import { TransactionRow, type TransactionView } from "@/components/transaction-row";
import { PrintButton } from "@/components/print-button";
import { Button, Card, Input, Label } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";
import { toTransactionView } from "@/lib/views";

const CHIPS: { key: PeriodKey; label: string }[] = [
  { key: "mois", label: "Ce mois" },
  { key: "mois-dernier", label: "Mois dernier" },
  { key: "30j", label: "30 jours" },
  { key: "annee", label: "Cette année" },
  { key: "perso", label: "Personnalisée" },
];

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const sp = await searchParams;
  const period = resolvePeriod(sp);

  const [user, status, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    getPlanStatus(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: period.start, lt: period.end },
      },
      orderBy: { date: "desc" },
      include: { category: { select: { name: true, color: true, icon: true } } },
    }),
  ]);
  if (!user) redirect("/login");
  const currency = user.currency;
  const exportAllowed = canExport(status.plan);

  const total = transactions.reduce((s, t) => s + t.amountCents, 0);
  const count = transactions.length;
  const days = periodDays(period);
  const avgPerDay = Math.round(total / days);

  // Répartition par catégorie (triée par montant décroissant).
  const catMap = new Map<string, { name: string; value: number; color: string }>();
  for (const t of transactions) {
    const name = t.category?.name ?? "Sans catégorie";
    const color = t.category?.color ?? "#9ca3af";
    const entry = catMap.get(name) ?? { name, value: 0, color };
    entry.value += t.amountCents;
    catMap.set(name, entry);
  }
  const byCategory = [...catMap.values()].sort((a, b) => b.value - a.value);

  // Regroupement par jour.
  type DayGroup = { label: string; total: number; items: TransactionView[] };
  const dayMap = new Map<string, DayGroup>();
  for (const t of transactions) {
    const key = t.date.toISOString().slice(0, 10);
    const label = t.date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const g: DayGroup = dayMap.get(key) ?? { label, total: 0, items: [] };
    g.total += t.amountCents;
    g.items.push(toTransactionView(t));
    dayMap.set(key, g);
  }
  const days0 = [...dayMap.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const exportHref = `/journal/export?p=${period.key}&from=${period.from}&to=${period.to}`;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Journal des dépenses</h1>
            <p className="text-sm text-muted">
              {period.label} · du {new Date(period.from).toLocaleDateString("fr-FR")} au{" "}
              {new Date(period.to).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            {exportAllowed ? (
              <a
                href={exportHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                <Download className="h-4 w-4" /> CSV
              </a>
            ) : (
              <Link
                href="/abonnement"
                title="Export réservé au plan Premium"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:bg-surface-muted"
              >
                <Lock className="h-4 w-4" /> CSV (Premium)
              </Link>
            )}
            <PrintButton />
          </div>
        </div>

        {/* Raccourcis de période */}
        <div className="flex flex-wrap gap-2 print:hidden">
          {CHIPS.map((c) => {
            const active = c.key === period.key;
            const href =
              c.key === "perso"
                ? `/journal?p=perso&from=${period.from}&to=${period.to}`
                : `/journal?p=${c.key}`;
            return (
              <Link
                key={c.key}
                href={href}
                className={cn(
                  "flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* Dates personnalisées */}
        <form
          action="/journal"
          method="get"
          className="flex flex-wrap items-end gap-3 print:hidden"
        >
          <input type="hidden" name="p" value="perso" />
          <div>
            <Label htmlFor="from">Du</Label>
            <Input id="from" name="from" type="date" defaultValue={period.from} className="w-auto" />
          </div>
          <div>
            <Label htmlFor="to">Au</Label>
            <Input id="to" name="to" type="date" defaultValue={period.to} className="w-auto" />
          </div>
          <Button type="submit" variant="outline">
            Appliquer
          </Button>
        </form>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total dépensé" value={formatMoney(total, currency)} tone="danger" />
          <Stat label="Opérations" value={String(count)} tone="primary" />
          <Stat label="Moyenne / jour" value={formatMoney(avgPerDay, currency)} tone="primary" />
        </div>

        {/* Répartition par catégorie */}
        {byCategory.length > 0 && (
          <Card>
            <h2 className="mb-4 text-base font-bold">Où est parti l&apos;argent</h2>
            <ul className="space-y-3">
              {byCategory.map((c) => {
                const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-muted">
                        {formatMoney(c.value, currency)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Journal chronologique groupé par jour */}
        {count === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-muted">
              Aucune dépense sur cette période.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {days0.map(([key, g]) => (
              <Card key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize text-muted">{g.label}</h3>
                  <span className="text-sm font-bold tabular-nums text-danger">
                    {formatMoney(g.total, currency)}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {g.items.map((t) => (
                    <TransactionRow key={t.id} tx={t} currency={currency} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "primary";
}) {
  const color = tone === "danger" ? "var(--danger)" : "var(--primary)";
  return (
    <Card className="p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </Card>
  );
}

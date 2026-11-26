import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { canBudgetAlerts } from "@/lib/plans";
import { notifyBudgetAlerts } from "@/lib/budget-alerts";
import { processMonthRollover } from "@/lib/budget-periods";
import { isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Évalue les budgets de tous les utilisateurs abonnés aux notifications et
 * envoie les push d'alerte dus. À appeler périodiquement (cron) :
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domaine>/api/cron/budget-alerts
 * Protégé par la variable d'environnement CRON_SECRET.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron non configuré" }, { status: 500 });
  }

  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("secret") ||
    "";
  if (provided !== secret) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ ok: true, users: 0, sent: 0, note: "push non configuré" });
  }

  // Limité aux utilisateurs ayant au moins un abonnement push.
  const subs = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let users = 0;
  let sent = 0;
  for (const { userId } of subs) {
    const status = await getPlanStatus(userId);
    if (!canBudgetAlerts(status.plan)) continue; // Premium uniquement
    users += 1;
    // Bascule de mois (clôture + report + push de rappel) puis alertes.
    await processMonthRollover(userId).catch(() => {});
    sent += await notifyBudgetAlerts(userId);
  }

  return NextResponse.json({ ok: true, users, sent });
}

export const GET = handle;
export const POST = handle;

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlanStatus } from "@/lib/subscription";
import { canExport } from "@/lib/plans";
import { resolvePeriod } from "@/lib/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Échappe un champ CSV (guillemets, point-virgule, retours à la ligne) et
 * neutralise l'injection de formules (un champ commençant par = + - @ pourrait
 * être exécuté par Excel/Sheets) en le préfixant d'une apostrophe.
 */
function csv(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = session.user.id;

  const status = await getPlanStatus(userId);
  if (!canExport(status.plan)) {
    return NextResponse.json(
      { error: "Export réservé au plan Premium." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const period = resolvePeriod({
    p: url.searchParams.get("p") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { currency: true } }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: period.start, lt: period.end },
      },
      orderBy: { date: "asc" },
      include: { category: { select: { name: true } } },
    }),
  ]);
  const currency = user?.currency ?? "XOF";

  // BOM pour qu'Excel affiche correctement les accents ; séparateur « ; » (Excel FR).
  const lines: string[] = ["﻿Date;Catégorie;Note;Montant;Devise"];
  for (const t of transactions) {
    const date = t.date.toISOString().slice(0, 10);
    const cat = t.category?.name ?? "Sans catégorie";
    const amount = (t.amountCents / 100).toFixed(2).replace(".", ",");
    lines.push([csv(date), csv(cat), csv(t.note), csv(amount), csv(currency)].join(";"));
  }
  const total = transactions.reduce((s, t) => s + t.amountCents, 0);
  lines.push(
    [csv(""), csv(""), csv("TOTAL"), csv((total / 100).toFixed(2).replace(".", ",")), csv(currency)].join(";"),
  );

  const body = lines.join("\r\n");
  const filename = `journal-depenses_${period.from}_${period.to}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

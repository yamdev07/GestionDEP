import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { auth } from "@/auth";
import { activatePaymentById } from "@/lib/actions/subscription";
import { AppShell } from "@/components/app-shell";
import { Card, Button } from "@/components/ui";
import { PendingPoller } from "./pending-poller";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { pid } = await searchParams;
  let state: "ok" | "pending" | "fail" = "pending";
  if (pid) {
    const r = await activatePaymentById(pid);
    state = r.ok
      ? "ok"
      : ["canceled", "declined", "expired"].includes(r.status)
        ? "fail"
        : "pending";
  }

  const view = {
    ok: {
      icon: <CheckCircle2 className="h-10 w-10 text-success" />,
      title: "Paiement confirmé 🎉",
      text: "Ton abonnement est actif. Merci !",
    },
    pending: {
      icon: <Clock className="h-10 w-10 text-amber-500" />,
      title: "Paiement en cours de confirmation",
      text: "On attend la validation du paiement. Reviens sur la page Abonnement dans un instant — ça s'activera automatiquement.",
    },
    fail: {
      icon: <XCircle className="h-10 w-10 text-danger" />,
      title: "Paiement non abouti",
      text: "Le paiement n'a pas été finalisé. Tu peux réessayer depuis la page Abonnement.",
    },
  }[state];

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-5 pt-6">
        <Card className="flex flex-col items-center gap-3 text-center">
          {view.icon}
          <h1 className="text-xl font-bold">{view.title}</h1>
          <p className="text-sm text-muted">{view.text}</p>
          {state === "pending" && pid && <PendingPoller pid={pid} />}
          <Link href="/abonnement" className="w-full">
            <Button className="w-full">Voir mon abonnement</Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}

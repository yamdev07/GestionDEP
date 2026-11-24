import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { PLANS, PLAN_LABELS, type PlanKey } from "@/lib/plans";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { plan } = await searchParams;
  const paidPlan: PlanKey | null =
    plan === "ESSENTIEL" || plan === "PREMIUM" ? plan : null;
  // Après inscription → connexion → page d'abonnement avec le plan pré-sélectionné.
  const next = paidPlan ? `/abonnement?pay=${paidPlan}` : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4">
      <Link
        href="/"
        aria-label="Retour à l'accueil"
        className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Link
            href="/"
            aria-label="Accueil"
            className="gradient-primary flex h-12 w-12 items-center justify-center rounded-2xl text-white transition hover:opacity-90"
          >
            <Wallet className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Créer un compte</h1>
            <p className="text-sm text-muted">
              {paidPlan
                ? `Offre ${PLANS[paidPlan].label} — crée ton compte puis finalise le paiement`
                : "Commence à suivre tes finances"}
            </p>
          </div>
        </div>
        <Card>
          {paidPlan && (
            <p className="mb-4 rounded-xl bg-primary/10 px-3 py-2 text-center text-sm font-medium text-primary">
              Plan choisi : {PLAN_LABELS[paidPlan]}
            </p>
          )}
          <RegisterForm next={next} />
        </Card>
      </div>
    </main>
  );
}

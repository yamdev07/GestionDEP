import Link from "next/link";
import { Crown } from "lucide-react";
import { Card } from "@/components/ui";

/** Écran plein affiché à la place d'une fonctionnalité réservée à Premium. */
export function PremiumGate({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Crown className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      <Link
        href="/abonnement?pay=PREMIUM"
        className="gradient-primary mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition active:scale-[0.99]"
      >
        <Crown className="h-5 w-5" /> Passer à Premium
      </Link>
    </Card>
  );
}

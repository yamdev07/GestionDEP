import Link from "next/link";
import { Crown } from "lucide-react";

/**
 * Encart affiché quand un utilisateur Gratuit atteint une limite : il explique
 * la limite et propose de passer à Premium (→ paiement FedaPay direct).
 */
export function UpgradeNotice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-primary bg-primary/10 px-4 py-3">
      <p className="text-sm font-medium text-primary">{message}</p>
      <p className="mt-0.5 text-xs text-muted">
        Passe à Premium pour en profiter sans limite.
      </p>
      <Link
        href="/abonnement?pay=PREMIUM"
        className="gradient-primary mt-2.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition active:scale-[0.99]"
      >
        <Crown className="h-4 w-4" /> Passer à Premium
      </Link>
    </div>
  );
}

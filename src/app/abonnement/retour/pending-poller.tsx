"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { activatePaymentById } from "@/lib/actions/subscription";

const INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20; // ~1 min de vérification automatique

/**
 * Tant que le paiement est « en attente », revérifie périodiquement son statut
 * auprès de FedaPay (via l'action serveur) et rafraîchit la page dès qu'il est
 * approuvé ou définitivement échoué — l'abonnement s'active alors tout seul.
 */
export function PendingPoller({ pid }: { pid: string }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;

    async function check(n: number) {
      if (stopped.current) return;
      try {
        const r = await activatePaymentById(pid);
        if (stopped.current) return;
        const done =
          r.ok || ["canceled", "declined", "expired"].includes(r.status);
        if (done) {
          router.refresh(); // réaffiche la page avec l'état final (ok / échec)
          return;
        }
      } catch {
        // Erreur réseau ponctuelle : on réessaie au prochain tick.
      }
      setAttempts(n + 1);
      if (n + 1 < MAX_ATTEMPTS) {
        timer = setTimeout(() => check(n + 1), INTERVAL_MS);
      }
    }

    timer = setTimeout(() => check(0), INTERVAL_MS);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [pid, router]);

  return (
    <p className="text-xs text-muted">
      {attempts >= MAX_ATTEMPTS
        ? "La confirmation prend plus de temps que prévu. Actualise la page ou reviens dans quelques minutes."
        : "Vérification automatique en cours…"}
    </p>
  );
}

"use client";

import { useEffect } from "react";
import { formatMoney } from "@/lib/utils";

type AlertLite = {
  categoryId: string;
  name: string;
  pct: number;
  over: boolean;
  spentCents: number;
  budgetCents: number;
};

const STORE_KEY = "mb_local_alerts_shown";

function readShown(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Affiche une notification système locale pour chaque alerte de budget active
 * non encore montrée sur cet appareil (dédup par mois + niveau, en localStorage).
 * Agit seulement si l'utilisateur a déjà autorisé les notifications ; sinon,
 * c'est le composant PushManager (réglages) qui demande la permission.
 */
export function AlertNotifier({
  alerts,
  currency,
}: {
  alerts: AlertLite[];
  currency: string;
}) {
  useEffect(() => {
    if (
      alerts.length === 0 ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const shown = readShown();
    const toShow = alerts.filter(
      (a) => !shown[`${a.categoryId}-${period}-${a.over ? "OVER" : "NEAR"}`],
    );
    if (toShow.length === 0) return;

    async function show() {
      const reg =
        "serviceWorker" in navigator
          ? await navigator.serviceWorker.ready.catch(() => null)
          : null;

      for (const a of toShow) {
        const sig = `${a.categoryId}-${period}-${a.over ? "OVER" : "NEAR"}`;
        const title = a.over
          ? `Budget dépassé : ${a.name}`
          : `Budget bientôt atteint : ${a.name}`;
        const options: NotificationOptions = {
          body: `${formatMoney(a.spentCents, currency)} / ${formatMoney(a.budgetCents, currency)} (${a.pct} %)`,
          icon: "/icon.svg",
          tag: `budget-${a.categoryId}-${period}`,
        };
        try {
          if (reg) reg.showNotification(title, options);
          else new Notification(title, options);
          shown[sig] = true;
        } catch {
          // ignore (ex: Safari sans SW)
        }
      }
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(shown));
      } catch {
        // ignore
      }
    }
    show();
  }, [alerts, currency]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/actions/push";
import { Button } from "@/components/ui";

/** Convertit une clé VAPID base64url en Uint8Array (format attendu par PushManager). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

type Status =
  | "loading"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "off"
  | "on";

export function PushManager({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!vapidPublicKey) {
        setStatus("unconfigured");
        return;
      }
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus(existing ? "on" : "off");
        }
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (res.ok) {
        setStatus("on");
        // Notification de confirmation locale, immédiate.
        reg.showNotification("Notifications activées", {
          body: "Tu seras prévenu quand un budget approche de sa limite.",
          icon: "/icon.svg",
          tag: "push-welcome",
        });
      } else {
        setError(res.error ?? "Échec de l'activation");
      }
    } catch {
      setError("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Impossible de désactiver les notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {status === "on" ? (
            <BellRing className="h-5 w-5" />
          ) : status === "denied" ? (
            <BellOff className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Notifications d&apos;alerte</p>
          <p className="text-sm text-muted">
            {status === "loading" && "Vérification…"}
            {status === "on" &&
              "Activées sur cet appareil. Tu reçois une notification quand un budget atteint 80 % puis 100 %."}
            {status === "off" &&
              "Reçois une notification (même app fermée) quand un budget approche de sa limite."}
            {status === "denied" &&
              "Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur, puis réessaie."}
            {status === "unsupported" &&
              "Cet appareil ou navigateur ne gère pas les notifications push."}
            {status === "unconfigured" &&
              "Non configuré côté serveur (clés VAPID manquantes). Vois les variables d'environnement VAPID_*."}
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {status === "off" && (
        <Button onClick={enable} disabled={busy} className="w-full sm:w-auto">
          <Bell className="h-4 w-4" />
          {busy ? "Activation…" : "Activer les notifications"}
        </Button>
      )}
      {status === "on" && (
        <Button
          onClick={disable}
          disabled={busy}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <BellOff className="h-4 w-4" />
          {busy ? "…" : "Désactiver"}
        </Button>
      )}
    </div>
  );
}

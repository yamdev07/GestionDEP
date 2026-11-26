import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Configuration Web Push (VAPID). Les clés viennent de l'environnement :
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  (générées avec `web-push generate-vapid-keys`)
 *   VAPID_SUBJECT                         (mailto:... ou URL du site)
 * Sans ces variables, le push est simplement désactivé (pas d'erreur).
 */
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
}

export function isPushConfigured(): boolean {
  return configured;
}

/** Clé publique VAPID à transmettre au client pour s'abonner. */
export function getVapidPublicKey(): string {
  return PUBLIC_KEY;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // ouverte au clic (défaut: "/")
  tag?: string; // regroupe/remplace les notifications identiques
};

/**
 * Envoie une notification à tous les appareils abonnés d'un utilisateur.
 * Supprime automatiquement les abonnements expirés (404/410).
 * Renvoie le nombre d'envois réussis.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!configured) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body,
        );
        sent += 1;
      } catch (err: unknown) {
        const code =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        // Abonnement périmé ou invalide → on le retire.
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .deleteMany({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        }
      }
    }),
  );

  return sent;
}

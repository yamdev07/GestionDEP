/**
 * Limiteur de débit en mémoire (fenêtre fixe), par clé.
 *
 * Suffisant pour une instance auto-hébergée mono-conteneur. Pour un
 * déploiement multi-instances, remplacer par un store partagé (Redis).
 */

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  /** Secondes avant de pouvoir réessayer (si bloqué). */
  retryAfter: number;
};

/**
 * Enregistre une tentative pour `key` et indique si elle est autorisée.
 * @param limit    Nombre de tentatives autorisées par fenêtre.
 * @param windowMs Durée de la fenêtre en millisecondes.
 */
export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 5 * 60_000,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Purge opportuniste des entrées expirées (évite une fuite mémoire). */
export function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

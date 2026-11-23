#!/bin/sh
set -e

echo "➡️  Synchronisation du schéma avec la base de données…"
# Crée/maj les tables à partir de prisma/schema.prisma (idempotent).
# --skip-generate : le client est déjà généré pendant le build.
npx prisma db push --skip-generate --accept-data-loss

echo "🚀  Démarrage de l'application sur le port 3000…"
exec npm run start -- -p 3000 -H 0.0.0.0

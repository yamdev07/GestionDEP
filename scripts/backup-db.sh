#!/bin/sh
# Sauvegarde de la base PostgreSQL (dump compressé) + purge par rétention.
#
# Usage :
#   ./scripts/backup-db.sh [fichier-compose]
# Par défaut : docker-compose.prod.yml
#
# Exemple de cron (tous les jours à 3h), à adapter au chemin du projet :
#   0 3 * * * cd /opt/gestiondep && ./scripts/backup-db.sh >> backups/backup.log 2>&1
#
# Variables :
#   RETENTION_DAYS  Nombre de jours de conservation (défaut : 14)
set -e

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/gestion_depenses-$STAMP.sql.gz"

echo "➡️  Sauvegarde vers $OUT"
docker compose -f "$COMPOSE_FILE" exec -T db \
	pg_dump -U gestion gestion_depenses | gzip > "$OUT"

echo "🧹  Purge des sauvegardes de plus de $RETENTION_DAYS jours"
find "$BACKUP_DIR" -name 'gestion_depenses-*.sql.gz' -type f \
	-mtime +"$RETENTION_DAYS" -delete

echo "✅  Terminé : $OUT"

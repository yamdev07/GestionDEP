# Déploiement en production (auto-hébergé)

Ce guide met l'app **MonBudget** en ligne sur ton propre serveur, avec HTTPS
automatique. Compte ~20 minutes.

## 1. Ce qu'il te faut

- Un **serveur** (VPS) avec Docker + Docker Compose installés, et les ports
  **80** et **443** ouverts. Exemples économiques : Hetzner, OVH, DigitalOcean
  (~5 €/mois suffisent).
- Un **nom de domaine** (ou sous-domaine, ex. `depenses.mondomaine.com`) dont
  l'enregistrement **A** (et **AAAA** en IPv6) pointe vers l'IP du serveur.

## 2. Récupérer le projet sur le serveur

```sh
git clone <url-du-depot> gestiondep
cd gestiondep
```

## 3. Configurer les secrets

Copie l'exemple puis édite `.env` :

```sh
cp .env.example .env
```

Renseigne **trois** valeurs :

| Variable      | Valeur                                                             |
| ------------- | ------------------------------------------------------------------ |
| `DOMAIN`      | ton domaine, ex. `depenses.mondomaine.com`                         |
| `DB_PASSWORD` | un mot de passe fort (ex. `openssl rand -base64 24`)               |
| `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

> `.env` contient des secrets : il n'est **jamais** versionné (déjà dans `.gitignore`).

## 4. Lancer

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy obtient automatiquement le certificat HTTPS via Let's Encrypt (quelques
secondes). Ouvre ensuite `https://ton-domaine` → crée ton compte.

Seul Caddy est exposé à Internet (80/443) ; l'app et la base restent internes.

## 5. Sauvegardes automatiques

Script fourni : `scripts/backup-db.sh` (dump compressé + rétention 14 jours).

Test manuel :

```sh
./scripts/backup-db.sh
```

Automatiser avec cron (sauvegarde quotidienne à 3h) :

```sh
crontab -e
# puis ajoute :
0 3 * * * cd /chemin/vers/gestiondep && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

Restaurer une sauvegarde :

```sh
gunzip -c backups/gestion_depenses-AAAAMMJJ-HHMMSS.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db psql -U gestion -d gestion_depenses
```

## 6. Mettre à jour l'app

```sh
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Le schéma de base est synchronisé automatiquement au démarrage.

## Développement local

En local, rien ne change : on continue avec le fichier standard.

```sh
docker compose up -d --build   # http://localhost:3000
```

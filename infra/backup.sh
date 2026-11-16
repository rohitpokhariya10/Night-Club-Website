#!/usr/bin/env bash
set -euo pipefail
# Run from repository root. Configure an encrypted off-server SSH destination.
: "${BACKUP_DEST:?Set user@backup-host:/encrypted/backups}"
mkdir -p backups
umask 077
file="backups/jimmy-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$file"
scp "$file" "$BACKUP_DEST/"
find backups -name 'jimmy-*.sql.gz' -mtime +7 -delete

#!/usr/bin/env bash
# BetV — pull-deploy safety net (VPS cron).
# Every run: if the local checkout is behind origin/main, fast-forward to it and
# redeploy. Idempotent (no-op when already up to date), flock-guarded against
# overlap, and logged. Coexists with the GitHub Actions deploy — whichever lands the
# new commit first deploys; the other becomes a no-op. This guarantees a push reaches
# the VPS even when the Actions runner can't reach it (transient dial timeout).
#
# Install (see BetV-Sportmonks-Virada.md):
#   cp /opt/betv/scripts/betv-pull-deploy.sh /usr/local/bin/ && chmod +x /usr/local/bin/betv-pull-deploy.sh
#   ( crontab -l 2>/dev/null | grep -v betv-pull-deploy; \
#     echo '*/2 * * * * /usr/local/bin/betv-pull-deploy.sh >> /var/log/betv-pull-deploy.log 2>&1' ) | crontab -
# Disable:  crontab -l | grep -v betv-pull-deploy | crontab -
set -euo pipefail

APP_DIR=/opt/betv
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

# Single instance: if a previous run (e.g. a slow build) still holds the lock, skip.
exec 9>/var/lock/betv-pull-deploy.lock
flock -n 9 || { echo "[$(date -Is)] another run in progress — skip"; exit 0; }

cd "$APP_DIR"
git fetch --quiet origin main
local_rev=$(git rev-parse @)
remote_rev=$(git rev-parse origin/main)

if [ "$local_rev" = "$remote_rev" ]; then
  exit 0   # up to date — silent no-op
fi

echo "[$(date -Is)] behind origin/main (${local_rev:0:7} -> ${remote_rev:0:7}); deploying"
git reset --hard origin/main
# --build so code changes take effect; BuildKit cache makes unchanged layers fast.
# Runs only because there IS a new commit, so the build is "only when necessary".
"${COMPOSE[@]}" up --build -d --remove-orphans
docker image prune -f >/dev/null 2>&1 || true
echo "[$(date -Is)] deploy done: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

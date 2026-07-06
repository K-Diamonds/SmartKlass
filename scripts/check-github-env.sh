#!/usr/bin/env bash
# Validate required GitHub secrets/variables are present in the job environment.
# Usage: ./scripts/check-github-env.sh
set -euo pipefail

if [ "${CI_LITE:-}" = "true" ]; then
  echo "CI lite mode — skipping private secret validation"
  exit 0
fi

missing=0

check_secret() {
  if [ -z "${!1:-}" ]; then
    echo "Missing GitHub secret: $2" >&2
    missing=1
  fi
}

check_var() {
  if [ -z "${!1:-}" ]; then
    echo "Missing GitHub variable: $2" >&2
    missing=1
  fi
}

check_secret DATABASE_URL DATABASE_URL
check_secret JWT_SECRET JWT_SECRET
check_var NODE_ENV NODE_ENV
check_var API_URL API_URL
check_var NEXT_PUBLIC_API_URL NEXT_PUBLIC_API_URL
check_var WORKER_ENABLED WORKER_ENABLED

for optional in STRIPE_SECRET_KEY REDIS_URL STAFF_EMAILS; do
  if [ -z "${!optional:-}" ]; then
    echo "Optional not set: $optional" >&2
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "Run: ./scripts/sync-github-env.sh --repo K-Diamonds/SmartKlass" >&2
  exit 1
fi

echo "GitHub env OK"

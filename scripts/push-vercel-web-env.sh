#!/usr/bin/env bash
# Push web frontend env vars to the smart-klass Vercel project.
# Usage: ./scripts/push-vercel-web-env.sh [production|preview]
set -euo pipefail

TARGET="${1:-production}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/apps/web/.env.vercel"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy from apps/web/.env.vercel.example"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

for key in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  if [ -z "${!key:-}" ]; then
    echo "Missing $key in $ENV_FILE"
    exit 1
  fi
done

export ROOT TARGET VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID
python3 <<'PY'
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

root = Path(os.environ["ROOT"])
target = os.environ["TARGET"]
token = os.environ["VERCEL_TOKEN"]
team_id = os.environ["VERCEL_ORG_ID"]
project_id = os.environ["VERCEL_PROJECT_ID"]
manifest = json.loads((root / ".github/env.manifest.json").read_text())


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        if value:
            values[key] = value
    return values


env: dict[str, str] = {}
for rel in manifest["sources"]:
    env.update(parse_env_file(root / rel))

override = root / manifest.get("overrideFile", ".github/env.production.local")
if override.exists():
    env.update(parse_env_file(override))

for key, value in manifest.get("productionDefaults", {}).items():
    env.setdefault(key, value)

web_keys = manifest.get("vercelWeb", {}).get("deployVariables", [])
api = "https://api.vercel.com"
query = f"?teamId={team_id}" if team_id else ""


def request(method: str, path: str, payload=None):
    url = f"{api}{path}{query}"
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise RuntimeError(f"Vercel API {method} {path} failed: {detail}") from exc


synced = 0
for key in web_keys:
    value = env.get(key, "")
    if not value:
        continue
    payload = {
        "key": key,
        "value": value,
        "type": "plain",
        "target": [target],
    }
    request("POST", f"/v10/projects/{project_id}/env", payload)
    print(f"  vercel env {key}")
    synced += 1

print(f"Done. Synced {synced} env vars to Vercel web project ({target}).")
PY

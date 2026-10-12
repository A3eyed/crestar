#!/usr/bin/env bash
# Decode brand assets after clone / before EAS & Cloudflare builds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/scripts/decode-brand-assets.mjs"

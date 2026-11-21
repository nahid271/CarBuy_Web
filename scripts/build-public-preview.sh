#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root/preview-app"
npm ci
npm run build
rm -rf "$repo_root/preview"
mkdir -p "$repo_root/preview"
cp -R out/. "$repo_root/preview/"
touch "$repo_root/.nojekyll"

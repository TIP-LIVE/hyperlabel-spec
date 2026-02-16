#!/usr/bin/env bash
# Copy app and workflows from hyperlabel-spec into the tip repo (Option A: one repo, one set of keys).
# Usage: ./scripts/migrate-code-to-tip.sh /path/to/tip
# Example: ./scripts/migrate-code-to-tip.sh ../tip

set -e

TIP_DIR="${1:-}"
if [[ -z "$TIP_DIR" || ! -d "$TIP_DIR" ]]; then
  echo "Usage: $0 /path/to/tip"
  echo "Example: $0 ../tip"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TIP_DIR="$(cd "$TIP_DIR" && pwd)"

echo "Source (hyperlabel-spec): $REPO_ROOT"
echo "Target (tip):             $TIP_DIR"
echo ""

# 1. Copy app/ (exclude build artifacts and secrets)
echo "Copying app/ (excluding .next, node_modules, .env)..."
rsync -a --delete \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  "$REPO_ROOT/app/" "$TIP_DIR/app/"
echo "  done."
echo ""

# 2. Copy root .github/workflows (deploy, run-migration, ci)
echo "Copying .github/workflows..."
mkdir -p "$TIP_DIR/.github/workflows"
for f in deploy.yml run-migration.yml ci.yml; do
  if [[ -f "$REPO_ROOT/.github/workflows/$f" ]]; then
    cp "$REPO_ROOT/.github/workflows/$f" "$TIP_DIR/.github/workflows/$f"
    echo "  $f"
  fi
done
echo "  done."
echo ""

echo "Migration copy complete. Next steps:"
echo "  1. cd $TIP_DIR"
echo "  2. cd app && npm install && npm run build  # sanity check"
echo "  3. git add app .github && git status"
echo "  4. git commit -m 'chore: move app and workflows from hyperlabel-spec'"
echo "  5. git push origin main"
echo ""
echo "Deploy will run from tip using the secrets already in that repo."

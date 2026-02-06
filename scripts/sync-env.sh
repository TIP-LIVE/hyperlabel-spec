#!/bin/bash
# TIP — Sync GitHub Secrets to local .env file
#
# This pulls secrets from GitHub Secrets and writes them to app/.env
# for local development. Never commit the .env file!
#
# Usage: ./scripts/sync-env.sh
#
# Note: GitHub Secrets are write-only via API, so this script uses
# gh secret list to verify which secrets exist, then you need to
# provide values manually OR use Vercel env pull for local dev.

REPO="TIP-LIVE/tip"
ENV_FILE="app/.env"

echo "🔄 TIP — Environment Sync"
echo "=========================="
echo ""

# Check which secrets are configured
echo "Checking configured secrets in $REPO..."
echo ""
SECRETS=$(gh secret list --repo $REPO --json name --jq '.[].name' 2>/dev/null)

if [ -z "$SECRETS" ]; then
    echo "❌ No secrets found. Run ./scripts/setup-secrets.sh first."
    exit 1
fi

echo "✅ Found secrets:"
echo "$SECRETS" | while read -r s; do echo "   - $s"; done
echo ""

# For local dev, use Vercel CLI to pull env vars
echo "📥 For local development, the recommended approach is:"
echo ""
echo "   cd app && vercel env pull .env"
echo ""
echo "This pulls all env vars from your Vercel project into .env."
echo ""
echo "Alternatively, create app/.env manually using app/.env.example as template"
echo "and fill in values from your service dashboards."

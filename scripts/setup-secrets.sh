#!/bin/bash
# TIP — GitHub Secrets Setup Script
# Run this to configure all secrets for the TIP-LIVE/tip repo
#
# Usage: ./scripts/setup-secrets.sh
#
# Prerequisites:
#   - gh CLI authenticated
#   - All service accounts created (Clerk, Stripe, etc.)

REPO="TIP-LIVE/tip"

echo "🚀 TIP — GitHub Secrets Setup"
echo "=============================="
echo ""
echo "This script sets all required secrets for the TIP platform."
echo "Repo: $REPO"
echo ""

# Helper function
set_secret() {
    local name=$1
    local value=$2
    if [ -z "$value" ] || [ "$value" = "REPLACE_ME" ]; then
        echo "⚠️  Skipping $name (no value provided)"
        return
    fi
    echo "$value" | gh secret set "$name" --repo "$REPO"
    echo "✅ Set $name"
}

echo "--- Database ---"
read -p "DATABASE_URL (Neon/Supabase connection string): " DB_URL
set_secret "DATABASE_URL" "$DB_URL"

echo ""
echo "--- Clerk Auth ---"
read -p "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: " CLERK_PK
set_secret "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$CLERK_PK"

read -p "CLERK_SECRET_KEY: " CLERK_SK
set_secret "CLERK_SECRET_KEY" "$CLERK_SK"

read -p "CLERK_WEBHOOK_SECRET: " CLERK_WH
set_secret "CLERK_WEBHOOK_SECRET" "$CLERK_WH"

echo ""
echo "--- Stripe Payments ---"
read -p "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: " STRIPE_PK
set_secret "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PK"

read -p "STRIPE_SECRET_KEY: " STRIPE_SK
set_secret "STRIPE_SECRET_KEY" "$STRIPE_SK"

read -p "STRIPE_WEBHOOK_SECRET: " STRIPE_WH
set_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WH"

read -p "STRIPE_PRICE_STARTER (price_xxx): " STRIPE_P1
set_secret "STRIPE_PRICE_STARTER" "$STRIPE_P1"

read -p "STRIPE_PRICE_TEAM (price_xxx): " STRIPE_P2
set_secret "STRIPE_PRICE_TEAM" "$STRIPE_P2"

read -p "STRIPE_PRICE_VOLUME (price_xxx): " STRIPE_P3
set_secret "STRIPE_PRICE_VOLUME" "$STRIPE_P3"

echo ""
echo "--- Google Maps ---"
read -p "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: " GMAPS_KEY
set_secret "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "$GMAPS_KEY"

echo ""
echo "--- Device API ---"
read -p "DEVICE_API_KEY: " DEVICE_KEY
set_secret "DEVICE_API_KEY" "$DEVICE_KEY"

echo ""
echo "--- Resend Email ---"
read -p "RESEND_API_KEY: " RESEND_KEY
set_secret "RESEND_API_KEY" "$RESEND_KEY"

echo ""
echo "--- Vercel Deployment ---"
read -p "VERCEL_TOKEN: " VERCEL_TOKEN
set_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"

read -p "VERCEL_ORG_ID: " VERCEL_ORG
set_secret "VERCEL_ORG_ID" "$VERCEL_ORG"

read -p "VERCEL_PROJECT_ID: " VERCEL_PROJ
set_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJ"

echo ""
echo "=============================="
echo "✅ Done! All secrets configured."
echo ""
echo "Pre-configured secrets (already set):"
echo "  - CRON_SECRET"
echo "  - FROM_EMAIL"
echo "  - NEXT_PUBLIC_APP_URL"
echo "  - DEVICE_API_URL"
echo "  - NEXT_PUBLIC_CLERK_SIGN_IN_URL"
echo "  - NEXT_PUBLIC_CLERK_SIGN_UP_URL"
echo "  - NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"
echo "  - NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"
echo ""
echo "To verify: gh secret list --repo $REPO"

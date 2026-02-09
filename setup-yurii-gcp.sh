#!/bin/bash
# =============================================================================
# TIP — Grant GCP Permissions for Yurii (yurii@tip.live)
# =============================================================================
# Run this script after authenticating:
#   gcloud auth login
#   gcloud config set project tip-live-platform
#
# Then:
#   chmod +x setup-yurii-gcp.sh && ./setup-yurii-gcp.sh
# =============================================================================

set -e

PROJECT="tip-live-platform"
MEMBER="user:yurii@tip.live"
REGION="us-central1"

echo "================================================"
echo "  TIP — Setting up GCP access for yurii@tip.live"
echo "  Project: $PROJECT"
echo "================================================"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Enable required APIs
# ---------------------------------------------------------------------------
echo "[1/4] Enabling GCP APIs..."

apis=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "pubsub.googleapis.com"
  "secretmanager.googleapis.com"
  "containerregistry.googleapis.com"
  "cloudresourcemanager.googleapis.com"
)

for api in "${apis[@]}"; do
  echo "  - $api"
  gcloud services enable "$api" --project="$PROJECT" --quiet
done

echo "  APIs enabled."
echo ""

# ---------------------------------------------------------------------------
# Step 2: Grant IAM roles
# ---------------------------------------------------------------------------
echo "[2/4] Granting IAM roles to $MEMBER..."

roles=(
  "roles/run.developer"                    # Deploy & manage Cloud Run services
  "roles/cloudbuild.builds.editor"         # Build container images
  "roles/artifactregistry.writer"          # Push/pull Docker images
  "roles/storage.objectAdmin"              # Read/write Cloud Storage objects
  "roles/pubsub.editor"                    # Create topics/subscriptions
  "roles/logging.viewer"                   # View logs for debugging
  "roles/monitoring.viewer"                # View metrics & dashboards
  "roles/secretmanager.secretAccessor"     # Read secrets at runtime
  "roles/secretmanager.secretVersionAdder" # Create new secret versions
  "roles/iam.serviceAccountUser"           # Deploy Cloud Run with SAs
  "roles/viewer"                           # Read-only project overview
)

for role in "${roles[@]}"; do
  echo "  - $role"
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="$MEMBER" \
    --role="$role" \
    --quiet > /dev/null 2>&1
done

echo "  IAM roles granted."
echo ""

# ---------------------------------------------------------------------------
# Step 3: Create Artifact Registry repo (if not exists)
# ---------------------------------------------------------------------------
echo "[3/4] Creating Artifact Registry repository..."

if gcloud artifacts repositories describe tip-device-api \
  --location="$REGION" --project="$PROJECT" > /dev/null 2>&1; then
  echo "  Repository 'tip-device-api' already exists."
else
  gcloud artifacts repositories create tip-device-api \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker images for TIP device API" \
    --project="$PROJECT" \
    --quiet
  echo "  Repository 'tip-device-api' created."
fi

echo ""

# ---------------------------------------------------------------------------
# Step 4: Create device-api service account (for Cloud Run runtime)
# ---------------------------------------------------------------------------
echo "[4/4] Creating service account for device-api..."

SA_NAME="device-api-sa"
SA_EMAIL="$SA_NAME@$PROJECT.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT" > /dev/null 2>&1; then
  echo "  Service account '$SA_NAME' already exists."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="TIP Device API Service Account" \
    --description="Runtime SA for the device-api Cloud Run service" \
    --project="$PROJECT" \
    --quiet
  echo "  Service account '$SA_NAME' created."
fi

# Grant the SA minimal permissions it needs at runtime
echo "  Granting runtime permissions to SA..."
sa_roles=(
  "roles/secretmanager.secretAccessor"
  "roles/pubsub.publisher"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)

for role in "${sa_roles[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role" \
    --quiet > /dev/null 2>&1
done

echo "  SA permissions granted."
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "================================================"
echo "  DONE! Yurii can now:"
echo ""
echo "  1. gcloud auth login          (with yurii@tip.live)"
echo "  2. gcloud config set project tip-live-platform"
echo "  3. Access GCP Console:"
echo "     https://console.cloud.google.com/?project=tip-live-platform"
echo ""
echo "  Artifact Registry:"
echo "     $REGION-docker.pkg.dev/$PROJECT/tip-device-api"
echo ""
echo "  Service Account for Cloud Run:"
echo "     $SA_EMAIL"
echo "================================================"

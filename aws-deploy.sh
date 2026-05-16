#!/bin/bash
# aws-deploy.sh — Deploy ER Command Center to AWS (already-provisioned infra).
#
# What this does:
#   backend    Build Docker image → push to ECR → update Lambda code → wait for active
#   frontend   Build React app with VITE_API_BASE_URL=/api/v1 → sync to S3 → invalidate CloudFront
#   all        Both, in order (default if no arg given)
#
# Prerequisites:
#   - aws-deploy-state.env present in this directory (created at infra-bootstrap time)
#   - AWS CLI authenticated for account 721995408359 in ap-south-1
#   - Docker + Buildx running (linux/amd64 platform for Lambda)
#   - Node 18+ and npm for the frontend build
#
# Usage:
#   ./aws-deploy.sh            # deploy both
#   ./aws-deploy.sh backend    # backend only
#   ./aws-deploy.sh frontend   # frontend only
#
# Safe to re-run — every step is idempotent.

set -euo pipefail
export MSYS_NO_PATHCONV=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/aws-deploy-state.env"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ERROR: $STATE_FILE not found." >&2
  echo "  This script expects the infra to already exist (bootstrapped separately)." >&2
  echo "  If you need to provision fresh infra, see aws-teardown.sh for what gets created." >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$STATE_FILE"

: "${AWS_REGION:?AWS_REGION not set in state file}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID not set in state file}"
: "${ECR_BACKEND:?ECR_BACKEND not set in state file}"
: "${FRONTEND_BUCKET:?FRONTEND_BUCKET not set in state file}"
: "${DIST_ID:?DIST_ID not set in state file}"

BACKEND_LAMBDA_NAME="${BACKEND_LAMBDA_NAME:-er-cmd-backend}"
IMAGE_TAG="${IMAGE_TAG:-lambda}"
# CloudFront proxies /api/* to API Gateway, so the frontend hits the same origin
VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"

ROOT_DIR="$SCRIPT_DIR"
BACKEND_DIR="$ROOT_DIR/Code Base Backend"
FRONTEND_DIR="$ROOT_DIR/Code Base Frontend"

step() { printf "\n\033[1;34m==>\033[0m %s\n" "$*"; }
ok()   { printf "    \033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "    \033[1;33m!\033[0m %s\n" "$*" >&2; }
die()  { printf "\n\033[1;31mERROR:\033[0m %s\n" "$*" >&2; exit 1; }

# ───────────────────────────────────────────────────────────────
# Pre-flight
# ───────────────────────────────────────────────────────────────
preflight() {
  step "Pre-flight checks"
  command -v aws >/dev/null || die "aws CLI not installed"
  command -v docker >/dev/null || die "docker not installed (or daemon not running)"
  command -v npm >/dev/null || die "npm not installed"
  docker info >/dev/null 2>&1 || die "docker daemon not reachable — start Docker Desktop"
  local caller
  caller=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
  [[ "$caller" == "$AWS_ACCOUNT_ID" ]] || die "AWS account mismatch (have=$caller expected=$AWS_ACCOUNT_ID)"
  ok "AWS account $AWS_ACCOUNT_ID in $AWS_REGION"
  ok "Docker daemon reachable"
}

# ───────────────────────────────────────────────────────────────
# Backend: Docker → ECR → Lambda
# ───────────────────────────────────────────────────────────────
deploy_backend() {
  step "Backend: logging in to ECR"
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "${ECR_BACKEND%/*}" >/dev/null
  ok "ECR login OK"

  step "Backend: building image (linux/amd64 for Lambda)"
  # --provenance=false avoids creating a manifest list, which Lambda's container
  # runtime cannot consume.
  # cd into the build context so Docker on Windows doesn't have to translate
  # the MSYS-style "/c/..." path.
  (
    cd "$BACKEND_DIR"
    docker buildx build \
      --platform linux/amd64 \
      --provenance=false \
      -t "$ECR_BACKEND:$IMAGE_TAG" \
      --push \
      .
  )
  ok "Image pushed: $ECR_BACKEND:$IMAGE_TAG"

  step "Backend: updating Lambda function code"
  aws lambda update-function-code \
    --function-name "$BACKEND_LAMBDA_NAME" \
    --image-uri "$ECR_BACKEND:$IMAGE_TAG" \
    --region "$AWS_REGION" \
    --query 'LastUpdateStatus' --output text >/dev/null
  ok "Lambda update requested"

  step "Backend: waiting for Lambda to become Active"
  aws lambda wait function-updated \
    --function-name "$BACKEND_LAMBDA_NAME" \
    --region "$AWS_REGION"
  ok "Lambda $BACKEND_LAMBDA_NAME is Active"

  step "Backend: smoke-testing /health via API Gateway"
  if [[ -n "${API_ENDPOINT:-}" ]]; then
    local health_url="$API_ENDPOINT/health"
    local status
    # curl's %{http_code} prints with no trailing newline; we substitute "000"
    # only when curl itself fails (network error, dns, etc.)
    if status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$health_url"); then
      :
    else
      status="000"
    fi
    if [[ "$status" == "200" ]]; then
      ok "Health check passed ($health_url → $status)"
    else
      warn "Health check returned $status — check Lambda logs:"
      warn "  aws logs tail /aws/lambda/$BACKEND_LAMBDA_NAME --region $AWS_REGION --since 5m"
    fi
  else
    warn "API_ENDPOINT not in state file — skipping smoke test"
  fi
}

# ───────────────────────────────────────────────────────────────
# Frontend: build → S3 → invalidate CloudFront
# ───────────────────────────────────────────────────────────────
deploy_frontend() {
  step "Frontend: installing dependencies"
  (cd "$FRONTEND_DIR" && npm ci --no-audit --no-fund) >/dev/null
  ok "npm ci complete"

  step "Frontend: building (VITE_API_BASE_URL=$VITE_API_BASE_URL)"
  (cd "$FRONTEND_DIR" && VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build) >/dev/null
  [[ -d "$FRONTEND_DIR/dist" ]] || die "Build produced no dist/ directory"
  ok "Build complete: $(du -sh "$FRONTEND_DIR/dist" | awk '{print $1}')"

  # Run S3 commands from inside dist/ with relative paths so AWS CLI doesn't
  # have to translate MSYS-style /c/... paths on Windows.
  (
    cd "$FRONTEND_DIR/dist"

    step "Frontend: syncing hashed assets to s3://$FRONTEND_BUCKET (long-cache)"
    # Hashed bundles can be cached forever; --delete removes stale assets
    aws s3 sync "assets/" "s3://$FRONTEND_BUCKET/assets/" \
      --region "$AWS_REGION" \
      --delete \
      --cache-control "public,max-age=31536000,immutable" \
      --only-show-errors
    ok "assets/ synced"

    step "Frontend: uploading index.html with no-cache"
    # index.html must NOT be cached so users get fresh bundle hashes on each deploy
    aws s3 cp "index.html" "s3://$FRONTEND_BUCKET/index.html" \
      --region "$AWS_REGION" \
      --cache-control "no-cache, no-store, must-revalidate" \
      --content-type "text/html" \
      --only-show-errors
    ok "index.html uploaded"

    # Upload any non-asset extras (favicons, robots.txt, etc.) if they exist
    if compgen -G "*.svg" >/dev/null \
       || compgen -G "*.ico" >/dev/null \
       || compgen -G "*.txt" >/dev/null \
       || compgen -G "*.json" >/dev/null; then
      step "Frontend: uploading root static files"
      aws s3 sync "." "s3://$FRONTEND_BUCKET/" \
        --region "$AWS_REGION" \
        --exclude "*" \
        --include "*.svg" --include "*.ico" --include "*.txt" --include "*.json" \
        --cache-control "public,max-age=3600" \
        --only-show-errors
      ok "root files synced"
    fi
  )

  step "Frontend: invalidating CloudFront ($DIST_ID)"
  local invalidation_id
  invalidation_id=$(aws cloudfront create-invalidation \
    --distribution-id "$DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' --output text)
  ok "Invalidation created: $invalidation_id"
}

# ───────────────────────────────────────────────────────────────
# Entry point
# ───────────────────────────────────────────────────────────────
TARGET="${1:-all}"

preflight

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  all|"")
    deploy_backend
    deploy_frontend
    ;;
  *)
    die "Unknown target: $TARGET (expected: backend | frontend | all)"
    ;;
esac

step "Deploy finished"
if [[ -n "${DIST_DOMAIN:-}" ]]; then
  printf "    App URL:  https://%s\n" "$DIST_DOMAIN"
fi
if [[ -n "${API_ENDPOINT:-}" ]]; then
  printf "    API URL:  %s\n" "$API_ENDPOINT"
fi

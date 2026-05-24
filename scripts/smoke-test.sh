#!/usr/bin/env bash
# Smoke test the deployed CMS. Run as: bash scripts/smoke-test.sh
# Requires: STRAPI_BASE_URL and STRAPI_PUBLIC_TOKEN in env.
set -euo pipefail

: "${STRAPI_BASE_URL:?Set STRAPI_BASE_URL}"
: "${STRAPI_PUBLIC_TOKEN:?Set STRAPI_PUBLIC_TOKEN}"

BASE="$STRAPI_BASE_URL"
TOK="$STRAPI_PUBLIC_TOKEN"

probe() {
  local label="$1"; shift
  local expected="$1"; shift
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [[ "$code" == "$expected" ]]; then
    echo "  ✓ $label  $code"
  else
    echo "  ✗ $label  expected=$expected got=$code"
    exit 1
  fi
}

echo "--- public reads (200) ---"
probe "site-setting"        200 -H "Authorization: Bearer $TOK" "$BASE/api/site-setting"
probe "design-tokens"       200 -H "Authorization: Bearer $TOK" "$BASE/api/design-tokens"
probe "navigation"          200 -H "Authorization: Bearer $TOK" "$BASE/api/navigation"
probe "blog-posts (published)" 200 -H "Authorization: Bearer $TOK" "$BASE/api/blog-posts?filters[publishedAt][\$notNull]=true"
probe "legal-document privacy" 200 -H "Authorization: Bearer $TOK" "$BASE/api/legal-documents?filters[slug][\$eq]=privacy"
probe "corridors"           200 -H "Authorization: Bearer $TOK" "$BASE/api/corridors"

echo "--- PII reads (403) ---"
probe "candidates"          403 -H "Authorization: Bearer $TOK" "$BASE/api/candidates"
probe "form-submissions GET"403 -H "Authorization: Bearer $TOK" "$BASE/api/form-submissions"

echo "--- public POST (201) ---"
probe "form-submissions POST" 201 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":{"formKey":"contact","email":"smoke-test@example.com","message":"smoke test"}}' \
  "$BASE/api/form-submissions"

echo
echo "all checks passed."

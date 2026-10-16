#!/usr/bin/env bash
# Smoke test d'une instance JoJo Tracker en marche (curl uniquement).
# Usage : scripts/smoke-test.sh [URL_DE_BASE] [ORIGIN]
#   URL_DE_BASE : adresse joignable depuis cette machine (défaut http://127.0.0.1:3000)
#   ORIGIN      : valeur de APP_ORIGIN (défaut = URL_DE_BASE), envoyée dans l'en-tête Origin
# Crée un compte de test jetable puis le supprime.
set -euo pipefail

BASE="${1:-http://127.0.0.1:3000}"
ORIGIN="${2:-$BASE}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
USER_NAME="smoke_$(date +%s)"
PASS="smoke-test-$(date +%s)-pass"
fail() { echo "✗ $*" >&2; exit 1; }
ok() { echo "✓ $*"; }

req() { # méthode chemin [corps]
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -b "$JAR" -c "$JAR" -X "$method" -H "Origin: $ORIGIN" -o /tmp/smoke-body -w '%{http_code}')
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' --data "$body")
  curl "${args[@]}" "$BASE$path"
}

[ "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/api/health")" = 200 ] || fail "santé"
ok "GET /api/health"

code=$(req POST /api/auth/register "{\"username\":\"$USER_NAME\",\"password\":\"$PASS\",\"remember\":true}")
[ "$code" = 201 ] || fail "inscription ($code) : $(cat /tmp/smoke-body)"
ok "inscription ($USER_NAME)"

code=$(req POST /api/auth/logout); [ "$code" = 204 ] || fail "déconnexion ($code)"
code=$(req POST /api/auth/login "{\"username\":\"$USER_NAME\",\"password\":\"$PASS\",\"remember\":false}")
[ "$code" = 200 ] || fail "connexion ($code)"
ok "déconnexion + connexion"

code=$(req GET /api/catalog); [ "$code" = 200 ] || fail "catalogue ($code)"
count=$(grep -o '"id":"p[0-9]*-e[0-9]*"' /tmp/smoke-body | wc -l)
[ "$count" -ge 202 ] || fail "catalogue incomplet ($count épisodes)"
grep -q '"title":"' /tmp/smoke-body && fail "le catalogue d'un nouveau compte contient un titre !"
ok "catalogue ($count épisodes, aucun titre visible)"

code=$(req PUT /api/watched '{"watched":true,"items":[{"episodeId":"p1-e1"}]}')
[ "$code" = 200 ] || fail "cochage ($code)"
grep -q '"watched":true' /tmp/smoke-body || fail "épisode non coché"
grep -q '"titleHidden":false' /tmp/smoke-body || fail "titre de l'épisode vu non révélé"
ok "cochage de p1-e1 (titre révélé pour cet épisode seulement)"

code=$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" -X PUT -H 'Origin: https://evil.example' \
  -H 'Content-Type: application/json' --data '{"watched":true,"items":[{"episodeId":"p1-e2"}]}' "$BASE/api/watched")
[ "$code" = 403 ] || fail "protection CSRF ($code)"
ok "requête d'une origine étrangère refusée (CSRF)"

[ "$(curl -sS -o /dev/null -w '%{http_code}' -H 'Accept: text/html' "$BASE/parties/3")" = 200 ] || fail "front (fallback SPA)"
curl -sS "$BASE/manifest.webmanifest" | grep -q '"display":"standalone"' || fail "manifest"
[ "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/sw.js")" = 200 ] || fail "service worker"
ok "front, manifest et service worker servis"

code=$(req DELETE /api/me "{\"confirmUsername\":\"$USER_NAME\"}"); [ "$code" = 204 ] || fail "suppression ($code)"
ok "compte de test supprimé"
echo "Tout est OK."

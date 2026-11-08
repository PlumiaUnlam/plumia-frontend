#!/usr/bin/env bash
# Validación por niveles: cada ajuste corre solo lo que corresponde, no toda la suite.
#
#   scripts/verify.sh            quick: tipos + lint + unitarios + e2e de lo que cambió  (≈ 3-5 min)
#   scripts/verify.sh smoke      quick + auditoría de interfaz en 2 tamaños              (≈ 8-10 min)
#   scripts/verify.sh full       todo: suite e2e completa + auditoría larga + Sonar      (≈ 35 min)
#
# «Lo que cambió» se deduce de git (cambios sin commitear y archivos nuevos). Si algo no
# está en la tabla, se corre el nivel smoke. Cada paso imprime cuánto tardó y el script se
# detiene en el primer fallo, para no gastar tiempo en pasos que ya no importan.
set -uo pipefail

MODE="${1:-quick}"
cd "$(dirname "$0")/.." || exit 1
ROOT="$(cd .. && pwd)"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:3000}"
export API_URL="${API_URL:-http://127.0.0.1:3000}"

step() { echo; echo "== $1"; STEP_START=$SECONDS; }
done_step() { echo "   ($((SECONDS - STEP_START)) s)"; }
fail() { echo "✗ $1"; exit 1; }

step "tipos"
pnpm exec tsc --noEmit --pretty false || fail "tsc"
done_step

step "lint"
pnpm lint >/dev/null 2>&1 || { pnpm lint | tail -20; fail "lint"; }
done_step

step "unitarios"
pnpm test:unit 2>&1 | tail -3
[ "${PIPESTATUS[0]}" -eq 0 ] || fail "unitarios"
done_step

# ---- qué specs corresponden a lo que cambió
CHANGED="$( (git diff --name-only HEAD; git ls-files --others --exclude-standard) | sort -u)"
SPECS=()
SMOKE=0
add() { for s in "$@"; do SPECS+=("e2e/$s.spec.ts"); done; }

while IFS= read -r file; do
  [ -z "$file" ] && continue
  case "$file" in
    e2e/*.spec.ts) SPECS+=("$file") ;;
    components/chat-panel*|lib/chat-navigation*|stores/editor.store*|components/editor-right-panel*|types/chat*)
      add chat-sources chat-help-navigation ;;
    components/ui/dialog*|components/ui/alert-dialog*|components/ui/sheet*|components/ui/drawer*|components/ui/use-restore-focus*|components/modal/*|components/left-sidebar*)
      add focus-management modals-catalog modals-editor ;;
    components/form/*|components/ui/button*)
      add touch-and-truncation ui-language register-form forgot-password layout-regressions ;;
    components/sharing/*|components/mobile/*)
      add focus-management mobile-experience; SMOKE=1 ;;
    components/wiki-panel*|hooks/use-expanded-overlay*)
      add chat-sources ;;
    components/user-menu*|components/profile-settings/*)
      add settings-dialog ;;
    components/editor/*)
      add modals-editor modals-catalog ;;
    components/truncation-titles*)
      add touch-and-truncation ;;
    e2e/support/ui-audit-core*) add ui-audit-detectors ;;
    app/*|components/*|hooks/*|stores/*|lib/*) SMOKE=1 ;;
  esac
done <<< "$CHANGED"

# sin duplicados
mapfile -t SPECS < <(printf '%s\n' "${SPECS[@]:-}" | grep -v '^$' | sort -u)

# ---- build solo si el código es más nuevo que el último build
needs_build() {
  [ -f .next/BUILD_ID ] || return 0
  [ -n "$(find app components hooks lib stores types public -newer .next/BUILD_ID -type f 2>/dev/null | head -1)" ]
}
step "build"
if needs_build || [ "$MODE" = "full" ]; then
  fuser -k 3101/tcp >/dev/null 2>&1
  pnpm build 2>&1 | grep -iE "error|failed" | head -5
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "build"
else
  echo "   al día, no hace falta"
fi
done_step

run_e2e() {
  local label="$1"; shift
  step "e2e: $label"
  fuser -k 3101/tcp >/dev/null 2>&1
  pnpm exec playwright test "$@" --project=chromium --reporter=line 2>&1 | grep -vE '^\[[0-9]+/[0-9]+\]' | tail -25
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "e2e ($label)"
  done_step
}

if [ "$MODE" = "full" ]; then
  step "e2e completos"
  fuser -k 3101/tcp >/dev/null 2>&1
  pnpm exec playwright test --reporter=line 2>&1 | grep -vE '^\[[0-9]+/[0-9]+\]' | tail -25
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "e2e completos"
  done_step

  step "sonar"
  "$ROOT/tools/sonarqube/scan.sh" frontend 2>&1 | sed -n '/Quality Gate:/,$p' | head -12
  done_step

  step "auditoría larga"
  fuser -k 3101/tcp >/dev/null 2>&1
  rm -rf test-results/ui-audit
  UI_AUDIT=1 pnpm exec playwright test e2e/ui-audit.spec.ts e2e/modals-catalog.spec.ts --project=chromium --workers=6 --reporter=line 2>&1 | grep -vE '^\[[0-9]+/[0-9]+\]' | tail -15
  done_step
  exit 0
fi

if [ "${#SPECS[@]}" -gt 0 ]; then
  run_e2e "lo que cambió (${#SPECS[@]} archivos)" "${SPECS[@]}"
else
  echo; echo "== e2e: ningún cambio con spec asociado"
fi

if [ "$MODE" = "smoke" ] || [ "$SMOKE" -eq 1 ] && [ "$MODE" != "quick" ]; then
  step "auditoría rápida (escritorio y celular, modo claro)"
  fuser -k 3101/tcp >/dev/null 2>&1
  rm -rf test-results/ui-audit
  UI_AUDIT=1 pnpm exec playwright test e2e/ui-audit.spec.ts --project=chromium --workers=6 \
    -g "(escritorio-1440|movil-375) light" --reporter=line 2>&1 | grep -vE '^\[[0-9]+/[0-9]+\]' | tail -12
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "auditoría rápida"
  done_step
elif [ "$SMOKE" -eq 1 ]; then
  echo; echo "ℹ cambiaste algo visual sin spec propio: corré «scripts/verify.sh smoke»"
fi

echo; echo "✓ listo en $SECONDS s ($MODE)"

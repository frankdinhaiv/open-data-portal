#!/bin/bash
set -euo pipefail

# ─── Arena QA Council Pipeline ────────────────────────────
# Adapted from POC (qa/qa-run.sh) for ViGen Arena feature
# Source of truth: docs/features/arena/SPEC.md
# ──────────────────────────────────────────────────────────

SPEC="${1:-docs/features/arena/SPEC.md}"
BASE_URL="${2:-http://localhost:3000}"
QA_DIR="$(cd "$(dirname "$0")" && pwd)"
ARTIFACTS="$QA_DIR/artifacts"
REPORTS="$QA_DIR/reports"
PROJECT_ROOT="$(cd "$QA_DIR/.." && pwd)"

# Validate spec file exists
SPEC_PATH="$PROJECT_ROOT/$SPEC"
[ -f "$SPEC_PATH" ] || { echo "ERROR: Spec file not found: $SPEC_PATH"; exit 1; }

# Clean previous run
rm -f "$ARTIFACTS"/*.json
rm -rf "$REPORTS/screenshots"
mkdir -p "$ARTIFACTS" "$REPORTS/screenshots"

log() { echo "[$(date +%H:%M:%S)] $1"; }

validate() {
  local file="$1"
  if ! jq empty "$file" 2>/dev/null; then
    log "FATAL: $file is not valid JSON"
    exit 1
  fi
  log "VALIDATED: $file"
}

# Run a claude agent with configurable model
# run_agent <prompt_file> <allowed_tools> <extra_prompt> <raw_output_file> [model]
run_agent() {
  local prompt_file="$1" tools="$2" extra="$3" raw_file="$4"
  local model="${5:-opus}"
  local max_turns="${6:-30}"
  local full_prompt
  full_prompt="$(cat "$prompt_file")

$extra"

  claude -p "$full_prompt" \
    --allowedTools "$tools" \
    --output-format json \
    --model "$model" \
    --max-turns "$max_turns" > "$raw_file"

  # Extract usage data
  jq '{usage: .usage, cost: .total_cost_usd}' "$raw_file" > "${raw_file}.usage.json"

  # Return the result text
  jq -r '.result' "$raw_file"
}

test_file_list() {
  find "$QA_DIR/tests" -name "*.spec.ts" -o -name "*.api-spec.ts" 2>/dev/null | sort
}

log "Arena QA Council Pipeline"
log "Spec: $SPEC_PATH"
log "Base URL: $BASE_URL"
log "─────────────────────────────────────────"

# ─── PHASE 1: DUAL ANALYST (parallel) ───────────────────
log "Phase 1: Dual Analyst"

run_agent "$QA_DIR/prompts/analyst.md" "Read,Grep,Glob" \
  "Read the spec file at: $SPEC_PATH
Use ID prefix 'A-' for all scenario IDs (e.g., A-TS-001)." \
  "$ARTIFACTS/analyst-a-raw.json" > "$ARTIFACTS/test-plan-a.json" &
PID_A=$!

run_agent "$QA_DIR/prompts/analyst.md" "Read,Grep,Glob" \
  "Read the spec file at: $SPEC_PATH
Use ID prefix 'B-' for all scenario IDs (e.g., B-TS-001)." \
  "$ARTIFACTS/analyst-b-raw.json" > "$ARTIFACTS/test-plan-b.json" &
PID_B=$!

wait $PID_A; A_EXIT=$?
wait $PID_B; B_EXIT=$?
[ $A_EXIT -ne 0 ] && { log "FATAL: Analyst A failed (exit $A_EXIT)"; exit 1; }
[ $B_EXIT -ne 0 ] && { log "FATAL: Analyst B failed (exit $B_EXIT)"; exit 1; }

validate "$ARTIFACTS/test-plan-a.json"
validate "$ARTIFACTS/test-plan-b.json"

# Symmetric diff: merge and flag discrepancies
jq -s '
  (.[0].scenarios | map(.title)) as $a_titles |
  (.[1].scenarios | map(.title)) as $b_titles |
  {
    scenarios: (.[0].scenarios + .[1].scenarios | unique_by(.title)),
    discrepancies: {
      in_a_not_b: [($a_titles - $b_titles)[]],
      in_b_not_a: [($b_titles - $a_titles)[]]
    },
    metadata: {
      spec_source: .[0].metadata.spec_source,
      generated_at: (now | todate),
      total_scenarios: (.[0].scenarios + .[1].scenarios | unique_by(.title) | length),
      analyst_a_count: (.[0].scenarios | length),
      analyst_b_count: (.[1].scenarios | length)
    }
  }
' "$ARTIFACTS/test-plan-a.json" "$ARTIFACTS/test-plan-b.json" \
  > "$ARTIFACTS/test-plan.json"

TOTAL=$(jq '.scenarios | length' "$ARTIFACTS/test-plan.json")
DISC_A=$(jq '.discrepancies.in_a_not_b | length' "$ARTIFACTS/test-plan.json")
DISC_B=$(jq '.discrepancies.in_b_not_a | length' "$ARTIFACTS/test-plan.json")
log "Analyst complete: $TOTAL scenarios (discrepancies: A-only=$DISC_A, B-only=$DISC_B)"

# ─── PHASE 2: ARCHITECT ─────────────────────────────────
log "Phase 2: Architect"

run_agent "$QA_DIR/prompts/architect.md" "Read,Write" \
  "Read the test plan at: $ARTIFACTS/test-plan.json
Write your output to: $ARTIFACTS/test-architecture.json
Base URL for config: $BASE_URL" \
  "$ARTIFACTS/architect-raw.json" > /dev/null

validate "$ARTIFACTS/test-architecture.json"
log "Architect complete: $(jq '.test_suites | length' "$ARTIFACTS/test-architecture.json") test suites designed"

# ─── PHASE 3: PARALLEL ENGINEERS (3 agents) ──────────────
log "Phase 3: Engineers (parallel — UI + API + Elo)"

run_agent "$QA_DIR/prompts/ui-engineer.md" "Read,Write,Bash" \
  "Read the architecture at: $ARTIFACTS/test-architecture.json
Write test files to: $QA_DIR/tests/ui/ and $QA_DIR/tests/pages/
Write fixture files to: $QA_DIR/tests/fixtures/
Base URL: $BASE_URL" \
  "$ARTIFACTS/ui-eng-raw.json" > /dev/null &
PID_UI=$!

run_agent "$QA_DIR/prompts/api-engineer.md" "Read,Write,Bash" \
  "Read the architecture at: $ARTIFACTS/test-architecture.json
Write test files to: $QA_DIR/tests/api/
Base URL: $BASE_URL" \
  "$ARTIFACTS/api-eng-raw.json" > /dev/null &
PID_API=$!

run_agent "$QA_DIR/prompts/elo-engineer.md" "Read,Write,Bash" \
  "Read the architecture at: $ARTIFACTS/test-architecture.json
Also read the Elo Engine section of the spec: $SPEC_PATH
Write test files to: $QA_DIR/tests/api/
Base URL: $BASE_URL" \
  "$ARTIFACTS/elo-eng-raw.json" > /dev/null &
PID_ELO=$!

wait $PID_UI; UI_EXIT=$?
wait $PID_API; API_EXIT=$?
wait $PID_ELO; ELO_EXIT=$?

FAIL_COUNT=0
[ $UI_EXIT -ne 0 ] && { log "WARNING: UI Engineer failed (exit $UI_EXIT)"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
[ $API_EXIT -ne 0 ] && { log "WARNING: API Engineer failed (exit $API_EXIT)"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
[ $ELO_EXIT -ne 0 ] && { log "WARNING: Elo Engineer failed (exit $ELO_EXIT)"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

if [ $FAIL_COUNT -eq 3 ]; then
  log "FATAL: All engineers failed"
  exit 1
fi

log "Engineers complete: $(test_file_list | wc -l | tr -d ' ') test files generated"

# ─── PHASE 4: SENTINEL (with retry loop) ─────────────────
log "Phase 4: Sentinel"

TEST_FILES=$(test_file_list)

for ATTEMPT in 1 2 3; do
  run_agent "$QA_DIR/prompts/sentinel.md" "Read,Grep,Glob" \
    "Review these test files:
$TEST_FILES

Also read the test plan for coverage checking: $ARTIFACTS/test-plan.json
Write your review to: $ARTIFACTS/qa-review.json" \
    "$ARTIFACTS/sentinel-raw.json" > /dev/null

  validate "$ARTIFACTS/qa-review.json"

  VERDICT=$(jq -r '.verdict' "$ARTIFACTS/qa-review.json")
  SCORE=$(jq -r '.score' "$ARTIFACTS/qa-review.json")
  if [ "$VERDICT" = "PASS" ]; then
    log "Sentinel: PASS (score: $SCORE)"
    break
  fi

  log "Sentinel: BLOCK (score: $SCORE, attempt $ATTEMPT/3)"
  if [ "$ATTEMPT" -eq 3 ]; then
    log "WARNING: Sentinel blocked 3 times (score: $SCORE). Continuing to Healer anyway."
    break
  fi

  # Route issues to the correct engineer
  UI_ISSUES=$(jq '[.issues[] | select(.file | test("tests/ui/"))]' "$ARTIFACTS/qa-review.json")
  API_ISSUES=$(jq '[.issues[] | select(.file | test("tests/api/"))]' "$ARTIFACTS/qa-review.json")

  if [ "$(echo "$UI_ISSUES" | jq 'length')" -gt 0 ]; then
    log "Routing $(echo "$UI_ISSUES" | jq 'length') issues to UI Engineer..."
    run_agent "$QA_DIR/prompts/ui-engineer.md" "Read,Write,Edit" \
      "Fix these issues found by the Sentinel reviewer: $UI_ISSUES" \
      "$ARTIFACTS/ui-fix-raw.json" > /dev/null
  fi

  if [ "$(echo "$API_ISSUES" | jq 'length')" -gt 0 ]; then
    log "Routing $(echo "$API_ISSUES" | jq 'length') issues to API/Elo Engineer..."
    run_agent "$QA_DIR/prompts/api-engineer.md" "Read,Write,Edit" \
      "Fix these issues found by the Sentinel reviewer: $API_ISSUES" \
      "$ARTIFACTS/api-fix-raw.json" > /dev/null
  fi
done

# ─── PHASE 5: HEALER (Sonnet, 50 turns) ─────────────────
log "Phase 5: Healer (model: sonnet, max-turns: 50)"

TEST_FILES=$(test_file_list)

run_agent "$QA_DIR/prompts/healer.md" "Read,Write,Edit,Bash" \
  "Run and heal these test files:
$TEST_FILES

Base URL: $BASE_URL
Write your heal log to: $ARTIFACTS/heal-log.json" \
  "$ARTIFACTS/healer-raw.json" "sonnet" "50"

# Validate heal-log if it exists (Healer may hit max-turns)
if [ -f "$ARTIFACTS/heal-log.json" ]; then
  validate "$ARTIFACTS/heal-log.json"
  PASS_RATE=$(jq -r '.pass_rate' "$ARTIFACTS/heal-log.json")
  REAL_BUGS=$(jq '.real_bugs | length' "$ARTIFACTS/heal-log.json")
  log "Healer complete: $PASS_RATE pass rate, $REAL_BUGS real bugs found"
else
  log "WARNING: Healer did not produce heal-log.json (may have hit max-turns)"
fi

# ─── PHASE 6: SCRIBE (runs regardless of Healer outcome) ─
log "Phase 6: Scribe"

run_agent "$QA_DIR/prompts/scribe.md" "Read,Bash" \
  "Read all artifacts in: $ARTIFACTS/
Write the report to: $REPORTS/qa-report.md
Save screenshots to: $REPORTS/screenshots/
Spec source: $SPEC_PATH" \
  "$ARTIFACTS/scribe-raw.json" > /dev/null

# ─── COST SUMMARY ────────────────────────────────────────
log "Aggregating cost data..."
python3 -c "
import json, glob, os
agents = []
for f in sorted(glob.glob('$ARTIFACTS/*-raw.json.usage.json')):
    name = os.path.basename(f).replace('-raw.json.usage.json', '')
    try:
        with open(f) as fh:
            data = json.load(fh)
        agents.append({'name': name, 'usage': data.get('usage', {}), 'cost': data.get('cost', 0)})
    except: pass
total = sum(a.get('cost', 0) or 0 for a in agents)
result = {'run_id': '$(date -u +%Y-%m-%dT%H:%M:%SZ)', 'agents': agents, 'total_cost_usd': total}
with open('$ARTIFACTS/cost-log.json', 'w') as f:
    json.dump(result, f, indent=2)
print(f'Total cost: \${total:.2f}')
" 2>/dev/null || log "WARNING: Cost aggregation failed"

TOTAL_COST=$(jq -r '.total_cost_usd // "unknown"' "$ARTIFACTS/cost-log.json" 2>/dev/null || echo "unknown")

log "─────────────────────────────────────────"
log "Arena QA Council Pipeline Complete"
log "Total cost: \$$TOTAL_COST"
log "Report: $REPORTS/qa-report.md"
log "─────────────────────────────────────────"

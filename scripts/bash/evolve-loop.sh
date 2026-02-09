#!/bin/bash
# =============================================================================
# evolve-loop.sh — Self-Evolving Feature Development Loop
# =============================================================================
#
# Runs /evolve in a continuous loop with safety caps, convergence detection,
# and cost awareness. Each iteration gets a fresh context window (the key
# insight from the Ralph Wiggum pattern).
#
# Usage:
#   ./scripts/bash/evolve-loop.sh "Build a customer feedback widget with NPS scoring"
#   ./scripts/bash/evolve-loop.sh --max-cycles 30 "Add real-time collaboration"
#   ./scripts/bash/evolve-loop.sh --continue  # Resume an existing evolution
#
# Safety:
#   - Hard cap on iterations (default 50)
#   - Convergence detection via .evolution/CONVERGED file
#   - Git safety net — commits after each build cycle
#   - Graceful interrupt with Ctrl+C
#   - Cooldown between cycles to avoid rate limiting
#
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

MAX_CYCLES="${MAX_CYCLES:-50}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-5}"
EVOLUTION_DIR=".evolution"
CONVERGED_FILE="$EVOLUTION_DIR/CONVERGED"
STATE_FILE="$EVOLUTION_DIR/state.md"
LOG_FILE="$EVOLUTION_DIR/loop.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Parse Arguments ─────────────────────────────────────────────────────────

CONTINUE_MODE=false
FEATURE_GOAL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --max-cycles)
            MAX_CYCLES="$2"
            shift 2
            ;;
        --cooldown)
            COOLDOWN_SECONDS="$2"
            shift 2
            ;;
        --continue)
            CONTINUE_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: evolve-loop.sh [OPTIONS] \"feature description\""
            echo ""
            echo "Options:"
            echo "  --max-cycles N    Maximum evolution cycles (default: 50)"
            echo "  --cooldown N      Seconds between cycles (default: 5)"
            echo "  --continue        Resume existing evolution"
            echo "  -h, --help        Show this help"
            echo ""
            echo "Examples:"
            echo "  ./scripts/bash/evolve-loop.sh \"Build NPS feedback widget\""
            echo "  ./scripts/bash/evolve-loop.sh --max-cycles 30 --continue"
            exit 0
            ;;
        *)
            FEATURE_GOAL="$1"
            shift
            ;;
    esac
done

# ─── Validation ──────────────────────────────────────────────────────────────

if [ "$CONTINUE_MODE" = false ] && [ -z "$FEATURE_GOAL" ]; then
    echo -e "${RED}Error: Provide a feature description or use --continue${NC}"
    echo "Usage: evolve-loop.sh \"feature description\""
    echo "       evolve-loop.sh --continue"
    exit 1
fi

if [ "$CONTINUE_MODE" = true ] && [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}Error: No evolution in progress. Start one with a feature description.${NC}"
    exit 1
fi

# ─── Graceful Shutdown ───────────────────────────────────────────────────────

INTERRUPTED=false

cleanup() {
    INTERRUPTED=true
    echo ""
    echo -e "${YELLOW}[EVOLVE] Interrupted. Current state saved in $EVOLUTION_DIR/${NC}"
    echo -e "${YELLOW}[EVOLVE] Resume with: ./scripts/bash/evolve-loop.sh --continue${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ─── Logging ─────────────────────────────────────────────────────────────────

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" >> "$LOG_FILE"
    echo -e "$1"
}

# ─── Banner ──────────────────────────────────────────────────────────────────

echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║          EVOLUTION LOOP — Self-Evolving Agent           ║"
echo "  ║                                                          ║"
echo "  ║  Principles: Backpressure | Memory | Pivoting | Safety  ║"
echo "  ║  Architecture: Fresh context per cycle | Multi-agent     ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ "$CONTINUE_MODE" = true ]; then
    echo -e "${BLUE}[EVOLVE] Resuming existing evolution${NC}"
    CLAUDE_ARGS="continue"
else
    echo -e "${BLUE}[EVOLVE] Starting new evolution: ${FEATURE_GOAL}${NC}"
    CLAUDE_ARGS="$FEATURE_GOAL"
fi

echo -e "${BLUE}[EVOLVE] Max cycles: $MAX_CYCLES | Cooldown: ${COOLDOWN_SECONDS}s${NC}"
echo -e "${BLUE}[EVOLVE] Convergence file: $CONVERGED_FILE${NC}"
echo -e "${BLUE}[EVOLVE] Press Ctrl+C to stop gracefully${NC}"
echo ""

# Create log file directory if needed
mkdir -p "$EVOLUTION_DIR"

# ─── Main Loop ───────────────────────────────────────────────────────────────

CYCLE=1
START_TIME=$(date +%s)

while [ $CYCLE -le $MAX_CYCLES ]; do

    # ── Check convergence ──
    if [ -f "$CONVERGED_FILE" ]; then
        echo ""
        echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║          EVOLUTION CONVERGED!                    ║${NC}"
        echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
        echo ""
        cat "$CONVERGED_FILE"
        echo ""
        ELAPSED=$(( $(date +%s) - START_TIME ))
        log "${GREEN}[EVOLVE] Converged after $((CYCLE - 1)) cycles in $((ELAPSED / 60)) minutes${NC}"
        exit 0
    fi

    # ── Check interruption ──
    if [ "$INTERRUPTED" = true ]; then
        break
    fi

    # ── Run cycle ──
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "${CYAN}[EVOLVE] Cycle $CYCLE/$MAX_CYCLES starting...${NC}"
    echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    CYCLE_START=$(date +%s)

    # Run Claude with the evolve command
    # First cycle: pass the feature goal
    # Subsequent cycles: pass "continue"
    if [ $CYCLE -eq 1 ] && [ "$CONTINUE_MODE" = false ]; then
        claude -p "/evolve $CLAUDE_ARGS" --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE"
    else
        claude -p "/evolve continue" --dangerously-skip-permissions 2>&1 | tee -a "$LOG_FILE"
    fi

    CYCLE_END=$(date +%s)
    CYCLE_DURATION=$(( CYCLE_END - CYCLE_START ))

    echo ""
    log "${BLUE}[EVOLVE] Cycle $CYCLE completed in ${CYCLE_DURATION}s${NC}"

    # ── Post-cycle convergence check ──
    if [ -f "$CONVERGED_FILE" ]; then
        echo ""
        echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║          EVOLUTION CONVERGED!                    ║${NC}"
        echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
        echo ""
        cat "$CONVERGED_FILE"
        ELAPSED=$(( $(date +%s) - START_TIME ))
        log "${GREEN}[EVOLVE] Converged after $CYCLE cycles in $((ELAPSED / 60)) minutes${NC}"
        exit 0
    fi

    # ── Increment and cooldown ──
    CYCLE=$((CYCLE + 1))

    if [ $CYCLE -le $MAX_CYCLES ]; then
        echo -e "${YELLOW}[EVOLVE] Cooling down ${COOLDOWN_SECONDS}s before next cycle...${NC}"
        sleep "$COOLDOWN_SECONDS"
    fi

done

# ─── Cap reached ─────────────────────────────────────────────────────────────

echo ""
echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${RED}${BOLD}║     ITERATION CAP REACHED ($MAX_CYCLES cycles)            ║${NC}"
echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
ELAPSED=$(( $(date +%s) - START_TIME ))
log "${RED}[EVOLVE] Hit iteration cap after $MAX_CYCLES cycles ($((ELAPSED / 60)) minutes)${NC}"
echo -e "${YELLOW}[EVOLVE] Review current state in $EVOLUTION_DIR/${NC}"
echo -e "${YELLOW}[EVOLVE] Resume with: ./scripts/bash/evolve-loop.sh --continue${NC}"
exit 1

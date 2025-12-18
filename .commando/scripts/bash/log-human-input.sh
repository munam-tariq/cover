#!/usr/bin/env bash
#
# Human Input Logging Utility
#
# Logs human decisions, clarifications, and approvals during workflow execution
# Creates a JSONL audit trail for transparency and future reference

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Default values
LOG_FILE=""
PHASE=""
TYPE=""
WORKFLOW=""
FEATURE=""
QUESTION=""
ANSWER=""
CONTEXT="{}"
METADATA="{}"

# Usage function
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Log human input during workflow execution to JSONL audit trail

OPTIONS:
    --log-file PATH       Path to human input log file (REQUIRED)
    --phase NAME          Workflow phase (e.g., prd-parsing, analysis, planning)
    --type TYPE           Input type (clarification|decision|approval|validation_gate)
    --workflow NAME       Workflow name (e.g., prd-to-production)
    --feature SLUG        Feature slug (e.g., user-auth)
    --question TEXT       Question asked to user
    --answer TEXT         User's answer
    --context JSON        Additional context as JSON object
    --metadata JSON       Additional metadata as JSON object
    --help                Show this help message

EXAMPLES:
    # Log a clarification
    $0 --log-file "docs/requests/user-auth/artifacts/human-inputs.jsonl" \\
       --phase "prd-parsing" \\
       --type "clarification" \\
       --workflow "prd-to-production" \\
       --feature "user-auth" \\
       --question "Which authentication providers?" \\
       --answer "OAuth (Google, GitHub) + Email/Password" \\
       --context '{"ambiguity_type": "missing_detail"}'

    # Log a decision
    $0 --log-file "path/to/log.jsonl" \\
       --phase "analysis" \\
       --type "decision" \\
       --question "Proceed to planning?" \\
       --answer "PROCEED" \\
       --context '{"viability_score": "high"}'

    # Log a validation gate
    $0 --log-file "path/to/log.jsonl" \\
       --phase "implementation" \\
       --type "validation_gate" \\
       --question "Phase 2 validation" \\
       --answer "PASS" \\
       --context '{"phase_number": 2}'

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --phase)
            PHASE="$2"
            shift 2
            ;;
        --type)
            TYPE="$2"
            shift 2
            ;;
        --workflow)
            WORKFLOW="$2"
            shift 2
            ;;
        --feature)
            FEATURE="$2"
            shift 2
            ;;
        --question)
            QUESTION="$2"
            shift 2
            ;;
        --answer)
            ANSWER="$2"
            shift 2
            ;;
        --context)
            CONTEXT="$2"
            shift 2
            ;;
        --metadata)
            METADATA="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate required arguments
if [[ -z "$LOG_FILE" ]]; then
    log_error "Required argument missing: --log-file"
    usage
fi

if [[ -z "$PHASE" ]]; then
    log_error "Required argument missing: --phase"
    usage
fi

if [[ -z "$TYPE" ]]; then
    log_error "Required argument missing: --type"
    usage
fi

# Validate type
case $TYPE in
    clarification|decision|approval|validation_gate)
        # Valid type
        ;;
    *)
        log_error "Invalid type: $TYPE. Must be one of: clarification, decision, approval, validation_gate"
        exit 1
        ;;
esac

# Create log file directory if it doesn't exist
LOG_DIR="$(dirname "$LOG_FILE")"
if [[ ! -d "$LOG_DIR" ]]; then
    mkdir -p "$LOG_DIR"
    log_info "Created log directory: $LOG_DIR"
fi

# Generate timestamp in ISO-8601 format
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Escape JSON strings
escape_json() {
    local input="$1"
    # Escape backslashes, quotes, newlines, tabs
    printf '%s' "$input" | \
        sed 's/\\/\\\\/g' | \
        sed 's/"/\\"/g' | \
        sed ':a;N;$!ba;s/\n/\\n/g' | \
        sed 's/\t/\\t/g'
}

# Escape inputs
PHASE_ESC=$(escape_json "$PHASE")
TYPE_ESC=$(escape_json "$TYPE")
WORKFLOW_ESC=$(escape_json "$WORKFLOW")
FEATURE_ESC=$(escape_json "$FEATURE")
QUESTION_ESC=$(escape_json "$QUESTION")
ANSWER_ESC=$(escape_json "$ANSWER")

# Build JSON log entry
LOG_ENTRY=$(cat <<EOF
{"timestamp":"$TIMESTAMP","phase":"$PHASE_ESC","type":"$TYPE_ESC","workflow":"$WORKFLOW_ESC","feature":"$FEATURE_ESC","question":"$QUESTION_ESC","answer":"$ANSWER_ESC","context":$CONTEXT,"metadata":$METADATA}
EOF
)

# Validate JSON (if jq is available)
if command -v jq &> /dev/null; then
    if ! echo "$LOG_ENTRY" | jq . > /dev/null 2>&1; then
        log_error "Invalid JSON generated. Check your --context and --metadata arguments."
        log_error "Generated: $LOG_ENTRY"
        exit 1
    fi
fi

# Append to log file (create if doesn't exist)
echo "$LOG_ENTRY" >> "$LOG_FILE"

# Confirm success
log_success "Human input logged successfully"
log_info "Log file: $LOG_FILE"
log_info "Entry type: $TYPE"

# Show summary if verbose
if [[ "${VERBOSE:-false}" == "true" ]]; then
    log_info "Logged entry:"
    if command -v jq &> /dev/null; then
        echo "$LOG_ENTRY" | jq .
    else
        echo "$LOG_ENTRY"
    fi
fi

# Return success
exit 0

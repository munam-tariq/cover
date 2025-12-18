#!/usr/bin/env bash
# Product Architect - Setup script for product ideation sessions
# Creates output directories for product documentation artifacts

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMANDO_COMMON="$SCRIPT_DIR/../../.commando/scripts/bash/common.sh"

if [ -f "$COMMANDO_COMMON" ]; then
    # shellcheck source=../../.commando/scripts/bash/common.sh
    source "$COMMANDO_COMMON"
else
    # Minimal fallback functions if common.sh not found
    log_info() { echo "[INFO] $1" >&2; }
    log_success() { echo "[SUCCESS] $1" >&2; }
    log_error() { echo "[ERROR] $1" >&2; }
    get_repo_root() { git rev-parse --show-toplevel 2>/dev/null || pwd; }
    ensure_directory() { [ ! -d "$1" ] && mkdir -p "$1"; }
fi

REPO_ROOT=$(get_repo_root)
JSON_MODE=false

# Parse arguments
for arg in "$@"; do
    if [ "$arg" = "--json" ]; then
        JSON_MODE=true
    fi
done

# Product name from arguments (optional)
PRODUCT_NAME="${1:-}"
if [ "$PRODUCT_NAME" = "--json" ]; then
    PRODUCT_NAME=""
fi

# Main function
main() {
    log_info "Setting up Product Architect session..."

    # Define output directories
    local output_base="$REPO_ROOT/docs/product"
    local session_dir="$output_base/sessions"
    local specs_dir="$output_base/specs"
    local research_dir="$output_base/research"

    # Create directories
    ensure_directory "$output_base"
    ensure_directory "$session_dir"
    ensure_directory "$specs_dir"
    ensure_directory "$research_dir"

    # Generate session ID
    local session_id
    session_id=$(date +%Y%m%d-%H%M%S)

    # Define output paths
    local session_file="$session_dir/session-$session_id.md"
    local brief_file="$specs_dir/product-brief.md"
    local roadmap_file="$specs_dir/roadmap.md"
    local features_dir="$specs_dir/features"

    ensure_directory "$features_dir"

    if [ "$JSON_MODE" = true ]; then
        # Output JSON for command consumption
        cat << EOF
{
    "SESSION_ID": "$session_id",
    "OUTPUT_BASE": "$output_base",
    "SESSION_DIR": "$session_dir",
    "SESSION_FILE": "$session_file",
    "SPECS_DIR": "$specs_dir",
    "BRIEF_FILE": "$brief_file",
    "ROADMAP_FILE": "$roadmap_file",
    "FEATURES_DIR": "$features_dir",
    "RESEARCH_DIR": "$research_dir",
    "REPO_ROOT": "$REPO_ROOT"
}
EOF
    else
        log_success "Product Architect session ready"
        echo ""
        echo "Session ID: $session_id"
        echo "Output directory: $output_base"
        echo ""
        echo "Available output locations:"
        echo "  - Session notes: $session_file"
        echo "  - Product brief: $brief_file"
        echo "  - Roadmap: $roadmap_file"
        echo "  - Feature specs: $features_dir/"
        echo "  - Research: $research_dir/"
    fi
}

main "$@"

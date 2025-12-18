#!/usr/bin/env bash
set -euo pipefail

# Feature Builder Setup Script
# Provides environment info and paths for the feature-builder command

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMANDO_COMMON="$SCRIPT_DIR/../../.commando/scripts/bash/common.sh"

if [ -f "$COMMANDO_COMMON" ]; then
    source "$COMMANDO_COMMON"
else
    # Minimal fallback if common.sh not available
    log_info() { echo "[INFO] $1" >&2; }
    log_error() { echo "[ERROR] $1" >&2; }
    get_repo_root() { git rev-parse --show-toplevel 2>/dev/null || pwd; }
fi

REPO_ROOT=$(get_repo_root)
JSON_MODE=false

# Check for --json flag
for arg in "$@"; do
    if [ "$arg" = "--json" ]; then
        JSON_MODE=true
        break
    fi
done

# Main function
main() {
    # Define paths
    local specs_dir="$REPO_ROOT/docs/product/features"
    local architecture_file="$REPO_ROOT/docs/product/architecture/system-overview.md"
    local roadmap_file="$REPO_ROOT/docs/product/roadmap.md"
    local index_file="$REPO_ROOT/docs/product/features/_index.md"
    local progress_file="$REPO_ROOT/docs/product/features/progress.md"

    # Check if progress file exists
    local progress_exists="false"
    if [ -f "$progress_file" ]; then
        progress_exists="true"
    fi

    # Check if index file exists
    local index_exists="false"
    if [ -f "$index_file" ]; then
        index_exists="true"
    fi

    # List available feature specs
    local available_specs=""
    if [ -d "$specs_dir" ]; then
        available_specs=$(find "$specs_dir" -name "spec.md" -type f 2>/dev/null | sed "s|$specs_dir/||g" | sed 's|/spec.md||g' | sort | tr '\n' ',' | sed 's/,$//')
    fi

    # Check for existing source code directories
    local src_dir=""
    local components_dir=""
    local api_dir=""

    if [ -d "$REPO_ROOT/src" ]; then
        src_dir="$REPO_ROOT/src"
    elif [ -d "$REPO_ROOT/app" ]; then
        src_dir="$REPO_ROOT/app"
    fi

    if [ -d "$REPO_ROOT/src/components" ]; then
        components_dir="$REPO_ROOT/src/components"
    elif [ -d "$REPO_ROOT/components" ]; then
        components_dir="$REPO_ROOT/components"
    elif [ -d "$REPO_ROOT/app/components" ]; then
        components_dir="$REPO_ROOT/app/components"
    fi

    if [ -d "$REPO_ROOT/src/app/api" ]; then
        api_dir="$REPO_ROOT/src/app/api"
    elif [ -d "$REPO_ROOT/app/api" ]; then
        api_dir="$REPO_ROOT/app/api"
    elif [ -d "$REPO_ROOT/pages/api" ]; then
        api_dir="$REPO_ROOT/pages/api"
    fi

    # Check for config files
    local has_supabase=false
    local has_tailwind=false
    local has_typescript=false

    [ -f "$REPO_ROOT/supabase/config.toml" ] || [ -d "$REPO_ROOT/supabase" ] && has_supabase=true
    [ -f "$REPO_ROOT/tailwind.config.js" ] || [ -f "$REPO_ROOT/tailwind.config.ts" ] && has_tailwind=true
    [ -f "$REPO_ROOT/tsconfig.json" ] && has_typescript=true

    if [ "$JSON_MODE" = true ]; then
        # Output JSON for command to parse
        cat <<EOF
{
  "REPO_ROOT": "$REPO_ROOT",
  "SPECS_DIR": "$specs_dir",
  "INDEX_FILE": "$index_file",
  "INDEX_EXISTS": "$index_exists",
  "PROGRESS_FILE": "$progress_file",
  "PROGRESS_EXISTS": "$progress_exists",
  "ARCHITECTURE_FILE": "$architecture_file",
  "ROADMAP_FILE": "$roadmap_file",
  "AVAILABLE_SPECS": "$available_specs",
  "SRC_DIR": "$src_dir",
  "COMPONENTS_DIR": "$components_dir",
  "API_DIR": "$api_dir",
  "HAS_SUPABASE": "$has_supabase",
  "HAS_TAILWIND": "$has_tailwind",
  "HAS_TYPESCRIPT": "$has_typescript"
}
EOF
    else
        log_info "Feature Builder Environment"
        echo ""
        echo "Repository Root: $REPO_ROOT"
        echo "Specs Directory: $specs_dir"
        echo ""
        echo "Progress Tracking:"
        echo "  Index file: $index_file (exists: $index_exists)"
        echo "  Progress file: $progress_file (exists: $progress_exists)"
        echo ""
        echo "Available Feature Specs:"
        if [ -n "$available_specs" ]; then
            echo "$available_specs" | tr ',' '\n' | while read -r spec; do
                echo "  - $spec"
            done
        else
            echo "  (no specs found)"
        fi
        echo ""
        echo "Source Directories:"
        echo "  src: ${src_dir:-not found}"
        echo "  components: ${components_dir:-not found}"
        echo "  api: ${api_dir:-not found}"
        echo ""
        echo "Project Configuration:"
        echo "  Supabase: $has_supabase"
        echo "  Tailwind: $has_tailwind"
        echo "  TypeScript: $has_typescript"
    fi
}

main "$@"

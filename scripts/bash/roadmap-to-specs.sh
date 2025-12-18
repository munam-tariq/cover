#!/usr/bin/env bash
set -euo pipefail

# Roadmap to Feature Specs - Setup Script
# Creates directory structure and validates environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

JSON_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_MODE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

log_info() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    if [ "$JSON_MODE" = false ]; then
        echo -e "${RED}[ERROR]${NC} $1"
    fi
}

# Find roadmap file
find_roadmap() {
    local paths=(
        "$REPO_ROOT/docs/product/roadmap.md"
        "$REPO_ROOT/PRODUCT_SPEC.md"
        "$REPO_ROOT/docs/PRODUCT_SPEC.md"
        "$REPO_ROOT/docs/product/PRODUCT_SPEC.md"
    )

    for path in "${paths[@]}"; do
        if [ -f "$path" ]; then
            echo "$path"
            return 0
        fi
    done

    echo ""
    return 1
}

# Create directory structure
create_structure() {
    local base_dir="$REPO_ROOT/docs/product/features"

    # Create main directories
    mkdir -p "$base_dir/infrastructure"
    mkdir -p "$base_dir/core"
    mkdir -p "$base_dir/enhanced"
    mkdir -p "$base_dir/advanced"
    mkdir -p "$REPO_ROOT/docs/product/architecture"

    log_info "Created directory structure at $base_dir"
}

# Main execution
main() {
    local roadmap_file
    roadmap_file=$(find_roadmap) || true

    local features_dir="$REPO_ROOT/docs/product/features"
    local architecture_dir="$REPO_ROOT/docs/product/architecture"

    # Create structure
    create_structure

    if [ "$JSON_MODE" = true ]; then
        # Output JSON for command consumption
        cat << EOF
{
  "REPO_ROOT": "$REPO_ROOT",
  "ROADMAP_FILE": "$roadmap_file",
  "ROADMAP_EXISTS": $([ -n "$roadmap_file" ] && echo "true" || echo "false"),
  "FEATURES_DIR": "$features_dir",
  "ARCHITECTURE_DIR": "$architecture_dir",
  "INFRASTRUCTURE_DIR": "$features_dir/infrastructure",
  "CORE_DIR": "$features_dir/core",
  "ENHANCED_DIR": "$features_dir/enhanced",
  "ADVANCED_DIR": "$features_dir/advanced"
}
EOF
    else
        echo ""
        log_success "Environment ready for roadmap-to-specs"
        echo ""
        echo "Repository Root: $REPO_ROOT"
        echo "Features Directory: $features_dir"
        echo ""

        if [ -n "$roadmap_file" ]; then
            log_success "Roadmap found: $roadmap_file"
        else
            log_warning "No roadmap file found. Expected locations:"
            echo "  - docs/product/roadmap.md"
            echo "  - PRODUCT_SPEC.md"
            echo "  - docs/PRODUCT_SPEC.md"
        fi

        echo ""
        echo "Directory structure created:"
        echo "  docs/product/features/"
        echo "  ├── infrastructure/"
        echo "  ├── core/"
        echo "  ├── enhanced/"
        echo "  └── advanced/"
    fi
}

main "$@"

#!/usr/bin/env bash
# Bootstrap Project - Analyze project structure and prepare for generation
# Phase 1: MVP - Basic scanning and detection

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)

# Parse arguments
JSON_MODE=false
PRESET="standard"

# Parse flags
for arg in "$@"; do
    if [ "$arg" = "--json" ]; then
        JSON_MODE=true
    elif [ "$arg" = "--preset" ]; then
        # Next arg will be the preset value
        continue
    elif [[ "$arg" =~ ^(minimal|standard|complete)$ ]]; then
        PRESET="$arg"
    fi
done

# Main function
main() {
    # Note: We don't validate_environment here because bootstrap
    # should work on projects that don't have commando installed yet

    log_info "Analyzing project structure..."

    # Scan for key configuration files
    local package_json=""
    local requirements_txt=""
    local cargo_toml=""
    local go_mod=""
    local tsconfig_json=""
    local dockerfile=""
    local readme=""
    local config_file="$REPO_ROOT/.commando/project-config.yml"

    # Check for existing bootstrap config
    local has_existing_config=false
    if [ -f "$config_file" ]; then
        has_existing_config=true
        log_info "Found existing bootstrap configuration"
    fi

    # Find package.json
    if [ -f "$REPO_ROOT/package.json" ]; then
        package_json="$REPO_ROOT/package.json"
        log_info "Found: package.json"
    fi

    # Find requirements.txt
    if [ -f "$REPO_ROOT/requirements.txt" ]; then
        requirements_txt="$REPO_ROOT/requirements.txt"
        log_info "Found: requirements.txt"
    fi

    # Find Cargo.toml
    if [ -f "$REPO_ROOT/Cargo.toml" ]; then
        cargo_toml="$REPO_ROOT/Cargo.toml"
        log_info "Found: Cargo.toml"
    fi

    # Find go.mod
    if [ -f "$REPO_ROOT/go.mod" ]; then
        go_mod="$REPO_ROOT/go.mod"
        log_info "Found: go.mod"
    fi

    # Find tsconfig.json
    if [ -f "$REPO_ROOT/tsconfig.json" ]; then
        tsconfig_json="$REPO_ROOT/tsconfig.json"
        log_info "Found: tsconfig.json"
    fi

    # Find Dockerfile
    if [ -f "$REPO_ROOT/Dockerfile" ]; then
        dockerfile="$REPO_ROOT/Dockerfile"
        log_info "Found: Dockerfile"
    fi

    # Find README
    if [ -f "$REPO_ROOT/README.md" ]; then
        readme="$REPO_ROOT/README.md"
        log_info "Found: README.md"
    elif [ -f "$REPO_ROOT/readme.md" ]; then
        readme="$REPO_ROOT/readme.md"
        log_info "Found: readme.md"
    fi

    # Count file types
    local ts_count=0
    local js_count=0
    local py_count=0
    local go_count=0
    local rs_count=0

    # Count TypeScript files (excluding node_modules, .git)
    ts_count=$(find "$REPO_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        2>/dev/null | wc -l | tr -d ' ')

    # Count JavaScript files
    js_count=$(find "$REPO_ROOT" -type f \( -name "*.js" -o -name "*.jsx" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/.git/*" \
        ! -path "*/dist/*" \
        ! -path "*/build/*" \
        2>/dev/null | wc -l | tr -d ' ')

    # Count Python files
    py_count=$(find "$REPO_ROOT" -type f -name "*.py" \
        ! -path "*/.venv/*" \
        ! -path "*/venv/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/.git/*" \
        2>/dev/null | wc -l | tr -d ' ')

    # Count Go files
    go_count=$(find "$REPO_ROOT" -type f -name "*.go" \
        ! -path "*/vendor/*" \
        ! -path "*/.git/*" \
        2>/dev/null | wc -l | tr -d ' ')

    # Count Rust files
    rs_count=$(find "$REPO_ROOT" -type f -name "*.rs" \
        ! -path "*/target/*" \
        ! -path "*/.git/*" \
        2>/dev/null | wc -l | tr -d ' ')

    # Check for common directories
    local has_frontend=false
    local has_backend=false
    local has_infrastructure=false

    # Frontend indicators
    if [ -d "$REPO_ROOT/components" ] || [ -d "$REPO_ROOT/src/components" ] || \
       [ -d "$REPO_ROOT/pages" ] || [ -d "$REPO_ROOT/app" ]; then
        has_frontend=true
    fi

    # Backend indicators
    if [ -d "$REPO_ROOT/api" ] || [ -d "$REPO_ROOT/src/api" ] || \
       [ -d "$REPO_ROOT/routes" ] || [ -d "$REPO_ROOT/server" ]; then
        has_backend=true
    fi

    # Infrastructure indicators
    if [ -f "$REPO_ROOT/docker-compose.yml" ] || [ -d "$REPO_ROOT/kubernetes" ] || \
       [ -d "$REPO_ROOT/terraform" ] || [ -f "$dockerfile" ]; then
        has_infrastructure=true
    fi

    # Output JSON
    if [ "$JSON_MODE" = true ]; then
        # Build JSON manually (bash 3.2 compatible)
        local json="{"
        json+="\"repo_root\":\"$REPO_ROOT\","
        json+="\"preset\":\"$PRESET\","
        json+="\"has_existing_config\":$has_existing_config,"
        json+="\"config_file\":\"$config_file\","
        json+="\"detected_files\":{"
        json+="\"package_json\":\"$package_json\","
        json+="\"requirements_txt\":\"$requirements_txt\","
        json+="\"cargo_toml\":\"$cargo_toml\","
        json+="\"go_mod\":\"$go_mod\","
        json+="\"tsconfig_json\":\"$tsconfig_json\","
        json+="\"dockerfile\":\"$dockerfile\","
        json+="\"readme\":\"$readme\""
        json+="},"
        json+="\"file_counts\":{"
        json+="\"typescript\":$ts_count,"
        json+="\"javascript\":$js_count,"
        json+="\"python\":$py_count,"
        json+="\"go\":$go_count,"
        json+="\"rust\":$rs_count"
        json+="},"
        json+="\"directories\":{"
        json+="\"has_frontend\":$has_frontend,"
        json+="\"has_backend\":$has_backend,"
        json+="\"has_infrastructure\":$has_infrastructure"
        json+="}"
        json+="}"

        echo "$json"
    else
        log_success "Project scan complete"
        echo ""
        echo "Detected Files:"
        [ -n "$package_json" ] && echo "  - package.json"
        [ -n "$requirements_txt" ] && echo "  - requirements.txt"
        [ -n "$cargo_toml" ] && echo "  - Cargo.toml"
        [ -n "$go_mod" ] && echo "  - go.mod"
        [ -n "$tsconfig_json" ] && echo "  - tsconfig.json"
        [ -n "$dockerfile" ] && echo "  - Dockerfile"
        [ -n "$readme" ] && echo "  - README.md"
        echo ""
        echo "File Counts:"
        echo "  - TypeScript: $ts_count"
        echo "  - JavaScript: $js_count"
        echo "  - Python: $py_count"
        echo "  - Go: $go_count"
        echo "  - Rust: $rs_count"
        echo ""
        echo "Directory Indicators:"
        [ "$has_frontend" = true ] && echo "  - Frontend components detected"
        [ "$has_backend" = true ] && echo "  - Backend API detected"
        [ "$has_infrastructure" = true ] && echo "  - Infrastructure configs detected"
    fi
}

# Run main function
main "$@"

#!/usr/bin/env bash
# Template Loader - Load and parse bootstrap templates
# Phase 2: Template Library

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)
TEMPLATES_DIR="$REPO_ROOT/config/bootstrap-templates"

# Parse YAML to JSON using Python
parse_yaml_to_json() {
    local yaml_file="$1"

    if ! command_exists python3; then
        log_error "Python 3 is required for YAML parsing"
        return 1
    fi

    python3 <<EOF
import yaml
import json
import sys

try:
    with open('$yaml_file', 'r') as f:
        data = yaml.safe_load(f)
        print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error parsing $yaml_file: {e}", file=sys.stderr)
    sys.exit(1)
EOF
}

# Load all templates from a directory
load_templates_from_dir() {
    local dir="$1"
    local category="$2"  # project-types, tech-stacks, or domains
    local output_file="$3"

    log_info "Loading templates from: $dir"

    local template_count=0
    local templates_json="{"

    # Find all .yml files in directory
    for template_file in "$dir"/*.yml; do
        if [ -f "$template_file" ]; then
            local template_name
            template_name=$(basename "$template_file" .yml)

            log_info "  Parsing: $template_name"

            # Parse YAML to JSON
            local template_json
            if template_json=$(parse_yaml_to_json "$template_file"); then
                # Add to templates object
                if [ $template_count -gt 0 ]; then
                    templates_json+=","
                fi

                # Escape the template_json for embedding
                local escaped_json
                escaped_json=$(echo "$template_json" | sed 's/"/\\"/g' | tr '\n' ' ')

                templates_json+="\"$template_name\":$template_json"
                template_count=$((template_count + 1))
            else
                log_error "Failed to parse template: $template_file"
            fi
        fi
    done

    templates_json+="}"

    # Write to output file
    echo "$templates_json" > "$output_file"

    log_success "Loaded $template_count $category templates"
}

# Load all templates and create cache
load_all_templates() {
    local cache_dir="$REPO_ROOT/.commando/cache"
    mkdir -p "$cache_dir"

    local cache_file="$cache_dir/bootstrap-templates.json"

    log_info "Loading all bootstrap templates..."

    # Check if templates directory exists
    if [ ! -d "$TEMPLATES_DIR" ]; then
        log_error "Templates directory not found: $TEMPLATES_DIR"
        return 1
    fi

    # Load each category
    local project_types_file="$cache_dir/project-types.json"
    local tech_stacks_file="$cache_dir/tech-stacks.json"
    local domains_file="$cache_dir/domains.json"

    # Load project-types
    if [ -d "$TEMPLATES_DIR/project-types" ]; then
        load_templates_from_dir "$TEMPLATES_DIR/project-types" "project-types" "$project_types_file"
    fi

    # Load tech-stacks
    if [ -d "$TEMPLATES_DIR/tech-stacks" ]; then
        load_templates_from_dir "$TEMPLATES_DIR/tech-stacks" "tech-stacks" "$tech_stacks_file"
    fi

    # Load domains
    if [ -d "$TEMPLATES_DIR/domains" ]; then
        load_templates_from_dir "$TEMPLATES_DIR/domains" "domains" "$domains_file"
    fi

    # Combine into single cache file
    python3 <<EOF
import json

cache = {
    "project_types": {},
    "tech_stacks": {},
    "domains": {},
    "loaded_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}

# Load project types
try:
    with open('$project_types_file', 'r') as f:
        cache['project_types'] = json.load(f)
except:
    pass

# Load tech stacks
try:
    with open('$tech_stacks_file', 'r') as f:
        cache['tech_stacks'] = json.load(f)
except:
    pass

# Load domains
try:
    with open('$domains_file', 'r') as f:
        cache['domains'] = json.load(f)
except:
    pass

# Write combined cache
with open('$cache_file', 'w') as f:
    json.dump(cache, f, indent=2)

print(f"Templates cached to: $cache_file")
EOF

    log_success "All templates loaded and cached"
    echo "$cache_file"
}

# Get cached templates
get_cached_templates() {
    local cache_file="$REPO_ROOT/.commando/cache/bootstrap-templates.json"

    if [ ! -f "$cache_file" ]; then
        log_warning "No template cache found, loading templates..."
        cache_file=$(load_all_templates)
    fi

    cat "$cache_file"
}

# Clear template cache
clear_template_cache() {
    local cache_dir="$REPO_ROOT/.commando/cache"

    if [ -d "$cache_dir" ]; then
        rm -f "$cache_dir"/bootstrap-templates.json
        rm -f "$cache_dir"/project-types.json
        rm -f "$cache_dir"/tech-stacks.json
        rm -f "$cache_dir"/domains.json
        log_success "Template cache cleared"
    fi
}

# Main function
main() {
    local command="${1:-load}"

    case "$command" in
        load)
            load_all_templates
            ;;
        get)
            get_cached_templates
            ;;
        clear)
            clear_template_cache
            ;;
        *)
            echo "Usage: $0 {load|get|clear}"
            echo "  load  - Load all templates and create cache"
            echo "  get   - Get cached templates (loads if not cached)"
            echo "  clear - Clear template cache"
            exit 1
            ;;
    esac
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

#!/usr/bin/env bash
# Batch Generator - Generate commands and agents from templates
# Phase 2: Template Library (MVP - simplified version)

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Generate commands from matched templates
generate_commands() {
    local matched_json="$1"
    local dry_run="${2:-false}"

    log_info "Generating commands..."

    local commands
    commands=$(echo "$matched_json" | jq -c '.suggested_commands[]')

    local count=0
    local total
    total=$(echo "$matched_json" | jq '.total_commands')

    echo "$commands" | while IFS= read -r cmd; do
        count=$((count + 1))

        local cmd_id
        local cmd_name
        local cmd_domain
        cmd_id=$(echo "$cmd" | jq -r '.id')
        cmd_name=$(echo "$cmd" | jq -r '.name')
        cmd_domain=$(echo "$cmd" | jq -r '.domain')

        if [ "$dry_run" = "true" ]; then
            log_info "  [$count/$total] Would generate: /$cmd_domain:$cmd_id"
        else
            log_info "  [$count/$total] Generating: /$cmd_domain:$cmd_id"
            # TODO: Call /meta:create-command with template data
            # For MVP, we just log what would be created
        fi
    done

    log_success "Commands generation complete"
}

# Generate agents from matched templates
generate_agents() {
    local matched_json="$1"
    local dry_run="${2:-false}"

    log_info "Generating agents..."

    local agents
    agents=$(echo "$matched_json" | jq -c '.suggested_agents[]')

    local count=0
    local total
    total=$(echo "$matched_json" | jq '.total_agents')

    echo "$agents" | while IFS= read -r agent; do
        count=$((count + 1))

        local agent_id
        local agent_name
        local agent_category
        agent_id=$(echo "$agent" | jq -r '.id')
        agent_name=$(echo "$agent" | jq -r '.name')
        agent_category=$(echo "$agent" | jq -r '.category')

        if [ "$dry_run" = "true" ]; then
            log_info "  [$count/$total] Would generate: $agent_id ($agent_category)"
        else
            log_info "  [$count/$total] Generating: $agent_id ($agent_category)"
            # TODO: Call /meta:create-agent with template data
            # For MVP, we just log what would be created
        fi
    done

    log_success "Agents generation complete"
}

# Display generation summary
display_summary() {
    local matched_json="$1"

    local total_commands
    local total_agents
    total_commands=$(echo "$matched_json" | jq '.total_commands')
    total_agents=$(echo "$matched_json" | jq '.total_agents')

    echo ""
    echo "✅ Bootstrap Complete!"
    echo "=========================================="
    echo ""
    echo "Generated Items:"
    echo "  - $total_commands commands"
    echo "  - $total_agents agents"
    echo ""
    echo "Next Steps:"
    echo "  1. Review generated commands: ls .claude/commands/"
    echo "  2. Test a command: e.g., /frontend:review-component <file>"
    echo "  3. Customize agents: Edit config/roles/*.yml"
    echo "  4. Re-run to detect new tech: /meta:bootstrap-project"
    echo ""
}

# Main function
main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <matched_templates_json> [--dry-run]"
        exit 1
    fi

    local matched_file="$1"
    local dry_run=false

    if [ "${2:-}" = "--dry-run" ]; then
        dry_run=true
    fi

    if [ ! -f "$matched_file" ]; then
        log_error "Matched templates file not found: $matched_file"
        exit 1
    fi

    local matched_json
    matched_json=$(cat "$matched_file")

    # Generate commands
    generate_commands "$matched_json" "$dry_run"

    # Generate agents
    generate_agents "$matched_json" "$dry_run"

    # Display summary
    display_summary "$matched_json"
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

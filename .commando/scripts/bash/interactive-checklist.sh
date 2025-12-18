#!/usr/bin/env bash
# Interactive Checklist - Display suggestions and get user selections
# Phase 2: Template Library

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Display detection summary
display_detection_summary() {
    local matched_json="$1"

    echo ""
    echo "🔍 Project Analysis Complete"
    echo "=========================================="
    echo ""

    # Extract project type
    local project_type
    project_type=$(echo "$matched_json" | jq -r '.matched_project_type // "unknown"')

    echo "Project Type: $project_type"
    echo ""

    # Extract matched tech stacks
    echo "Tech Stack Detected:"
    echo "$matched_json" | jq -r '.matched_tech_stacks[]' | while read -r tech; do
        echo "  - $tech"
    done
    echo ""
}

# Display commands checklist
display_commands_checklist() {
    local matched_json="$1"

    local total_commands
    total_commands=$(echo "$matched_json" | jq '.total_commands')

    echo "📋 Suggested Commands ($total_commands):"
    echo "=========================================="
    echo ""

    # Group commands by domain
    local domains
    domains=$(echo "$matched_json" | jq -r '.suggested_commands[].domain' | sort -u)

    echo "$domains" | while read -r domain; do
        local domain_commands
        domain_commands=$(echo "$matched_json" | jq -c ".suggested_commands[] | select(.domain == \"$domain\")")

        if [ -n "$domain_commands" ]; then
            local count
            count=$(echo "$domain_commands" | wc -l | tr -d ' ')
            echo "  $domain ($count):"

            local index=1
            echo "$domain_commands" | while IFS= read -r cmd; do
                local cmd_id
                local cmd_name
                local cmd_desc
                cmd_id=$(echo "$cmd" | jq -r '.id')
                cmd_name=$(echo "$cmd" | jq -r '.name')
                cmd_desc=$(echo "$cmd" | jq -r '.description')

                echo "    [$index] /$domain:$cmd_id"
                echo "        $cmd_desc"
                index=$((index + 1))
            done
            echo ""
        fi
    done
}

# Display agents checklist
display_agents_checklist() {
    local matched_json="$1"

    local total_agents
    total_agents=$(echo "$matched_json" | jq '.total_agents')

    echo "🤖 Suggested Agents ($total_agents):"
    echo "=========================================="
    echo ""

    # Group agents by category
    local categories
    categories=$(echo "$matched_json" | jq -r '.suggested_agents[].category' | sort -u)

    echo "$categories" | while read -r category; do
        local category_agents
        category_agents=$(echo "$matched_json" | jq -c ".suggested_agents[] | select(.category == \"$category\")")

        if [ -n "$category_agents" ]; then
            local count
            count=$(echo "$category_agents" | wc -l | tr -d ' ')
            echo "  $category ($count):"

            local index=1
            echo "$category_agents" | while IFS= read -r agent; do
                local agent_id
                local agent_name
                local agent_domain
                agent_id=$(echo "$agent" | jq -r '.id')
                agent_name=$(echo "$agent" | jq -r '.name')
                agent_domain=$(echo "$agent" | jq -r '.domain')

                echo "    [$index] $agent_id ($agent_domain)"
                echo "        $agent_name"
                index=$((index + 1))
            done
            echo ""
        fi
    done
}

# Get user confirmation
get_user_confirmation() {
    local total_commands="$1"
    local total_agents="$2"

    echo "=========================================="
    echo ""
    echo "Generate $total_commands commands and $total_agents agents?"
    echo ""
    echo "Options:"
    echo "  [y] Yes - Generate all suggested items"
    echo "  [n] No  - Cancel bootstrap"
    echo ""

    read -r -p "Your choice (y/n): " choice

    case "$choice" in
        y|Y|yes|Yes|YES)
            return 0
            ;;
        n|N|no|No|NO)
            return 1
            ;;
        *)
            log_warning "Invalid choice. Please enter 'y' or 'n'"
            get_user_confirmation "$total_commands" "$total_agents"
            ;;
    esac
}

# Display complete checklist and get user input
show_interactive_checklist() {
    local matched_json="$1"

    # Display detection summary
    display_detection_summary "$matched_json"

    # Display commands
    display_commands_checklist "$matched_json"

    # Display agents
    display_agents_checklist "$matched_json"

    # Get confirmation
    local total_commands
    local total_agents
    total_commands=$(echo "$matched_json" | jq '.total_commands')
    total_agents=$(echo "$matched_json" | jq '.total_agents')

    if get_user_confirmation "$total_commands" "$total_agents"; then
        echo "confirmed"
    else
        echo "cancelled"
    fi
}

# Main function
main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <matched_templates_json>"
        exit 1
    fi

    local matched_file="$1"

    if [ ! -f "$matched_file" ]; then
        log_error "Matched templates file not found: $matched_file"
        exit 1
    fi

    local matched_json
    matched_json=$(cat "$matched_file")

    show_interactive_checklist "$matched_json"
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

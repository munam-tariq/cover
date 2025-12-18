#!/usr/bin/env bash
# Script to create a new agent from template

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)

# Parse arguments
JSON_MODE=false
if parse_json_flag "$@"; then
    JSON_MODE=true
fi

# Extract agent data from arguments
AGENT_DATA=""
if [ "$JSON_MODE" = true ]; then
    # In JSON mode, we expect the agent data to be passed as the last argument
    AGENT_DATA="${*: -1}"
fi

# Function to create agent structure
create_agent() {
    local agent_id="$1"
    local domain="$2"
    local category="$3"
    local description="$4"

    local agent_dir="$REPO_ROOT/.claude/agents/$domain"
    local agent_file="$agent_dir/$agent_id.md"
    local roles_file="$REPO_ROOT/config/roles/${category}.yml"

    # Ensure directories exist
    ensure_directory "$agent_dir"
    ensure_directory "$(dirname "$roles_file")"

    # Check if agent already exists
    if [ -f "$agent_file" ]; then
        log_error "Agent already exists: $agent_file"
        return 1
    fi

    # Generate agent file path
    local agent_path="$agent_file"

    # Return paths in JSON or plain format
    if [ "$JSON_MODE" = true ]; then
        # Build JSON manually (bash 3.2 compatible)
        local json="{"
        json+="\"AGENT_FILE\":\"$agent_path\","
        json+="\"AGENT_DIR\":\"$agent_dir\","
        json+="\"ROLES_FILE\":\"$roles_file\","
        json+="\"DOMAIN\":\"$domain\","
        json+="\"CATEGORY\":\"$category\","
        json+="\"AGENT_ID\":\"$agent_id\","
        json+="\"DESCRIPTION\":\"$description\""
        json+="}"
        echo "$json"
    else
        log_success "Agent structure ready"
        echo "Agent file: $agent_path"
        echo "Roles file: $roles_file"
        echo "Domain: $domain"
        echo "Category: $category"
        echo "Agent ID: $agent_id"
    fi

    return 0
}

# Main execution
main() {
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi

    # For JSON mode, parse the agent data
    if [ "$JSON_MODE" = true ]; then
        log_info "Creating agent structure..."

        # Parse JSON using basic shell tools (bash 3.2 compatible)
        local agent_id=$(echo "$AGENT_DATA" | grep -o '"agent_id":"[^"]*"' | sed 's/"agent_id":"\(.*\)"/\1/' || echo "example-agent")
        local domain=$(echo "$AGENT_DATA" | grep -o '"domain":"[^"]*"' | sed 's/"domain":"\(.*\)"/\1/' || echo "meta")
        local category=$(echo "$AGENT_DATA" | grep -o '"category":"[^"]*"' | sed 's/"category":"\(.*\)"/\1/' || echo "implementers")
        local description=$(echo "$AGENT_DATA" | grep -o '"description":"[^"]*"' | sed 's/"description":"\(.*\)"/\1/' || echo "Example agent")

        log_info "Parsed: agent_id=$agent_id, domain=$domain, category=$category"

        create_agent "$agent_id" "$domain" "$category" "$description"
    else
        log_error "This script requires --json flag"
        log_error "Usage: $0 --json \"{agent_data}\""
        exit 1
    fi
}

# Run main function
main "$@"

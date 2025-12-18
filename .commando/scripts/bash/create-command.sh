#!/usr/bin/env bash
# Script to create a new command from template

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

# Extract command data from arguments
COMMAND_DATA=""
if [ "$JSON_MODE" = true ]; then
    # In JSON mode, we expect the command data to be passed as the last argument
    COMMAND_DATA="${*: -1}"
fi

# Function to create command structure
create_command() {
    local command_id="$1"
    local domain="$2"
    local description="$3"
    local script_name="$4"

    local command_dir="$REPO_ROOT/.claude/commands/$domain"
    local command_file="$command_dir/$command_id.md"
    local script_dir="$REPO_ROOT/scripts/bash"
    local script_file="$script_dir/$script_name.sh"

    # Ensure directories exist
    ensure_directory "$command_dir"
    ensure_directory "$script_dir"

    # Check if command already exists
    if [ -f "$command_file" ]; then
        log_error "Command already exists: $command_file"
        return 1
    fi

    # Generate command file path
    local command_path="$command_file"
    local script_path="$script_file"

    # Return paths in JSON or plain format
    if [ "$JSON_MODE" = true ]; then
        # Build JSON manually (bash 3.2 compatible)
        local json="{"
        json+="\"COMMAND_FILE\":\"$command_path\","
        json+="\"COMMAND_DIR\":\"$command_dir\","
        json+="\"SCRIPT_FILE\":\"$script_path\","
        json+="\"SCRIPT_DIR\":\"$script_dir\","
        json+="\"DOMAIN\":\"$domain\","
        json+="\"COMMAND_ID\":\"$command_id\","
        json+="\"DESCRIPTION\":\"$description\","
        json+="\"SCRIPT_NAME\":\"$script_name\""
        json+="}"
        echo "$json"
    else
        log_success "Command structure ready"
        echo "Command file: $command_path"
        echo "Script file: $script_path"
        echo "Domain: $domain"
        echo "Command ID: $command_id"
    fi

    return 0
}

# Main execution
main() {
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi

    # For JSON mode, parse the command data
    if [ "$JSON_MODE" = true ]; then
        # Expected format: {"command_id":"...","domain":"...","description":"...","script_name":"..."}
        log_info "Creating command structure..."

        # Parse JSON using basic shell tools (bash 3.2 compatible)
        # Extract JSON fields using grep and sed
        local command_id=$(echo "$COMMAND_DATA" | grep -o '"command_id":"[^"]*"' | sed 's/"command_id":"\(.*\)"/\1/' || echo "example-command")
        local domain=$(echo "$COMMAND_DATA" | grep -o '"domain":"[^"]*"' | sed 's/"domain":"\(.*\)"/\1/' || echo "meta")
        local description=$(echo "$COMMAND_DATA" | grep -o '"description":"[^"]*"' | sed 's/"description":"\(.*\)"/\1/' || echo "Example command")
        local script_name=$(echo "$COMMAND_DATA" | grep -o '"script_name":"[^"]*"' | sed 's/"script_name":"\(.*\)"/\1/' || echo "$command_id")

        log_info "Parsed: command_id=$command_id, domain=$domain"

        create_command "$command_id" "$domain" "$description" "$script_name"
    else
        log_error "This script requires --json flag"
        log_error "Usage: $0 --json \"{command_data}\""
        exit 1
    fi
}

# Run main function
main "$@"

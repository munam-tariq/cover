#!/usr/bin/env bash
set -euo pipefail

# Co-Founder Command Setup Script
# This script prepares context for the co-founder command

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
JSON_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --json)
            JSON_MODE=true
            shift
            ;;
    esac
done

main() {
    # Check for existing venture context files
    local venture_file=""
    local notes_dir=""

    if [ -f "$REPO_ROOT/docs/VENTURE.md" ]; then
        venture_file="$REPO_ROOT/docs/VENTURE.md"
    fi

    if [ -d "$REPO_ROOT/docs/cofounder-notes" ]; then
        notes_dir="$REPO_ROOT/docs/cofounder-notes"
    fi

    if [ "$JSON_MODE" = true ]; then
        cat <<EOF
{
    "REPO_ROOT": "$REPO_ROOT",
    "VENTURE_FILE": "$venture_file",
    "NOTES_DIR": "$notes_dir",
    "STATUS": "ready"
}
EOF
    else
        echo "Co-Founder Command Ready"
        echo "========================"
        if [ -n "$venture_file" ]; then
            echo "Found venture context: $venture_file"
        else
            echo "No venture context file found (docs/VENTURE.md)"
        fi
        if [ -n "$notes_dir" ]; then
            echo "Found notes directory: $notes_dir"
        fi
    fi
}

main "$@"

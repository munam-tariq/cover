#!/usr/bin/env bash
# Common utility functions for meta-framework scripts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Get repository root
get_repo_root() {
    git rev-parse --show-toplevel 2>/dev/null || pwd
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate required tools
validate_tools() {
    local required_tools=("$@")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command_exists "$tool"; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi

    return 0
}

# Create directory if it doesn't exist
ensure_directory() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_info "Created directory: $dir"
    fi
}

# Validate file exists
validate_file_exists() {
    local file="$1"
    local description="${2:-File}"

    if [ ! -f "$file" ]; then
        log_error "$description not found: $file"
        return 1
    fi

    return 0
}

# Generate a slug from text (kebab-case)
generate_slug() {
    local text="$1"
    echo "$text" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//'
}

# Get current date in ISO format
get_date() {
    date +%Y-%m-%d
}

# Get current timestamp
get_timestamp() {
    date +%Y-%m-%d-%H%M%S
}

# Output JSON with proper escaping
json_output() {
    local -n data=$1
    local json="{"
    local first=true

    for key in "${!data[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            json+=","
        fi

        # Escape quotes and backslashes in values
        local escaped_value="${data[$key]//\\/\\\\}"
        escaped_value="${escaped_value//\"/\\\"}"

        json+="\"$key\":\"$escaped_value\""
    done

    json+="}"
    echo "$json"
}

# Parse command line arguments for JSON mode
parse_json_flag() {
    for arg in "$@"; do
        if [ "$arg" = "--json" ]; then
            return 0
        fi
    done
    return 1
}

# Extract argument value after a flag
extract_arg_value() {
    local flag="$1"
    shift
    local args=("$@")

    for i in "${!args[@]}"; do
        if [ "${args[$i]}" = "$flag" ]; then
            if [ $((i + 1)) -lt ${#args[@]} ]; then
                echo "${args[$((i + 1))]}"
                return 0
            fi
        fi
    done

    return 1
}

# Validate JSON mode output
validate_json_mode() {
    if parse_json_flag "$@"; then
        # Redirect info/warning messages to stderr
        # Only JSON should go to stdout
        return 0
    fi
    return 1
}

# Check if we're in a git repository
is_git_repo() {
    git rev-parse --is-inside-work-tree >/dev/null 2>&1
}

# Get current git branch
get_current_branch() {
    if is_git_repo; then
        git branch --show-current
    else
        echo ""
    fi
}

# Sanitize filename
sanitize_filename() {
    local filename="$1"
    echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g' | sed 's/--*/-/g'
}

# Copy template and replace placeholders
copy_template() {
    local template_path="$1"
    local output_path="$2"
    shift 2
    local -n replacements=$1

    if [ ! -f "$template_path" ]; then
        log_error "Template not found: $template_path"
        return 1
    fi

    # Read template content
    local content
    content=$(cat "$template_path")

    # Replace placeholders
    for key in "${!replacements[@]}"; do
        content="${content//\[$key\]/${replacements[$key]}}"
    done

    # Write output
    echo "$content" > "$output_path"
    log_success "Created: $output_path"

    return 0
}

# Validate required environment
validate_environment() {
    local repo_root
    repo_root=$(get_repo_root)

    # Check for essential directories
    local essential_dirs=(
        "$repo_root/.commando/config"
        "$repo_root/.commando/config/templates"
        "$repo_root/.claude/commands"
    )

    for dir in "${essential_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log_error "Required directory not found: $dir"
            log_error "Are you in a project with Commando installed?"
            log_error "Run the installer first: curl -fsSL https://url/to/install.sh | bash"
            return 1
        fi
    done

    return 0
}

# Export functions
export -f log_info
export -f log_success
export -f log_warning
export -f log_error
export -f get_repo_root
export -f command_exists
export -f validate_tools
export -f ensure_directory
export -f validate_file_exists
export -f generate_slug
export -f get_date
export -f get_timestamp
export -f json_output
export -f parse_json_flag
export -f extract_arg_value
export -f validate_json_mode
export -f is_git_repo
export -f get_current_branch
export -f sanitize_filename
export -f copy_template
export -f validate_environment

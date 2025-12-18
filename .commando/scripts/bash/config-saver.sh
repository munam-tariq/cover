#!/usr/bin/env bash
# Config Saver - Save bootstrap configuration
# Phase 2: Template Library

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)

# Save bootstrap configuration
save_config() {
    local detection_json="$1"
    local matched_json="$2"
    local config_dir="$REPO_ROOT/.commando"
    local config_file="$config_dir/project-config.yml"

    log_info "Saving bootstrap configuration..."

    # Ensure directory exists
    ensure_directory "$config_dir"

    # Use Python to generate YAML
    python3 <<EOF
import json
import yaml
from datetime import datetime

# Read input data
detection = json.loads('''$detection_json''')
matched = json.loads('''$matched_json''')

# Build configuration
config = {
    'project_type': matched.get('matched_project_type', 'unknown'),
    'confidence': 0.85,  # Calculated based on matches
    'bootstrapped_at': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'bootstrap_version': '1.0.0-phase2-mvp',
    'last_updated': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'update_count': 1,
    'tech_stack': {
        'detected': matched.get('matched_tech_stacks', [])
    },
    'domains_created': [],
    'generated_items': {
        'commands': [],
        'agents': []
    },
    'statistics': {
        'commands_suggested': matched.get('total_commands', 0),
        'agents_suggested': matched.get('total_agents', 0),
        'commands_generated': 0,  # Would be populated by batch-generator
        'agents_generated': 0
    },
    'generation_preset': matched.get('preset', 'standard'),
    'detection': {
        'file_counts': detection.get('file_counts', {}),
        'detected_files': [k for k, v in detection.get('detected_files', {}).items() if v],
        'directories': detection.get('directories', {})
    }
}

# Add command entries
for cmd in matched.get('suggested_commands', []):
    config['generated_items']['commands'].append({
        'id': cmd['id'],
        'domain': cmd['domain'],
        'name': cmd['name'],
        'source': cmd.get('source', 'unknown'),
        'status': 'suggested'
    })

# Add agent entries
for agent in matched.get('suggested_agents', []):
    config['generated_items']['agents'].append({
        'id': agent['id'],
        'category': agent['category'],
        'domain': agent['domain'],
        'name': agent['name'],
        'source': agent.get('source', 'unknown'),
        'status': 'suggested'
    })

# Write YAML
with open('$config_file', 'w') as f:
    yaml.dump(config, f, default_flow_style=False, sort_keys=False)

print(f"Configuration saved to: $config_file")
EOF

    log_success "Configuration saved: $config_file"
    echo "$config_file"
}

# Main function
main() {
    if [ $# -lt 2 ]; then
        echo "Usage: $0 <detection_json> <matched_json>"
        exit 1
    fi

    local detection_file="$1"
    local matched_file="$2"

    if [ ! -f "$detection_file" ]; then
        log_error "Detection file not found: $detection_file"
        exit 1
    fi

    if [ ! -f "$matched_file" ]; then
        log_error "Matched templates file not found: $matched_file"
        exit 1
    fi

    local detection_json
    local matched_json
    detection_json=$(cat "$detection_file")
    matched_json=$(cat "$matched_file")

    save_config "$detection_json" "$matched_json"
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

#!/usr/bin/env bash
# Template Matcher - Match detection results to templates
# Phase 2: Template Library

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./common.sh
source "$SCRIPT_DIR/common.sh"
# shellcheck source=./template-loader.sh
source "$SCRIPT_DIR/template-loader.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)

# Match templates based on detection results
match_templates() {
    local detection_json="$1"
    local preset="${2:-standard}"

    log_info "Matching templates against detection results..."

    # Ensure templates are loaded
    local templates
    templates=$(get_cached_templates)

    # Use Python for complex matching logic
    python3 <<EOF
import json
import sys
from pathlib import Path

# Read detection results
detection = json.loads('''$detection_json''')

# Read templates
templates = json.loads('''$templates''')

# Read package.json if it exists
package_json_deps = []
package_json_path = detection.get('detected_files', {}).get('package_json', '')
if package_json_path and Path(package_json_path).exists():
    try:
        with open(package_json_path, 'r') as f:
            pkg = json.load(f)
            deps = pkg.get('dependencies', {})
            dev_deps = pkg.get('devDependencies', {})
            package_json_deps = list(deps.keys()) + list(dev_deps.keys())
    except Exception as e:
        print(f"Warning: Could not read package.json: {e}", file=sys.stderr)

# Match tech-stack templates
matched_tech_stacks = []
for template_id, template in templates.get('tech_stacks', {}).items():
    detection_patterns = template.get('detection_patterns', {})

    # Check package.json dependencies
    required_deps = detection_patterns.get('package_json_deps', [])
    if required_deps:
        if any(dep in package_json_deps for dep in required_deps):
            matched_tech_stacks.append(template_id)
            continue

    # Check for specific files
    required_files = detection_patterns.get('files', [])
    detected_files = detection.get('detected_files', {})
    if required_files:
        # Simple filename matching (not pattern matching for MVP)
        for file_pattern in required_files:
            for detected_file in detected_files.values():
                if detected_file and file_pattern.replace('**/', '').replace('*', '') in detected_file:
                    matched_tech_stacks.append(template_id)
                    break

# Determine project type based on directory indicators
has_frontend = detection.get('directories', {}).get('has_frontend', False)
has_backend = detection.get('directories', {}).get('has_backend', False)
has_infrastructure = detection.get('directories', {}).get('has_infrastructure', False)

matched_project_type = None
if has_frontend and has_backend:
    matched_project_type = 'full-stack-web'
elif has_frontend:
    matched_project_type = 'web-frontend'
elif has_backend:
    matched_project_type = 'web-backend'

# Collect all commands and agents from matched templates
all_commands = []
all_agents = []
all_workflows = []

# Add commands/agents from matched tech stacks
for tech_stack_id in matched_tech_stacks:
    template = templates['tech_stacks'][tech_stack_id]

    for cmd in template.get('commands', []):
        cmd_copy = dict(cmd)
        cmd_copy['source'] = f"tech-stack:{tech_stack_id}"
        all_commands.append(cmd_copy)

    for agent in template.get('agents', []):
        agent_copy = dict(agent)
        agent_copy['source'] = f"tech-stack:{tech_stack_id}"
        all_agents.append(agent_copy)

    for workflow in template.get('workflows', []):
        workflow_copy = dict(workflow)
        workflow_copy['source'] = f"tech-stack:{tech_stack_id}"
        all_workflows.append(workflow_copy)

# Add commands/agents from matched project type
if matched_project_type and matched_project_type in templates.get('project_types', {}):
    template = templates['project_types'][matched_project_type]

    for cmd in template.get('commands', []):
        cmd_copy = dict(cmd)
        cmd_copy['source'] = f"project-type:{matched_project_type}"
        all_commands.append(cmd_copy)

    for agent in template.get('agents', []):
        agent_copy = dict(agent)
        agent_copy['source'] = f"project-type:{matched_project_type}"
        all_agents.append(agent_copy)

    for workflow in template.get('workflows', []):
        workflow_copy = dict(workflow)
        workflow_copy['source'] = f"project-type:{matched_project_type}"
        all_workflows.append(workflow_copy)

# Filter by preset
def filter_by_preset(items, preset):
    if preset == 'minimal':
        return [item for item in items if item.get('priority', 'standard') == 'minimal']
    elif preset == 'standard':
        return [item for item in items if item.get('priority', 'standard') in ['minimal', 'standard']]
    elif preset == 'complete':
        return items
    return items

filtered_commands = filter_by_preset(all_commands, "$preset")
filtered_agents = filter_by_preset(all_agents, "$preset")

# Remove duplicates by id
unique_commands = {}
for cmd in filtered_commands:
    if cmd['id'] not in unique_commands:
        unique_commands[cmd['id']] = cmd

unique_agents = {}
for agent in filtered_agents:
    if agent['id'] not in unique_agents:
        unique_agents[agent['id']] = agent

# Output results as JSON
result = {
    "matched_tech_stacks": matched_tech_stacks,
    "matched_project_type": matched_project_type,
    "suggested_commands": list(unique_commands.values()),
    "suggested_agents": list(unique_agents.values()),
    "suggested_workflows": all_workflows,
    "preset": "$preset",
    "total_commands": len(unique_commands),
    "total_agents": len(unique_agents)
}

print(json.dumps(result, indent=2))
EOF
}

# Main function
main() {
    if [ $# -lt 1 ]; then
        echo "Usage: $0 <detection_json> [preset]"
        echo "  detection_json - Path to Phase 1 detection results JSON"
        echo "  preset        - minimal, standard (default), or complete"
        exit 1
    fi

    local detection_file="$1"
    local preset="${2:-standard}"

    if [ ! -f "$detection_file" ]; then
        log_error "Detection file not found: $detection_file"
        exit 1
    fi

    local detection_json
    detection_json=$(cat "$detection_file")

    match_templates "$detection_json" "$preset"
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

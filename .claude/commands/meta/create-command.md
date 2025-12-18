---
description: Generate a new Claude Code command for any domain from a natural language description
scripts:
  sh: .commando/scripts/bash/create-command.sh --json "{ARGS}"
  ps: .commando/scripts/powershell/create-command.ps1 -Json "{ARGS}"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

This meta-command generates a new Claude Code command for any domain (software development, infrastructure, research, documentation, etc.) from a natural language description of what the command should do.

**⚠️ IMPORTANT: Sequential Execution Required**

This command **MUST be executed sequentially** when creating multiple commands. **DO NOT invoke multiple `/meta:create-command` calls in parallel**, as they write to shared files (bash/PowerShell scripts) and will cause concurrency conflicts resulting in 400 API errors.

**Correct Usage** (Sequential):
```
/meta:create-command Create command 1...
# Wait for completion
/meta:create-command Create command 2...
# Wait for completion
/meta:create-command Create command 3...
```

**Incorrect Usage** (Parallel - Will Fail):
```
# ❌ DO NOT DO THIS - Will cause conflicts
/meta:create-command Create command 1...
/meta:create-command Create command 2...
/meta:create-command Create command 3...
```

**Expected Input Format**:
```
/create-command [description of command purpose and workflow]
```

**Example**:
```
/create-command Create a command that analyzes security logs, identifies suspicious patterns,
generates an incident report with severity levels, and recommends mitigation actions.
This is for the security domain and should follow a multi-phase workflow.
```

## Outline

1. **Parse User Intent**: Extract command purpose, domain, and workflow type from user description
2. **Setup Structure**: Run script to create directory structure and get file paths
3. **Analyze Agent Requirements** (if multi-agent): Identify needed agents, check existence, optionally create
4. **Generate Command**: Create command file from template with specific workflow
5. **Generate Scripts**: Create supporting bash/PowerShell scripts
6. **Validate Structure**: Ensure all required components are present
7. **Report Completion**: Provide usage example, agent status, and next steps

## Execution Flow

### Phase 1: Parse User Description

Analyze the user's command description to extract:

**Required Information**:
- **Command Purpose**: What does this command do?
- **Domain**: Which domain (software-dev, infrastructure, research, documentation, security, data-analysis, etc.)?
- **Workflow Type**: Single-agent or multi-agent?
- **Interactive Requirements**: Does this command need to ask the user questions?
- **Key Phases**: What are the main phases of execution?

**Analysis Process**:
1. Read the full user description
2. Identify key verbs (analyze, generate, validate, deploy, etc.)
3. Identify the domain from context clues
4. Determine if sub-agents are needed (complex, multi-stage processes = multi-agent)
5. Determine if interactive questions are needed:
   - Multiple valid approaches exist with different trade-offs?
   - User needs to make design/architecture decisions?
   - Requirements are ambiguous or underspecified?
   - User preferences affect workflow execution?
   - If YES to any → Include "Gathering Requirements" section
6. Extract the main phases (usually 2-5 phases)

**Extracted Data Structure**:
```
Command ID: [kebab-case-name]
Domain: [domain-folder-name]
Description: [one-line summary]
Script Name: [script-file-name]
Workflow Type: [single-agent | multi-agent]
Interactive: [yes | no - needs AskUserQuestion]
Questions Needed: [list of requirement questions if interactive]
Phases: [list of phase names]
```

**Validation**:
- Command ID must be unique (check existing commands in domain)
- Domain must be valid (or ask user if uncertain)
- At least 2 phases required

---

### Phase 2: Run Setup Script

**IMPORTANT**: The script MUST be called with JSON data in the following exact format:

```bash
.commando/scripts/bash/create-command.sh --json '{"command_id":"[ID]","domain":"[DOMAIN]","description":"[DESC]","script_name":"[SCRIPT]"}'
```

**Step-by-Step Process**:

1. **Build the JSON object** using data extracted in Phase 1:
   ```json
   {
     "command_id": "[command-id from Phase 1]",
     "domain": "[domain from Phase 1]",
     "description": "[one-line description from Phase 1]",
     "script_name": "[same as command-id, or custom name]"
   }
   ```

2. **Call the script with proper format**:
   - Use the Bash tool
   - Command format: `.commando/scripts/bash/create-command.sh --json '[JSON_STRING]'`
   - The JSON must be a single-line string with proper escaping

3. **Example of correct call**:
   ```bash
   .commando/scripts/bash/create-command.sh --json '{"command_id":"security-log-analysis","domain":"security","description":"Analyze security logs to detect threats","script_name":"security-log-analysis"}'
   ```

4. **Parse the JSON output** returned by script:
   - COMMAND_FILE: Path where command will be created
   - COMMAND_DIR: Directory for this domain's commands
   - SCRIPT_FILE: Path where bash script will be created
   - SCRIPT_DIR: Directory for scripts
   - DOMAIN: The domain name
   - COMMAND_ID: The command identifier
   - DESCRIPTION: The description
   - SCRIPT_NAME: The script name

**WRONG - Do NOT do this:**
```bash
# ❌ WRONG - Positional arguments
.commando/scripts/bash/create-command.sh --json security security-log-analysis

# ❌ WRONG - No JSON data
.commando/scripts/bash/create-command.sh --json

# ❌ WRONG - Missing quotes
.commando/scripts/bash/create-command.sh --json {command_id:value}
```

**CORRECT - Do this:**
```bash
# ✅ CORRECT - JSON string after --json flag
.commando/scripts/bash/create-command.sh --json '{"command_id":"value","domain":"value",...}'
```

**Error Handling**:
- If script fails: Report error and suggest fixes
- If command exists: Ask user if they want to overwrite or choose new name
- If paths invalid: Validate repository structure

---

### Phase 2.5: Analyze Agent Requirements (Multi-Agent Only)

**Skip this phase if workflow type is single-agent.**

For multi-agent commands, identify and validate required agents:

#### Step 1: Extract Agent Requirements from Phases

For each phase identified in Phase 1, determine the agent specialization needed:

**Specialization Mapping**:
- **Parse/Extract**: parser, extractor, collector
- **Analyze/Detect**: analyzer, detector, investigator
- **Validate/Verify**: validator, verifier, checker
- **Generate/Create**: generator, creator, builder
- **Transform/Convert**: transformer, converter, formatter
- **Report/Document**: reporter, documenter, writer
- **Recommend/Advise**: advisor, recommender, strategist
- **Deploy/Execute**: deployer, executor, operator
- **Monitor/Observe**: monitor, observer, tracker

**Required Agent Structure**:
```
Phase: [Phase Name]
Required Agent: [agent-type]-[specialization]
Category: [implementers/analysts/verifiers/advisors]
Responsibilities:
  - [Specific task 1 from phase description]
  - [Specific task 2 from phase description]
  - [Specific task 3 from phase description]
Description: [Generated from phase purpose]
```

**Example**:
```
Phase: Analyze Security Logs
Required Agent: log-analyzer
Category: analysts
Responsibilities:
  - Parse security log files
  - Identify suspicious patterns
  - Extract relevant events
  - Normalize log formats
Description: Analyze security logs to identify suspicious patterns and extract relevant events
```

#### Step 2: Check for Existing Agents

For each required agent, check if it already exists:

**Check Process**:
1. Read all YAML files in `config/roles/` directory
2. For each category file, parse the `[category]:` entries
3. Look for agents with matching:
   - ID (exact match preferred)
   - Responsibilities (partial overlap acceptable)
   - Domain (must match or be generic)

**Matching Criteria**:
- **Exact Match**: Agent ID matches required agent ID → ✅ Use existing
- **Partial Match**: Responsibilities overlap >70% → Ask user if suitable
- **No Match**: No similar agent found → Create new

**Store Results**:
```
Existing Agents:
  - [agent-id]: ✅ Found in config/roles/[category].yml

Missing Agents:
  - [agent-id]: ❌ Not found, will create

Partial Matches:
  - [agent-id]: ⚠️ Similar agent found: [similar-agent-id]
```

#### Step 3: Generate Agent Creation Plans

For each missing agent, prepare creation parameters:

**Agent Creation Plan**:
```markdown
Agent ID: [agent-id]
Domain: [command-domain]
Category: [category]
Description: [one-line description from phase]
Your Role: You are a [agent-type]. Your role is to [responsibilities summary].
Tools: [inferred from responsibilities: Write, Read, Bash, WebFetch, etc.]
Model: [opus for complex analysis, sonnet for standard tasks]
Color: [domain-appropriate color]
Responsibilities: [extracted from phase]
Out-of-Scope: [complementary tasks from other phases]
Verifier: [domain]-verifier
```

**Tool Inference Rules**:
- File operations → Write, Read
- External data → WebFetch
- Command execution → Bash
- Analysis/parsing → Read (primarily)
- Generation/creation → Write (primarily)

**Model Selection**:
- Multi-step analysis, complex reasoning → "opus" (no version number - always uses latest)
- Standard implementation tasks → "sonnet" (no version number - always uses latest)
- Simple validation/checking → "sonnet" (no version number - always uses latest)

#### Step 4: User Interaction - Agent Creation

Present findings to user and ask for approval:

**Presentation Format**:
```markdown
## Agent Requirements Analysis

### ✅ Existing Agents (will be used)
- `security-verifier` - Already exists in config/roles/verifiers.yml

### ❌ Missing Agents (need creation)

1. **log-analyzer** (analysts)
   - Parse security logs, identify patterns, extract events
   - Domain: security
   - Tools: Read, Bash

2. **pattern-detector** (analysts)
   - Detect suspicious patterns using statistical analysis
   - Domain: security
   - Tools: Read, WebFetch

3. **report-generator** (implementers)
   - Generate incident reports with severity and timeline
   - Domain: security
   - Tools: Write, Read

4. **security-advisor** (advisors)
   - Recommend mitigation actions based on incidents
   - Domain: security
   - Tools: Read, WebFetch

### ⚠️ Partial Matches (review recommended)
- Required: `log-analyzer` → Found similar: `log-parser` (80% overlap)
  - Use existing? (yes/no)

---

**Options**:
1. **Auto-create all missing agents** (recommended for new domains)
2. **Let me choose which to create** (review each individually)
3. **Create manually later** (just note requirements, proceed with command)

Your choice (1/2/3):
```

#### Step 5: Auto-Generate Missing Agents (if approved)

If user selects option 1 or approves specific agents in option 2:

**For each missing agent**:
1. Generate full agent description from creation plan
2. **Use the SlashCommand tool to invoke `/meta:create-agent`** with the agent description:
   ```
   /meta:create-agent Create an agent specialized in [specialization].
   It should [responsibility-1], [responsibility-2], and [responsibility-3].
   This is for the [domain] domain, category: [category].
   It should NOT handle [out-of-scope items].
   ```

   **Example**:
   ```
   /meta:create-agent Create an agent specialized in analyzing security logs.
   It should parse log files, identify suspicious patterns, extract relevant events,
   and normalize log formats. This is for the security domain, category: analysts.
   It should NOT handle incident response or mitigation recommendations.
   ```

3. Wait for the SlashCommand tool to complete agent creation
4. Parse the agent creation result to extract:
   - Agent file path
   - Role definition file path
   - Agent status (created successfully or failed)
5. Track creation status for final report

**IMPORTANT Implementation Details**:
- **DO NOT** manually create YAML entries or agent markdown files
- **DO** use the SlashCommand tool to invoke `/meta:create-agent` for each missing agent
- **DO** wait for each agent creation to complete before proceeding to the next
- **DO** track which agents were created successfully and which failed
- If agent creation fails, capture the error and mark for manual creation

**Track Agent Creation**:
```
Created Agents:
  ✅ log-analyzer → .claude/agents/security/log-analyzer.md
  ✅ pattern-detector → .claude/agents/security/pattern-detector.md
  ✅ report-generator → .claude/agents/security/report-generator.md
  ⚠️ security-advisor → Failed: [error], needs manual creation
```

**Error Handling**:
- If `/meta:create-agent` fails for an agent, continue with remaining agents
- Track all failures for the final report
- Provide the exact `/meta:create-agent` command users can run manually for failed agents

#### Step 6: Update Command with Agent References

After agent creation/validation, update the command generation to include:

**In Sub-Agent Delegation section**:
```markdown
## Sub-Agent Delegation

### Available Agents for This Command

| Phase | Agent | Status | Location |
|-------|-------|--------|----------|
| Phase 1 | log-analyzer | ✅ Ready | .claude/agents/security/log-analyzer.md |
| Phase 2 | pattern-detector | ✅ Ready | .claude/agents/security/pattern-detector.md |
| Phase 3 | report-generator | ✅ Ready | .claude/agents/security/report-generator.md |
| Phase 4 | security-advisor | ⚠️ Manual | Needs creation |

### Agent Assignment

For each phase, delegate to the appropriate specialist:

**Phase 1: Parse Logs**
- Use the **log-analyzer** agent
- Provide: Log file paths, format specifications
- Expected output: Normalized event data

**Phase 2: Detect Patterns**
- Use the **pattern-detector** agent
- Provide: Normalized events from Phase 1
- Expected output: Suspicious pattern list with confidence scores

[Continue for each phase...]

### Agent Verification

After each agent completes its work:
1. Verify output matches expected format
2. Run designated verifier (security-verifier)
3. Collect verification reports
4. Proceed if verified, otherwise iterate
```

**Benefits**:
- Command explicitly documents which agents it needs
- Clear mapping: phase → agent → verification
- Makes command self-documenting
- Enables validation that all agents exist before execution

---

### Phase 3: Generate Command File

Load the command template and fill it with extracted information.

**Template Path**: `.commando/config/templates/command-template.md`

**Important Decision - Interactive Requirements**:

If `Interactive: yes` (determined in Phase 1), **KEEP and customize** the "Gathering Requirements" section:
1. Identify 1-4 questions the command needs to ask
2. For each question:
   - Write clear question text (specific, ends with "?")
   - Define 2-4 option choices with labels (1-5 words)
   - Write descriptions explaining implications/trade-offs
   - Create short header (max 12 chars)
   - Set multiSelect (true for non-exclusive choices, false for mutually exclusive)
3. Order questions logically (general → specific, e.g., language → framework → tooling)
4. Add instructions to skip questions already answered in $ARGUMENTS

If `Interactive: no` (command can proceed directly), **DELETE** the entire "Gathering Requirements (If Interactive)" section from the generated command.

**Example Interactive Questions** (for reference):
```markdown
1. **Deployment Target** (if not in $ARGUMENTS):
   - Question: "Where do you want to deploy this application?"
   - Options:
     - "AWS" - Amazon Web Services with EC2, Lambda, RDS
     - "Azure" - Microsoft Azure with App Service, Functions
     - "GCP" - Google Cloud Platform with Cloud Run, Functions
     - "On-premise" - Self-hosted infrastructure
   - Header: "Target"
   - multiSelect: false
   - Wait for response

2. **Architecture Style**:
   - Question: "Which architectural approach do you prefer?"
   - Options:
     - "Microservices" - Distributed, independently deployable services
     - "Monolith" - Single unified application
     - "Serverless" - Event-driven, fully managed compute
   - Header: "Architecture"
   - multiSelect: false
   - Wait for response
```

**Placeholder Replacements**:
- `[ONE_LINE_DESCRIPTION]` → Extracted description
- `[SCRIPT_NAME]` → Script file name (kebab-case)
- `[KEY_VARIABLES]` → Variables the script will return
- `[FILE_1]`, `[FILE_2]`, etc. → Context files this command needs
- `[PROCESS_NAME]` → Name of the workflow process
- `[PHASE_NAME]` → Replace for each phase identified
- `[DOMAIN]` → Domain name

**Phase Generation**:
For each identified phase, create a Phase section:
```markdown
### Phase X: [Phase Name]

**Prerequisites**: [What must exist before this phase]

**Process**:
1. [Generated step based on user description]
2. [Generated step based on user description]
3. [Generated step based on user description]

**Outputs**: [What this phase produces]

**Validation**:
- [ ] [Generated validation criterion]
- [ ] [Generated validation criterion]
```

**Validation Checklist**:
Generate domain-appropriate validation items:
- Software Dev: Tests pass, code follows standards, documentation updated
- Infrastructure: Config valid, deployment successful, health checks pass
- Research: Sources cited, methodology documented, findings reproducible
- Documentation: Audience-appropriate, examples included, accessibility checked

**Sub-Agent Section** (if multi-agent):
If workflow type is multi-agent, include agent delegation instructions:
```markdown
## Sub-Agent Delegation

### Agent Assignment
[Instructions for identifying and assigning specialist agents]

### Agent Instructions
[What to provide to each agent]

### Verification
[How to verify agent outputs]
```

Otherwise, remove the sub-agent section entirely.

**Write Command File**:
Write the filled template to `COMMAND_FILE` path.

---

### Phase 4: Generate Supporting Scripts

Create bash and PowerShell scripts that the command will invoke.

**Bash Script** (`SCRIPT_FILE`):
```bash
#!/usr/bin/env bash
set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root)
JSON_MODE=false

if parse_json_flag "$@"; then
    JSON_MODE=true
fi

# Main logic
main() {
    if ! validate_environment; then
        exit 1
    fi

    # [Generated: Domain-specific setup logic]
    # [Generated: Path resolution]
    # [Generated: Environment validation]

    if [ "$JSON_MODE" = true ]; then
        declare -A result
        # [Generated: Add relevant paths and variables]
        json_output result
    else
        log_success "Setup complete"
        # [Generated: Human-readable output]
    fi
}

main "$@"
```

**PowerShell Script** (`SCRIPT_FILE` with .ps1 extension):
```powershell
param([switch]$Json)
$ErrorActionPreference = "Stop"

# [Generated: Import common functions or define inline]
# [Generated: Domain-specific setup logic]
# [Generated: Path resolution]
# [Generated: Environment validation]

if ($Json) {
    $result = @{
        # [Generated: Add relevant paths and variables]
    }
    $result | ConvertTo-Json -Compress
} else {
    Write-Host "Setup complete"
    # [Generated: Human-readable output]
}
```

**Script Content Generation**:
Based on the domain and phases, generate appropriate script logic:
- Directory creation for output paths
- File existence validation
- Environment checks (e.g., check for required tools)
- Path resolution and JSON output

---

### Phase 5: Validate Command Structure

After generation, validate the created command:

**Structural Validation**:
- [ ] Command file exists at correct path
- [ ] Front matter includes description and scripts
- [ ] User Input section present
- [ ] Outline section present
- [ ] All phases defined
- [ ] Validation rules section present
- [ ] Error handling section present
- [ ] Completion report section present

**Content Validation**:
- [ ] No `[PLACEHOLDER]` markers remain
- [ ] All `<!-- ACTION REQUIRED -->` sections filled
- [ ] Script paths match created script files
- [ ] Phase names are clear and action-oriented
- [ ] Validation criteria are specific to domain
- [ ] Error conditions are comprehensive

**Script Validation**:
- [ ] Both bash and PowerShell scripts created
- [ ] Scripts are executable (bash: chmod +x)
- [ ] Scripts source/import common utilities
- [ ] Scripts support --json flag
- [ ] Scripts output required variables

**Validation Process**:
1. Run each validation check
2. Report any failures
3. If failures: Attempt to fix (max 2 iterations)
4. If unfixable: Document and warn user

---

### Phase 6: Report Completion

Report success with usage information:

**Success Report**:
```markdown
✅ Command created successfully!

## Created Files
- Command: `[COMMAND_FILE path]`
- Bash script: `[SCRIPT_FILE path]`
- PowerShell script: `[SCRIPT_FILE.ps1 path]`

## Command Details
- **Domain**: [domain]
- **Command ID**: /[command-id]
- **Workflow**: [single-agent | multi-agent]
- **Phases**: [X phases]

## Usage Example
```
/[command-id] [example user input based on command purpose]
```

## Next Steps
1. Review the generated command file for accuracy
2. Customize validation criteria for your specific needs
3. Test the command with sample input
4. Create any required workflow modules (if not exist)
5. Update domain constitution if adding new principles

## Validation Status
[Report validation results - all passed or list issues]

## Agent Status (Multi-Agent Commands Only)

### ✅ Existing Agents (Ready to Use)
- `[agent-id]` → .claude/agents/[domain]/[agent-id].md
  - Category: [category]
  - Verified by: [verifier-id]

### ✅ Created Agents (Auto-Generated)
- `[agent-id]` → .claude/agents/[domain]/[agent-id].md
  - Category: [category]
  - Responsibilities: [brief list]
  - Verified by: [verifier-id]
  - Status: Ready

### ⚠️ Manual Creation Needed
- `[agent-id]` (Failed auto-generation)
  - Reason: [error or why creation failed]
  - Create with: `/create-agent [suggested description]`
  - Required for: Phase [X] - [Phase Name]

### 📊 Agent Summary
- Total agents required: [X]
- Ready to use: [X] ✅
- Created this session: [X] ✅
- Manual creation needed: [X] ⚠️

**Command Readiness**:
- [If all agents ready] ✅ Command is fully operational
- [If some agents missing] ⚠️ Create missing agents before using command

## Integration Notes
- **Workflows needed**: [List required workflow modules, if any]
- **Standards referenced**: [List required standard files, if any]
- **Verifiers**: Ensure [verifier-ids] exist before running command
```

---

## Error Handling

**If user description is too vague**:
- Ask clarifying questions:
  1. What domain is this for?
  2. What are the main phases of execution?
  3. Should this use sub-agents?
- Provide examples of well-formed descriptions

**If command already exists**:
- Inform user
- Ask: Overwrite existing command? Create with different name?
- If overwrite: Backup existing first

**If domain doesn't exist**:
- List available domains
- Ask if user wants to create new domain
- If new domain: Suggest starting with constitution

**If script creation fails**:
- Report specific error
- Suggest checking repository structure
- Provide manual creation instructions

**If validation fails after max iterations**:
- Report specific failures
- Create command anyway with warnings
- Provide manual fix instructions

---

## Notes

- **Domain-Agnostic**: Works for any knowledge domain, not just software development
- **Template-Driven**: Ensures consistency and quality gates
- **Self-Documenting**: Generated commands include usage examples and next steps
- **Flexible**: Supports both single-agent and multi-agent workflows
- **Validated**: Progressive validation catches errors early

---

## Constitutional Alignment

This meta-command follows these constitutional principles:

- **Specialization Over Generalization** (I): Creates focused commands with clear purposes
- **Validation Before Progression** (II): Validates structure and content before completion
- **Template-Driven Quality** (III): Uses templates to ensure consistency
- **Script-First Architecture** (IV): Scripts handle environment setup
- **Domain Agnosticism** (VII): Works for any domain
- **Progressive Refinement** (IX): Iterates to fix issues
- **Explicit Uncertainty** (X): Asks for clarification when needed

---

## Completion Checklist

Before marking this command complete, verify:

- [ ] User description parsed and understood
- [ ] Command ID and domain determined
- [ ] Phases identified (2-5 phases)
- [ ] Setup script executed successfully
- [ ] **Agent requirements analyzed** (if multi-agent)
- [ ] **Existing agents checked** (if multi-agent)
- [ ] **Missing agents identified** (if multi-agent)
- [ ] **User approved agent creation plan** (if multi-agent with missing agents)
- [ ] **Agents auto-generated or creation commands provided** (if multi-agent)
- [ ] Command file generated from template
- [ ] **Agent table included in Sub-Agent Delegation section** (if multi-agent)
- [ ] All placeholders replaced
- [ ] Scripts created (bash + PowerShell)
- [ ] Scripts are executable
- [ ] Structure validated
- [ ] Content validated
- [ ] **Agent status included in completion report** (if multi-agent)
- [ ] Usage example generated
- [ ] Next steps documented
- [ ] Completion report presented to user

---
description: Generate a new specialized sub-agent for any domain from a natural language role description
scripts:
  sh: .commando/scripts/bash/create-agent.sh --json "{ARGS}"
  ps: .commando/scripts/powershell/create-agent.ps1 -Json "{ARGS}"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

This meta-command generates a new specialized sub-agent for any domain from a natural language description of the agent's role and responsibilities.

**⚠️ IMPORTANT: Sequential Execution Required**

This command **MUST be executed sequentially** when creating multiple agents. **DO NOT invoke multiple `/meta:create-agent` calls in parallel**, as they write to shared files (YAML role definitions, agent files) and will cause concurrency conflicts resulting in 400 API errors.

**Correct Usage** (Sequential):
```
/meta:create-agent Create agent 1...
# Wait for completion
/meta:create-agent Create agent 2...
# Wait for completion
/meta:create-agent Create agent 3...
```

**Incorrect Usage** (Parallel - Will Fail):
```
# ❌ DO NOT DO THIS - Will cause conflicts
/meta:create-agent Create agent 1...
/meta:create-agent Create agent 2...
/meta:create-agent Create agent 3...
```

**Expected Input Format**:
```
/create-agent [description of agent specialization, responsibilities, and domain]
```

**Example**:
```
/create-agent Create an agent specialized in analyzing network traffic patterns to detect anomalies.
It should parse packet captures, identify statistical outliers, generate visualization reports,
and recommend security actions. This is for the security domain, category: analysts.
```

## Outline

1. **Parse Role Description**: Extract specialization, responsibilities, and domain
2. **Setup Structure**: Run script to create directory structure and get file paths
3. **Generate Role Definition**: Create/update YAML role entry
4. **Generate Agent File**: Create agent markdown from template
5. **Generate Workflows** (if needed): Create associated workflow modules
6. **Assign Verifier**: Determine or create verification agent
7. **Validate Structure**: Ensure all required components present
8. **Report Completion**: Provide delegation example and integration steps

## Execution Flow

### Phase 1: Parse Role Description

Analyze the user's agent description to extract:

**Required Information**:
- **Agent ID**: Kebab-case identifier (e.g., network-analyst, database-engineer)
- **Domain**: Which domain folder (security, software-dev, infrastructure, etc.)
- **Category**: Agent category (implementers, verifiers, researchers, analysts, etc.)
- **Specialization**: What this agent specializes in
- **Responsibilities**: Specific tasks this agent handles
- **Out-of-Scope**: What this agent should NOT do
- **Needs Clarification**: Does this agent need to ask questions during execution?
- **Required Tools**: Which tools this agent needs (Write, Read, Bash, WebFetch, etc.)

**Analysis Process**:
1. Read the full user description
2. Identify the core specialization (main focus area)
3. Extract specific responsibilities (action verbs + objects)
4. Infer out-of-scope areas (complementary specializations)
5. Determine if agent needs to ask clarifying questions:
   - Does agent handle tasks with multiple valid approaches?
   - Does agent need to make design/architecture decisions?
   - Are typical task requirements often ambiguous?
   - If YES to any → Include "Clarifying Requirements" section
6. Determine required tools based on responsibilities
7. Identify domain and category from context

**Extracted Data Structure**:
```
Agent ID: [kebab-case-id]
Domain: [domain-folder]
Category: [role-category]
Description: [one-line summary]
Your Role: [first-person role description]
Tools: [comma-separated list]
Model: [opus/sonnet based on complexity]
Color: [UI color for this agent type]
Needs Clarification: [yes | no - needs AskUserQuestion]
Typical Questions: [list of common questions agent might ask if yes]
Responsibilities: [list of specific tasks]
Out-of-Scope: [list of what NOT to do]
Standards: [applicable standard paths]
Verifier: [verifier agent ID]
```

**Validation**:
- Agent ID must be unique within category
- Category must be valid or user-confirmed
- At least 3 responsibilities required
- At least 2 out-of-scope items required

---

### Phase 2: Run Setup Script

**IMPORTANT**: The script MUST be called with JSON data in the following exact format:

```bash
.commando/scripts/bash/create-agent.sh --json '{"agent_id":"[ID]","domain":"[DOMAIN]","category":"[CATEGORY]","description":"[DESC]"}'
```

**Step-by-Step Process**:

1. **Build the JSON object** using data extracted in Phase 1:
   ```json
   {
     "agent_id": "[agent-id from Phase 1]",
     "domain": "[domain from Phase 1]",
     "category": "[category from Phase 1]",
     "description": "[one-line description from Phase 1]"
   }
   ```

2. **Call the script with proper format**:
   - Use the Bash tool
   - Command format: `.commando/scripts/bash/create-agent.sh --json '[JSON_STRING]'`
   - The JSON must be a single-line string with proper escaping

3. **Example of correct call**:
   ```bash
   .commando/scripts/bash/create-agent.sh --json '{"agent_id":"config-validator","domain":"project-management","category":"verifiers","description":"Validate configuration files for syntax and security"}'
   ```

4. **Parse the JSON output** returned by script:
   - AGENT_FILE: Path where agent markdown will be created
   - AGENT_DIR: Directory for this domain's agents
   - ROLES_FILE: Path to YAML role definition file
   - DOMAIN: The domain name
   - CATEGORY: The role category
   - AGENT_ID: The agent identifier
   - DESCRIPTION: The description

**WRONG - Do NOT do this:**
```bash
# ❌ WRONG - Positional arguments
.commando/scripts/bash/create-agent.sh --json config-validator verifiers

# ❌ WRONG - No JSON data
.commando/scripts/bash/create-agent.sh --json

# ❌ WRONG - Missing quotes
.commando/scripts/bash/create-agent.sh --json {agent_id:value}
```

**CORRECT - Do this:**
```bash
# ✅ CORRECT - JSON string after --json flag
.commando/scripts/bash/create-agent.sh --json '{"agent_id":"value","domain":"value",...}'
```

**Error Handling**:
- If script fails: Report error and suggest fixes
- If agent exists: Ask user if they want to overwrite or choose new ID
- If paths invalid: Validate repository structure

---

### Phase 3: Generate/Update Role Definition

Create or update the YAML role definition file.

**Template Path**: `.commando/config/roles/templates/role-template.yml`

**Process**:
1. Check if `ROLES_FILE` exists
2. If exists: Read current content
3. If not exists: Start with empty category

**YAML Entry Generation**:
```yaml
[CATEGORY]:
  - id: [agent-id]
    description: [one-line description]
    your_role: [first-person role prompt]
    tools: [tool1, tool2, tool3]
    model: [opus/sonnet]
    color: [color]
    areas_of_responsibility:
      - [responsibility-1]
      - [responsibility-2]
      - [responsibility-3]
    example_areas_outside_of_responsibility:
      - [out-of-scope-1]
      - [out-of-scope-2]
      - [out-of-scope-3]
    standards:
      - [standard-path-1]
      - [standard-path-2]
    verified_by:
      - [verifier-id]
```

**Field Generation Rules**:

**Model Selection**:
- Complex multi-step tasks, reasoning → "opus" (no version number - always uses latest)
- Straightforward focused tasks, coding → "sonnet" (no version number - always uses latest)

**Color Assignment**:
- Database/Data → orange
- API/Backend → blue
- UI/Frontend → purple
- Testing → green
- Security → red
- Research → cyan
- Documentation → yellow

**Standards Selection** (based on category):
- Implementers: global/*, [domain]/*
- Verifiers: global/*, testing/*
- Researchers: global/*, research/*
- Analysts: global/*, [domain]/*

**Verifier Assignment**:
- Database engineers → backend-verifier
- API engineers → backend-verifier
- UI designers → frontend-verifier
- Testing engineers → test-verifier
- Researchers → research-verifier
- Generic implementers → general-verifier

**Write YAML File**:
If file exists, append the new entry. If not, create with category header.

---

### Phase 4: Generate Agent File

Load the agent template and fill it with extracted information.

**Template Path**: `.commando/config/templates/agent-template.md`

**Important Decision - Clarification Requirements**:

If `Needs Clarification: yes` (determined in Phase 1), **KEEP and customize** the "Clarifying Requirements" section:
1. Identify common scenarios where this agent would need clarification
2. For each typical question:
   - Write clear question text explaining why clarification is needed
   - Define 2-4 option choices representing different approaches
   - Write descriptions explaining trade-offs of each option
   - Create short header (max 12 chars)
   - Set multiSelect appropriately
3. Emphasize that agent should only ask when genuinely ambiguous
4. Add guidance on documenting the decision in the implementation report

If `Needs Clarification: no` (agent can proceed with typical tasks), **DELETE** the entire "Clarifying Requirements (If Needed)" section from the generated agent.

**Example Clarification Scenarios** (for reference):
```markdown
## Common Clarification Needs

**Scenario 1: Multiple Implementation Approaches**
If task allows multiple valid approaches (e.g., REST vs GraphQL, SQL vs NoSQL):
- Explain the trade-offs of each approach
- Ask which the user prefers for this specific case
- Document the decision and rationale

**Scenario 2: Scope Boundaries**
If task scope is unclear (e.g., "improve performance" without specifics):
- Ask about priorities (latency vs throughput, memory vs speed)
- Clarify what level of improvement is acceptable
- Define success metrics together

**Scenario 3: Library/Tool Choice**
If multiple libraries could work (e.g., testing frameworks, UI libraries):
- Present options with pros/cons
- Consider existing codebase patterns
- Ask for preference or use codebase conventions
```

**Placeholder Replacements**:
- `[AGENT_ID]` → Generated agent ID
- `[ONE_LINE_DESCRIPTION]` → Extracted description
- `[COMMA_SEPARATED_TOOLS]` → Tool list
- `[COLOR]` → Assigned color
- `[MODEL_NAME]` → Selected model
- `[ROLE_DESCRIPTION]` → Your role prompt
- `[DOMAIN]` → Domain name
- `[AGENT_TYPE]` → Category (implementers, verifiers, etc.)
- `[RESPONSIBILITY_1]`, etc. → Individual responsibilities
- `[OUT_OF_SCOPE_1]`, etc. → Individual out-of-scope items
- `[STANDARD_1]`, etc. → Standard paths
- `[VERIFIER_AGENT_ID]` → Assigned verifier

**Workflow References**:
Generate workflow injection based on category:
```markdown
## Workflow

### Step 1: [Primary Action]
{{workflows/[DOMAIN]/[action-name]}}

### Step 2: [Secondary Action]
[Inline instructions if workflow doesn't exist]

### Step 3: [Completion]
{{workflows/[CATEGORY]/document-work}}
```

**Constitutional Principles**:
Add domain-appropriate constitutional principles:
- Software Dev: Test-First, Library-First, Integration-First
- Infrastructure: Incremental Deployment, Observability, Security-First
- Research: Source Citation, Methodology Transparency, Reproducibility
- Documentation: Audience-First, Progressive Disclosure, Example-Driven

**Write Agent File**:
Write the filled template to `AGENT_FILE` path.

---

### Phase 5: Generate Workflows (If Needed)

Identify missing workflows referenced in agent file and create them.

**Workflow Detection**:
Scan agent file for `{{workflows/[domain]/[action]}}` references.
Check if workflow file exists at `.claude/workflows/[domain]/[action].md`.

**For Missing Workflows**:
Create workflow file with basic structure:

```markdown
# [Action Name]

[Description of what this workflow accomplishes]

## Process

1. [Step 1 inferred from agent responsibilities]
2. [Step 2 inferred from agent responsibilities]
3. [Step 3 inferred from agent responsibilities]

## Success Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Error Handling

When errors occur:
1. Document the issue
2. Attempt recovery if possible
3. Report to user if unrecoverable
```

**Workflow Directory Structure**:
```
.claude/workflows/
├── [domain]/
│   ├── [action-1].md
│   ├── [action-2].md
│   └── [category]-responsibilities.md
```

---

### Phase 6: Assign Verifier

Determine the appropriate verifier for this agent.

**Verifier Identification**:
1. Check if verifier specified in role definition exists
2. If not, check for domain-appropriate verifier:
   - Backend work → backend-verifier
   - Frontend work → frontend-verifier
   - Security work → security-verifier
   - Research work → research-verifier
3. If no appropriate verifier exists, suggest creating one

**Verifier Requirements**:
For each implementer agent, there should be a corresponding verifier that:
- Has responsibility for checking implementer's domain
- Exists in the verifiers.yml file
- Has its own agent markdown file

**If Verifier Missing**:
- Warn user
- Suggest running `/create-agent` to create verifier
- Provide example verifier role description

---

### Phase 7: Validate Agent Structure

After generation, validate the created agent:

**Structural Validation**:
- [ ] Agent file exists at correct path
- [ ] Front matter includes name, description, tools, model
- [ ] Core Responsibilities section present
- [ ] Areas of Specialization section present
- [ ] Areas outside specialization listed
- [ ] Workflow section with steps present
- [ ] Important Constraints section present
- [ ] Standards & Preferences section present
- [ ] Output Documentation section present
- [ ] Error Handling section present
- [ ] Verification Checklist section present

**Content Validation**:
- [ ] No `[PLACEHOLDER]` markers remain
- [ ] All `<!-- ACTION REQUIRED -->` sections filled
- [ ] At least 3 responsibilities defined
- [ ] At least 2 out-of-scope items defined
- [ ] Workflow steps are specific and actionable
- [ ] Standards references are appropriate
- [ ] Verifier is assigned and exists

**YAML Validation**:
- [ ] Role entry added to correct category file
- [ ] All required YAML fields present
- [ ] YAML syntax is valid
- [ ] Agent ID matches across YAML and markdown
- [ ] Verifier referenced in YAML exists

**Workflow Validation**:
- [ ] Referenced workflows exist or were created
- [ ] Workflow files are properly structured
- [ ] Workflows match agent responsibilities

**Validation Process**:
1. Run each validation check
2. Report any failures
3. If failures: Attempt to fix (max 2 iterations)
4. If unfixable: Document and warn user

---

### Phase 8: Report Completion

Report success with integration information:

**Success Report**:
```markdown
✅ Agent created successfully!

## Created Files
- Agent: `[AGENT_FILE path]`
- Role definition: `[ROLES_FILE path]` (updated/created)
- Workflows: [list any created workflows]

## Agent Details
- **Agent ID**: [agent-id]
- **Domain**: [domain]
- **Category**: [category]
- **Specialization**: [specialization summary]
- **Model**: [opus/sonnet]
- **Verified By**: [verifier-id]

## Responsibilities
[List of responsibilities]

## NOT Responsible For
[List of out-of-scope items]

## Delegation Example

To delegate to this agent in a command:

```markdown
### Phase X: [Task requiring this agent]

Use the **[agent-id]** sub-agent to [what to do].

Provide the agent with:
- [Context item 1]
- [Context item 2]
- Success criteria: [what defines success]

Instruct the agent to:
1. [Instruction 1]
2. [Instruction 2]
3. Create report in `[report-path]`
```

## Integration Steps

1. **Verify Verifier Exists**
   [Status: ✓ Exists | ⚠ Needs Creation]
   [If needs creation: Command to run]

2. **Create Workflows** (if any were generated)
   - Review generated workflows for accuracy
   - Customize based on domain specifics

3. **Update Commands**
   - Identify commands that could use this agent
   - Add delegation instructions
   - Test delegation flow

4. **Test Agent**
   - Create test task assignment
   - Verify agent stays within specialization
   - Verify agent produces required outputs

## Validation Status
[Report validation results - all passed or list issues]

## Notes
[Any special notes about this agent's usage or limitations]
```

---

## Error Handling

**If role description is too vague**:
- Ask clarifying questions:
  1. What specific tasks will this agent handle?
  2. What tasks should it NOT handle?
  3. Which domain and category?
  4. What tools does it need?
- Provide examples of well-formed descriptions

**If agent already exists**:
- Inform user
- Ask: Overwrite existing agent? Create with different ID?
- If overwrite: Backup existing first

**If category doesn't exist**:
- List available categories
- Ask if user wants to create new category
- If new category: Create category YAML file

**If verifier doesn't exist**:
- Warn user
- Suggest creating verifier agent first
- Provide template verifier description
- Allow proceeding with warning

**If workflow creation fails**:
- Report specific error
- Create agent anyway (workflow refs will fail gracefully)
- Provide manual workflow creation instructions

**If validation fails after max iterations**:
- Report specific failures
- Create agent anyway with warnings
- Provide manual fix instructions

---

## Notes

- **Domain-Agnostic**: Creates agents for any knowledge domain
- **Role-Based**: Clear specialization prevents scope creep
- **Verified**: Every implementer has designated verifier
- **Workflow-Driven**: Agents compose reusable workflows
- **Standards-Aware**: Agents follow domain standards
- **Self-Documenting**: Generated agents include usage examples

---

## Constitutional Alignment

This meta-command follows these constitutional principles:

- **Specialization Over Generalization** (I): Creates focused agents with clear boundaries
- **Validation Before Progression** (II): Validates structure and content before completion
- **Template-Driven Quality** (III): Uses templates to ensure consistency
- **Workflow Modularity** (V): Agents compose reusable workflow modules
- **Domain Agnosticism** (VII): Works for any domain
- **Verification Chains** (VIII): Assigns verifier to each implementer
- **Progressive Refinement** (IX): Iterates to fix issues
- **Explicit Uncertainty** (X): Asks for clarification when needed

---

## Completion Checklist

Before marking this command complete, verify:

- [ ] Role description parsed and understood
- [ ] Agent ID and domain determined
- [ ] Responsibilities extracted (minimum 3)
- [ ] Out-of-scope items extracted (minimum 2)
- [ ] Setup script executed successfully
- [ ] YAML role entry created/updated
- [ ] Agent file generated from template
- [ ] All placeholders replaced
- [ ] Workflows created if needed
- [ ] Verifier assigned
- [ ] Structure validated
- [ ] Content validated
- [ ] YAML validated
- [ ] Delegation example generated
- [ ] Integration steps documented
- [ ] Completion report presented to user

# Meta-Framework Philosophy: Command & Agent Generation

## Purpose

This framework enables the creation of specialized Claude Code commands and sub-agents for ANY domain - not just software development. It combines the best methodologies from Agent-OS (multi-agent orchestration) and Spec-Kit (specification-driven development) to create a flexible, domain-agnostic system for building AI agent workflows.

---

## Core Principles

### 1. Domain Agnosticism

Traditional AI coding tools focus solely on software development. This framework treats **all knowledge work** as orchestratable agent workflows:

- **Software Development**: Spec → Plan → Tasks → Implementation
- **Infrastructure Management**: Requirements → Design → Deployment → Verification
- **Research & Documentation**: Question → Investigation → Synthesis → Publication
- **Data Analysis**: Problem → Collection → Analysis → Reporting

**Principle**: Commands and agents should be definable for any structured knowledge domain.

### 2. Constitutional Governance

Borrowed from Spec-Kit, every project begins with a **constitution** - a set of immutable principles that govern all agent behavior.

**Why it matters:**
- Ensures consistency across time and model versions
- Makes quality gates explicit and enforceable
- Prevents architectural drift
- Enables automated compliance checking

**Example Constitutional Articles:**
- **Test-First Imperative**: No implementation before tests (software dev)
- **Source Citation Mandate**: All claims must link to sources (research)
- **Incremental Deployment**: All changes must be reversible (infrastructure)

**Anti-pattern**: Treating principles as suggestions rather than gates.

### 3. Multi-Agent Orchestration

Borrowed from Agent-OS, complex workflows decompose into **specialized sub-agents** coordinated by a main orchestrator.

**Architecture:**
```
Command (Orchestrator)
  ├─> Phase 1: Agent A (specialist)
  ├─> Phase 2: Agent B (specialist)
  └─> Phase 3: Agent C (verifier)
```

**Benefits:**
- Clear separation of concerns
- Parallel execution opportunities
- Specialist expertise per domain
- Verification chains for quality

**Role Definition Pattern:**
```yaml
roles:
  - id: [agent-id]
    description: [What this agent does]
    areas_of_responsibility: [Specific tasks]
    areas_outside_responsibility: [What NOT to do]
    verified_by: [verifier-agent-id]
```

### 4. Template-Driven Quality

Templates are not just boilerplate - they are **constraints that guide LLM behavior** toward higher quality outputs.

**How Templates Enforce Quality:**

1. **Separation of Concerns**: Force "WHAT/WHY" before "HOW"
2. **Explicit Uncertainty**: Require `[NEEDS CLARIFICATION]` markers
3. **Structured Checklists**: Act as "unit tests" for natural language
4. **Constitutional Gates**: Prevent over-engineering at template level
5. **Hierarchical Detail**: Keep high-level readable, extract complexity
6. **Test-First Thinking**: Enforce ordering (tests → implementation)

**Anti-pattern**: Generic templates without enforcement mechanisms.

### 5. Progressive Refinement

Quality emerges through **iterative validation loops**, not one-shot generation.

**Workflow Pattern:**
1. Generate initial output
2. Validate against checklist/gates
3. Identify issues
4. Refine specific issues
5. Re-validate (max 3 iterations)
6. Report remaining issues if any

**Example** (Spec-Kit `/specify` command):
- Generate spec
- Validate quality checklist
- Handle clarifications (max 3)
- Integrate answers into spec
- Re-validate
- Proceed or report issues

**Principle**: Each phase should complete successfully before proceeding to next.

### 6. Script-First Architecture

LLMs excel at content generation, not environment setup. **Shell scripts handle infrastructure**, LLMs focus on knowledge work.

**Division of Responsibilities:**

**Scripts (bash/PowerShell) handle:**
- Branch creation and checkout
- Directory structure initialization
- File path resolution
- JSON data structure creation
- Environment validation

**LLMs handle:**
- Content generation from templates
- Validation and quality checking
- User interaction and clarification
- Semantic analysis and consistency
- Workflow orchestration

**Pattern:**
```markdown
## Command Outline
1. Run script → parse JSON output
2. Load templates
3. Generate content
4. Validate
5. Report
```

**Anti-pattern**: LLMs writing bash commands for file creation instead of using Write tool.

### 7. Workflow Modularity

Workflows are **composable building blocks** that can be mixed and matched.

**Workflow Injection Pattern:**
```markdown
# agents/database-engineer.md
{{workflows/implementation/implement-task}}
{{workflows/implementation/document-implementation}}

# workflows/implementation/implement-task.md
[Step-by-step reusable instructions]
```

**Benefits:**
- Single source of truth
- Update once, affects all agents
- Mix workflows for hybrid agents
- Domain-specific workflow libraries

**Example Workflow Taxonomy:**
- `workflows/specification/*` - Requirement gathering
- `workflows/implementation/*` - Building artifacts
- `workflows/verification/*` - Quality checking
- `workflows/research/*` - Investigation patterns
- `workflows/documentation/*` - Knowledge capture

### 8. Verification Chains

Every implementer agent has a **designated verifier** that checks their work.

**Pattern:**
```yaml
implementers:
  - id: database-engineer
    verified_by: [backend-verifier]
  - id: api-engineer
    verified_by: [backend-verifier]
  - id: ui-designer
    verified_by: [frontend-verifier]
```

**Verification Workflow:**
1. Implementer completes tasks
2. Creates implementation report
3. Verifier runs tests
4. Validates completeness
5. Creates verification report
6. Final verifier aggregates all reports

**Principle**: Implementation and verification are separate concerns.

---

## Architectural Patterns

### Pattern 1: Command Structure

**Anatomy of a Well-Designed Command:**

```markdown
---
description: One-line command description
scripts:
  sh: path/to/setup-script.sh --json "{ARGS}"
  ps: path/to/setup-script.ps1 -Json "{ARGS}"
---

## User Input
$ARGUMENTS

## Outline
1. Setup: Run script once, parse JSON
2. Load context: Templates, standards, existing files
3. Execute workflow: Phase-by-phase with validation
4. Delegate to sub-agents: If multi-agent mode
5. Validate: Check gates, quality, completeness
6. Report: Paths, status, next steps

## Phases

### Phase 1: [Name]
[Detailed instructions]

### Phase 2: [Name]
[Detailed instructions]

## Validation Rules
- [Gate 1]
- [Gate 2]

## Error Handling
- If [condition]: [action]
```

**Key Elements:**
- **Front matter**: Scripts for setup
- **User input**: Explicit parameter handling
- **Outline**: High-level execution flow
- **Phases**: Detailed step-by-step instructions
- **Validation**: Explicit quality gates
- **Error handling**: Clear failure modes

### Pattern 2: Sub-Agent Definition

**Two-Part System:**

**Part 1: Role Definition (YAML)**
```yaml
# config/roles/implementers.yml
implementers:
  - id: database-engineer
    description: Short description
    your_role: Prompt-ready role description
    tools: Write, Read, Bash, WebFetch
    model: opus
    color: orange
    areas_of_responsibility:
      - Specific task 1
      - Specific task 2
    example_areas_outside_of_responsibility:
      - What NOT to do
    standards:
      - global/*
      - backend/*
    verified_by:
      - backend-verifier
```

**Part 2: Agent Implementation (Markdown)**
```markdown
---
name: {{id}}
description: {{description}}
tools: {{tools}}
model: {{model}}
---

{{your_role}}

## Core Responsibilities
{{workflows/[category]/[type]-responsibilities}}

## Areas of Specialization
{{areas_of_responsibility}}

## Workflow
### Step 1: [Phase]
{{workflows/[category]/[action]}}

## Standards Compliance
{{standards}}
```

**Variable Expansion:**
- `{{...}}` indicates content injection from other files
- Enables DRY (Don't Repeat Yourself) principle
- Supports parameterized templates

### Pattern 3: Workflow Modules

**Reusable Process Definitions:**

```markdown
# workflows/implementation/implement-task.md

Implement all tasks assigned to you.

Focus ONLY on areas within your **areas of specialization**.

Guide implementation using:
- Existing patterns you've analyzed
- User standards and preferences

Self-verify:
- Ensure tests pass
- Double-check implemented elements
```

**Characteristics:**
- **Single purpose**: One workflow = one process
- **Context-free**: Works across multiple agents
- **Composable**: Can reference other workflows
- **Testable**: Clear success criteria

### Pattern 4: Template System

**Template Hierarchy:**

```
templates/
├── command-template.md       # Base command structure
├── agent-template.md         # Base agent structure
├── workflow-template.md      # Base workflow structure
├── spec-template.md          # Domain-specific: Software spec
├── plan-template.md          # Domain-specific: Implementation plan
└── infrastructure-template.md # Domain-specific: Infrastructure design
```

**Template Features:**

1. **Placeholders**: `[FEATURE_NAME]`, `{{variable}}`
2. **Instructions**: `<!-- ACTION REQUIRED: ... -->`
3. **Constraints**: `✅ Do this / ❌ Not this`
4. **Examples**: Concrete illustrations
5. **Checklists**: Quality validation items

**Example Template Section:**
```markdown
## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: Fill with specific requirements.
  Each requirement must be testable and unambiguous.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability]
- **FR-002**: Users MUST be able to [key interaction]

*Marking unclear requirements:*
- **FR-003**: System MUST [NEEDS CLARIFICATION: specific question]
```

### Pattern 5: Progressive Validation

**Validation Loop Pattern:**

```
Generate → Validate → Issues? → Refine → Re-validate (max 3x) → Report
```

**Implementation:**
```markdown
## Validation

1. Create quality checklist
2. Check each item: pass/fail
3. If failures:
   a. List specific issues
   b. Update output to address issues
   c. Re-validate (iteration 1)
   d. If still failing, repeat (iteration 2)
   e. Max 3 iterations total
4. If still failing after 3 iterations:
   - Document remaining issues
   - Warn user
   - Proceed with caution flag
```

**Benefits:**
- Catches issues early
- Provides clear feedback
- Prevents infinite loops
- Maintains user control

---

## Best Practices

### Command Creation

1. **Start with script**: Environment setup always delegated to shell
2. **Run script once**: Parse JSON, don't re-run
3. **Load templates**: Copy → Fill → Validate
4. **Phase-gate execution**: Complete phase N before starting N+1
5. **Validate progressively**: Check after each major step
6. **Report clearly**: Paths, status, next command

### Agent Creation

1. **Define role first**: YAML before Markdown
2. **Clear boundaries**: Areas of responsibility vs not
3. **Tool selection**: Only what's needed
4. **Workflow injection**: Reuse existing workflows
5. **Standards compliance**: Inject relevant standards
6. **Verification assignment**: Every implementer has verifier

### Workflow Creation

1. **Single purpose**: One workflow = one process
2. **Context-independent**: Works across agents
3. **Step-by-step**: Clear sequential instructions
4. **Success criteria**: How to know it's done
5. **Error handling**: What to do when stuck

### Template Creation

1. **Constraints over examples**: Show what NOT to do
2. **Explicit placeholders**: `[NEEDS_FILL]` obvious
3. **Action comments**: `<!-- ACTION REQUIRED -->`
4. **Checklists included**: Quality gates built-in
5. **Hierarchical structure**: High-level readable

---

## Anti-Patterns to Avoid

### 1. Over-Generalization

**Bad**: Single command that does everything
**Good**: Focused commands that do one thing well

### 2. Implicit Dependencies

**Bad**: Command assumes environment is ready
**Good**: Script validates prerequisites first

### 3. Skipping Validation

**Bad**: Generate → Report
**Good**: Generate → Validate → Fix → Re-validate → Report

### 4. Monolithic Agents

**Bad**: One agent does database + API + UI
**Good**: Specialized agents with clear boundaries

### 5. Hidden Workflows

**Bad**: Workflow logic embedded in agent definitions
**Good**: Workflows extracted to reusable modules

### 6. Template Dumping

**Bad**: Templates full of examples, no constraints
**Good**: Templates with explicit rules and gates

### 7. Manual File Operations

**Bad**: LLM generates bash commands for file creation
**Good**: Scripts handle files, LLM generates content

### 8. Single-Shot Generation

**Bad**: Generate once, hope it's right
**Good**: Generate → Validate → Refine loop

---

## Framework Structure

### Recommended Directory Layout

```
.claude/
├── commands/
│   ├── meta/
│   │   ├── create-command.md
│   │   └── create-agent.md
│   └── [domain]/
│       └── [command-name].md
├── agents/
│   ├── [domain]/
│   │   └── [agent-name].md
│   └── templates/
│       └── agent-template.md
└── workflows/
    ├── [domain]/
    │   └── [action].md
    └── meta/
        └── command-generation.md

config/
├── roles/
│   ├── [category].yml
│   └── templates/
│       └── role-template.yml
├── memory/
│   └── constitution.md
└── templates/
    ├── command-template.md
    ├── agent-template.md
    ├── workflow-template.md
    └── [domain]-spec-template.md

scripts/
├── bash/
│   ├── common.sh
│   ├── create-command.sh
│   ├── create-agent.sh
│   └── setup-[domain].sh
└── powershell/
    ├── common.ps1
    ├── create-command.ps1
    ├── create-agent.ps1
    └── setup-[domain].ps1
```

### File Naming Conventions

**Commands**: `[action]-[object].md`
- `create-specification.md`
- `implement-tasks.md`
- `verify-quality.md`

**Agents**: `[role]-[specialist].md`
- `database-engineer.md`
- `security-analyst.md`
- `documentation-writer.md`

**Workflows**: `[action]-[object].md`
- `gather-requirements.md`
- `implement-task.md`
- `verify-implementation.md`

**Scripts**: `[action]-[object].[sh|ps1]`
- `create-command.sh`
- `setup-feature.sh`
- `validate-structure.ps1`

---

## Domain-Specific Adaptations

### Software Development Domain

**Constitutional Principles:**
- Test-First Imperative
- Library-First Principle
- Integration-First Testing
- Simplicity Gates (≤3 projects)

**Commands:**
- `/specify` - Requirements → Specification
- `/plan` - Specification → Implementation Plan
- `/tasks` - Plan → Task Breakdown
- `/implement` - Tasks → Code

**Agents:**
- database-engineer
- api-engineer
- ui-designer
- testing-engineer

### Infrastructure Domain

**Constitutional Principles:**
- Incremental Deployment (rollback required)
- Observability Mandate (all changes logged)
- Security-First (least privilege default)
- Documentation Gate (no undocumented infra)

**Commands:**
- `/design` - Requirements → Infrastructure Design
- `/provision` - Design → Terraform/CloudFormation
- `/deploy` - Provision → Live Infrastructure
- `/validate` - Infrastructure → Compliance Check

**Agents:**
- network-architect
- security-engineer
- devops-specialist
- cost-optimizer

### Research Domain

**Constitutional Principles:**
- Source Citation Mandate (all claims linked)
- Methodology Transparency (process documented)
- Reproducibility Requirement (steps repeatable)
- Bias Disclosure (conflicts stated)

**Commands:**
- `/formulate` - Topic → Research Questions
- `/investigate` - Questions → Data Collection
- `/synthesize` - Data → Findings
- `/publish` - Findings → Report

**Agents:**
- literature-reviewer
- data-collector
- statistical-analyst
- technical-writer

### Documentation Domain

**Constitutional Principles:**
- Audience-First (reader empathy required)
- Progressive Disclosure (simple → complex)
- Example-Driven (show, don't just tell)
- Maintenance Plan (update triggers defined)

**Commands:**
- `/outline` - Topic → Structure
- `/draft` - Structure → Content
- `/review` - Content → Feedback
- `/publish` - Final → Distribution

**Agents:**
- technical-writer
- editor
- diagram-creator
- accessibility-specialist

---

## Meta-Capability: Self-Generation

The ultimate test of this framework is **self-hosting**: Can it generate its own components?

### Bootstrap Process

**Phase 1: Manual Creation**
1. Create initial directory structure
2. Write core templates manually
3. Build first meta-commands manually
4. Create foundational scripts

**Phase 2: Semi-Automated**
1. Use `/create-command` to generate new commands
2. Use `/create-agent` to generate new agents
3. Manual refinement of generated outputs
4. Build domain-specific libraries

**Phase 3: Fully Automated**
1. Framework generates commands from descriptions
2. Framework generates agents from role definitions
3. Framework generates workflows from process descriptions
4. Framework generates templates from domain patterns

### Meta-Command: `/create-command`

**Purpose**: Generate a new command for any domain from a natural language description.

**Input**:
```
/create-command Create a command that analyzes log files for security incidents,
identifies suspicious patterns, generates an incident report, and recommends
mitigation actions. This is for the security domain.
```

**Output**:
- `.claude/commands/security/analyze-incidents.md`
- `scripts/bash/analyze-incidents.sh`
- `scripts/powershell/analyze-incidents.ps1`
- `.claude/workflows/security/pattern-detection.md`
- `config/templates/incident-report-template.md`

**Process**:
1. Parse domain and purpose
2. Identify required phases
3. Determine if sub-agents needed
4. Generate command structure
5. Create supporting scripts
6. Generate templates
7. Create workflows
8. Validate structure
9. Report usage

### Meta-Command: `/create-agent`

**Purpose**: Generate a new specialized sub-agent from a role description.

**Input**:
```
/create-agent Create an agent specialized in analyzing network traffic patterns
to detect anomalies. It should be able to parse packet captures, identify
statistical outliers, and generate visualization reports. Part of security domain.
```

**Output**:
- `config/roles/security-analysts.yml` (updated)
- `.claude/agents/security/network-analyst.md`
- `.claude/workflows/security/traffic-analysis.md`
- `.claude/workflows/security/anomaly-detection.md`

**Process**:
1. Parse specialization domain
2. Extract areas of responsibility
3. Identify required tools
4. Generate role YAML entry
5. Create agent markdown
6. Generate associated workflows
7. Assign verifier
8. Validate structure
9. Report integration steps

---

## Success Metrics

### Framework Quality Indicators

**Good Command:**
- Single clear purpose
- Script handles environment
- Progressive validation
- Phase-gated execution
- Clear error handling
- Documented next steps

**Good Agent:**
- Clear role boundaries
- Workflow composition
- Standards compliance
- Designated verifier
- Appropriate tools
- Domain expertise

**Good Workflow:**
- Single process focus
- Step-by-step clarity
- Success criteria
- Error handling
- Context-independent
- Reusable across agents

**Good Template:**
- Explicit constraints
- Quality checklists
- Clear placeholders
- Constitutional gates
- Hierarchical structure
- Example-driven

### Framework Maturity Levels

**Level 1: Functional**
- Commands execute successfully
- Agents complete tasks
- Templates generate output

**Level 2: Robust**
- Validation loops prevent errors
- Quality gates enforced
- Error handling comprehensive

**Level 3: Efficient**
- Workflows reused across agents
- Templates constrain effectively
- Minimal manual intervention

**Level 4: Self-Improving**
- Framework generates own components
- Learns from usage patterns
- Adapts to new domains

**Level 5: Domain-Agnostic**
- Works for any knowledge domain
- Community-contributed domains
- Plug-and-play domain libraries

---

## Evolution & Maintenance

### Version Control Strategy

**What to Version:**
- Command definitions
- Agent definitions
- Workflow modules
- Templates
- Scripts
- Constitution

**What NOT to Version:**
- Generated artifacts (specs, plans, tasks)
- Temporary files
- User-specific configurations
- Domain-specific data

### Backward Compatibility

**Breaking Changes:**
- Command structure changes
- Template format changes
- Script interface changes

**Non-Breaking Changes:**
- New workflows added
- New agents added
- Documentation updates
- Bug fixes

### Community Contributions

**Contribution Types:**
1. **New Domains**: Complete domain packages (commands, agents, workflows, templates)
2. **Domain Extensions**: Additional commands/agents for existing domains
3. **Workflow Libraries**: Reusable process modules
4. **Template Improvements**: Better constraints, checklists, examples
5. **Bug Fixes**: Corrections to existing components

**Quality Standards:**
- All contributions must include constitutional principles
- Commands must have validation loops
- Agents must have verification chains
- Templates must have quality checklists
- Documentation must include examples

---

## Philosophical Foundations

### Why This Matters

Traditional AI coding tools treat the LLM as a **coder**. This framework treats the LLM as an **orchestrator** of specialized knowledge workers.

**Old Model:**
```
Human → Prompt → LLM → Code
```

**New Model:**
```
Human → Command → Orchestrator LLM → Specialized Agents → Validated Output
```

### Core Beliefs

1. **Specialization > Generalization**: Focused agents produce better results than general-purpose prompts
2. **Structure > Freedom**: Constraints guide LLMs toward quality
3. **Validation > Hope**: Progressive checking beats one-shot generation
4. **Composition > Monoliths**: Reusable modules beat copy-paste
5. **Domain-Agnostic > Code-Only**: Knowledge work transcends software development

### The Meta-Framework Vision

**Today**: Manually create commands and agents for each new domain

**Tomorrow**: Framework generates commands and agents from domain descriptions

**Future**: Community-contributed domain libraries, plug-and-play agent ecosystems, self-evolving frameworks that learn from usage patterns

---

## Conclusion

This framework synthesizes the best of Agent-OS (orchestration, specialization) and Spec-Kit (governance, validation) into a domain-agnostic system for creating AI agent workflows.

**Key Innovations:**
- Constitutional governance for any domain
- Multi-agent orchestration patterns
- Template-driven quality constraints
- Progressive validation loops
- Workflow modularity and reuse
- Script-first architecture
- Meta-capability: self-generation

**Design Philosophy:**
- Constraints enable creativity
- Validation ensures quality
- Specialization beats generalization
- Structure guides behavior
- Modularity enables composition

**Ultimate Goal:**
Enable anyone to create sophisticated AI agent workflows for their domain without being a prompt engineering expert. The framework provides the structure, patterns, and quality gates - users provide the domain knowledge and intent.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-10
**Status**: Living Document

---
description: [ONE_LINE_DESCRIPTION]
scripts:
  sh: scripts/bash/[SCRIPT_NAME].sh --json "{ARGS}"
  ps: scripts/powershell/[SCRIPT_NAME].ps1 -Json "{ARGS}"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Gathering Requirements (If Interactive)

<!--
  ACTION REQUIRED: Only include this section if your command needs to ask users questions
  to gather requirements, clarify ambiguities, or get preferences before proceeding.
  Delete this section if your command can proceed directly with user input.
-->

**When to use AskUserQuestion**:
- Multiple valid implementation approaches with different trade-offs
- Ambiguous or underspecified user requirements
- User preferences needed for design/architecture decisions
- Filtering or scoping options based on user's goals

**IMPORTANT Guidelines**:
- **Ask questions ONE AT A TIME** - Wait for response before asking next question
- Use clear, specific question text ending with "?"
- Provide 2-4 options per question (never 1, never 5+)
- Keep header text ≤12 characters (displays as chip/tag)
- Option labels should be 1-5 words, actionable and clear
- Option descriptions explain trade-offs and implications
- Set `multiSelect: true` only for non-exclusive choices
- "Other" option is always available automatically for custom input

**Example Question Flow**:
```markdown
1. **First Requirement** (if not provided in $ARGUMENTS):
   - Question: "Which architectural approach do you prefer?"
   - Options:
     - "Minimal changes" - Maximum code reuse, smaller diff
     - "Clean architecture" - Best maintainability, elegant abstractions
     - "Pragmatic balance" - Speed + quality balance
   - Header: "Approach"
   - multiSelect: false
   - Wait for response before continuing

2. **Second Requirement** (ask second):
   - Question: "Which features do you want to enable?"
   - Options:
     - "Authentication" - User login and permission management
     - "Caching" - In-memory and Redis caching layers
     - "Logging" - Structured logging with multiple backends
   - Header: "Features"
   - multiSelect: true
   - Wait for response before continuing

3. **Third Requirement** (ask third):
   - [Continue pattern for each requirement]
```

**After all questions answered**, proceed to the next phase with gathered requirements.

**Best Practices**:
- ✅ DO: Present questions in logical order (language → project name → architecture → tooling)
- ✅ DO: Skip questions already answered in $ARGUMENTS
- ✅ DO: Provide meaningful descriptions explaining each option's implications
- ✅ DO: Use the answers to adapt subsequent workflow behavior
- ❌ DON'T: Ask 5+ questions at once (overwhelming, violates 1-4 constraint)
- ❌ DON'T: Use vague labels like "Option 1", "First choice"
- ❌ DON'T: Omit descriptions (users need context to choose)
- ❌ DON'T: Use multiSelect for mutually exclusive options

---

## Outline

<!--
  ACTION REQUIRED: Fill in the high-level execution flow.
  This should be a numbered list of major steps.
-->

1. **Setup**: Run `{SCRIPT}` from repo root and parse JSON output for [KEY_VARIABLES]. All file paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load Context**: Read required files:
   - [FILE_1]: [Purpose]
   - [FILE_2]: [Purpose]

3. **Execute Workflow**: Follow [PROCESS_NAME] workflow through phases:
   - Phase 1: [Phase Name and Purpose]
   - Phase 2: [Phase Name and Purpose]
   - [Add more phases as needed]

4. **Validate Output**: Check against quality gates:
   - [Gate 1]
   - [Gate 2]

5. **Report Completion**: Output paths, status, and next steps

## Phases

<!--
  ACTION REQUIRED: Detail each phase with specific instructions.
  Each phase should have clear inputs, process, and outputs.
-->

### Phase 1: [PHASE_NAME]

**Prerequisites**: [What must be complete before this phase]

**Process**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Outputs**: [What this phase produces]

**Validation**:
- [ ] [Validation criterion 1]
- [ ] [Validation criterion 2]

---

### Phase 2: [PHASE_NAME]

**Prerequisites**: [What must be complete before this phase]

**Process**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Outputs**: [What this phase produces]

**Validation**:
- [ ] [Validation criterion 1]
- [ ] [Validation criterion 2]

---

[Add more phases as needed]

---

## Validation Rules

<!--
  ACTION REQUIRED: Define explicit quality gates and validation criteria.
-->

### Quality Checklist

After execution, verify:
- [ ] [Quality criterion 1]
- [ ] [Quality criterion 2]
- [ ] [Quality criterion 3]
- [ ] All required files created
- [ ] No validation errors remain
- [ ] Output follows template structure

**Validation Process**:
1. Check each criterion
2. If failures exist:
   - Document specific issues
   - Attempt to fix (max 3 iterations)
   - Report remaining issues if unfixed
3. If all pass, proceed to completion

---

## Error Handling

<!--
  ACTION REQUIRED: Define how to handle common error conditions.
-->

**If [ERROR_CONDITION_1]**:
- Action: [What to do]
- Message: [What to tell user]
- Next: [Next step or stop]

**If [ERROR_CONDITION_2]**:
- Action: [What to do]
- Message: [What to tell user]
- Next: [Next step or stop]

**If maximum iterations exceeded**:
- Document remaining issues
- Warn user about incomplete validation
- Ask for approval to proceed or stop

---

## Sub-Agent Delegation (if applicable)

<!--
  ACTION REQUIRED: Only include this section if command uses sub-agents.
  Delete this section if command is single-agent.
-->

### Agent Assignment

For each [TASK_GROUP]:
1. Read `config/roles/[CATEGORY].yml` to identify specialist
2. Assign based on `areas_of_responsibility`
3. Provide agent with:
   - Task description
   - Required context files
   - Success criteria

### Agent Instructions

Instruct each agent to:
1. [Instruction 1]
2. [Instruction 2]
3. Create report in `[REPORT_LOCATION]`

### Verification

After agent completion:
1. Verify agent output against criteria
2. Run designated verifier agent (from `verified_by` field)
3. Collect verification reports
4. Proceed if verified, otherwise iterate

---

## Completion Report

<!--
  ACTION REQUIRED: Define what to report to user on completion.
-->

Report the following on successful completion:

### Outputs Created
- `[FILE_PATH_1]`: [Description]
- `[FILE_PATH_2]`: [Description]

### Status Summary
- Phases completed: [X/Y]
- Validation status: [PASS/FAIL with details]
- Issues remaining: [Count and description]

### Next Steps
Suggest the next command(s) to run:
1. `[/next-command-1]` - [Purpose]
2. `[/next-command-2]` - [Purpose]

---

## Notes

<!--
  ACTION REQUIRED: Add any important notes, warnings, or tips for users.
-->

- [Note 1]
- [Note 2]
- [Note 3]

---

## Template Usage Instructions

**For Command Authors**: When creating a command from this template:

1. Replace all `[PLACEHOLDER]` markers with actual values
2. Remove sections marked "if applicable" if not needed
3. Fill all `<!-- ACTION REQUIRED -->` sections
4. Update the validation checklist for your specific domain
5. Ensure error handling covers your command's failure modes
6. Test the command with various inputs before finalizing
7. Remove this "Template Usage Instructions" section from final command

**Validation Checklist for Template Usage**:
- [ ] No `[PLACEHOLDER]` markers remain
- [ ] All `<!-- ACTION REQUIRED -->` sections filled
- [ ] Script names match actual script files
- [ ] Phase validation criteria are specific
- [ ] Error conditions are comprehensive
- [ ] Completion report is clear and actionable
- [ ] Template instructions section removed

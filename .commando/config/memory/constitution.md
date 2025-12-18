# Meta-Framework Constitution

## Core Principles

### I. Specialization Over Generalization

**Every agent must have a clearly defined area of specialization.**

Agents MUST:
- Have explicit "areas of responsibility" documented
- Have explicit "areas outside responsibility" documented
- Refuse tasks outside their specialization
- Delegate to appropriate specialists when needed

Rationale: Specialized agents produce higher quality results than general-purpose agents.

---

### II. Validation Before Progression

**No phase shall proceed without validating the previous phase's output.**

All workflows MUST:
- Include quality checklists for each phase
- Validate outputs against checklists before proceeding
- Iterate up to 3 times to fix validation failures
- Report remaining issues if validation fails after 3 iterations

Rationale: Progressive validation catches errors early and prevents cascading failures.

---

### III. Template-Driven Quality

**All generated outputs must use structured templates with explicit constraints.**

Templates MUST:
- Include quality checklists
- Define explicit "DO" and "DON'T" rules
- Use placeholder markers for required fills
- Include action comments: `<!-- ACTION REQUIRED: ... -->`
- Enforce separation of concerns (e.g., WHAT before HOW)

Rationale: Templates act as constraints that guide LLM behavior toward quality.

---

### IV. Script-First Architecture

**Environment setup and file operations are delegated to shell scripts.**

Scripts SHALL handle:
- Directory creation and initialization
- File path resolution
- Branch creation and checkout
- JSON data structure creation
- Environment validation

LLMs SHALL handle:
- Content generation from templates
- Validation and quality checking
- User interaction and clarification
- Semantic analysis
- Workflow orchestration

Rationale: LLMs excel at content generation, not system administration.

---

### V. Workflow Modularity

**Workflows must be composable, reusable building blocks.**

Workflows MUST:
- Focus on a single process or action
- Be context-independent (work across multiple agents)
- Be referenceable via `{{workflows/[domain]/[action]}}`
- Include clear success criteria
- Document error handling

Rationale: Modular workflows enable composition and reuse across domains.

---

### VI. Constitutional Authority

**Project constitutions are non-negotiable within their scope.**

Constitutional principles:
- Are immutable without explicit amendment process
- Take precedence over convenience or speed
- Must be validated at designated gates
- Violations require documented justification
- Cannot be silently ignored or reinterpreted

Amendment process REQUIRES:
1. Explicit documentation of rationale for change
2. Review and approval
3. Backwards compatibility assessment
4. Version increment

Rationale: Consistent principles ensure quality across time and model versions.

---

### VII. Domain Agnosticism

**Frameworks must not assume a specific domain (e.g., software development).**

Design principles:
- Commands should work for any knowledge domain
- Templates should be parameterizable for different domains
- Workflows should not hardcode domain-specific tools
- Documentation should use domain-neutral examples

Supported domains include (but not limited to):
- Software development
- Infrastructure management
- Research and analysis
- Documentation
- Data analysis
- Security operations

Rationale: Restricting to software development limits the framework's utility.

---

### VIII. Verification Chains

**Every implementer agent must have a designated verifier agent.**

Verification requirements:
- All implementer roles MUST specify `verified_by` field
- Verifiers MUST be distinct from implementers
- Verifiers MUST validate completeness and correctness
- Verifiers MUST produce verification reports
- Final verifier MUST aggregate all verification reports

Rationale: Separation of implementation and verification improves quality.

---

### IX. Progressive Refinement

**Quality emerges through iterative improvement, not one-shot generation.**

Refinement process:
1. Generate initial output
2. Validate against criteria
3. Identify specific issues
4. Refine to address issues
5. Re-validate (maximum 3 iterations)
6. Report success or remaining issues

Hard limits:
- Maximum 3 refinement iterations per phase
- Must report remaining issues after max iterations
- Cannot silently ignore validation failures
- User must explicitly approve proceeding with issues

Rationale: Iterative refinement produces better results than hoping for perfection.

---

### X. Explicit Uncertainty

**Ambiguity must be marked explicitly, not silently assumed away.**

Uncertainty handling:
- Use `[NEEDS CLARIFICATION: specific question]` markers
- Limit clarification markers (recommended max: 3-5 per artifact)
- Prioritize clarifications by impact: scope > security > UX > technical
- Present clarifications one at a time to user
- Document answers directly in artifact
- Make informed guesses for low-impact decisions (document assumptions)

Rationale: Explicit uncertainty prevents incorrect assumptions from compounding.

---

## Quality Gates

### Gate 1: Role Definition (Agent Creation)

Before creating an agent, verify:
- [ ] `id` is unique and descriptive
- [ ] `description` is clear and concise
- [ ] `areas_of_responsibility` is comprehensive
- [ ] `areas_outside_responsibility` is explicit
- [ ] `verified_by` specifies existing verifier agent
- [ ] `tools` includes only necessary tools
- [ ] `standards` references appropriate standard files

**Violation consequences**: Agent creation fails, must address issues.

---

### Gate 2: Command Structure (Command Creation)

Before finalizing a command, verify:
- [ ] Command has single clear purpose
- [ ] Script handles environment setup
- [ ] Outline includes validation steps
- [ ] Phases are clearly delineated
- [ ] Error handling is documented
- [ ] Next steps are specified

**Violation consequences**: Command creation fails, must address issues.

---

### Gate 3: Template Completeness (Template Creation)

Before using a template, verify:
- [ ] All placeholders are marked: `[PLACEHOLDER]`
- [ ] Quality checklist is included
- [ ] Constraints are explicit (DO/DON'T)
- [ ] Action comments guide generation
- [ ] Examples illustrate correct usage
- [ ] Hierarchical structure is clear

**Violation consequences**: Template creation fails, must address issues.

---

### Gate 4: Workflow Independence (Workflow Creation)

Before publishing a workflow, verify:
- [ ] Workflow has single clear purpose
- [ ] No domain-specific assumptions
- [ ] Success criteria are explicit
- [ ] Error handling is documented
- [ ] Can be composed with other workflows

**Violation consequences**: Workflow creation fails, must address issues.

---

## Governance

### Authority Hierarchy

1. **This Constitution**: Highest authority, immutable principles
2. **Domain Constitutions**: Domain-specific principles (must not contradict this constitution)
3. **Role Definitions**: Agent specialization boundaries
4. **Templates**: Structure and quality constraints
5. **Workflows**: Process definitions
6. **Commands**: User-facing orchestration

### Conflict Resolution

When conflicts arise:
1. Constitution principles take precedence over all else
2. Domain constitutions take precedence over role definitions
3. Explicit definitions take precedence over implicit assumptions
4. More specific rules take precedence over general rules

### Amendment Process

To modify this constitution:
1. Propose change with rationale
2. Document impact on existing components
3. Assess backwards compatibility
4. Require approval from framework maintainers
5. Increment version number (MAJOR for breaking changes)
6. Update all affected documentation

### Compliance Enforcement

Compliance is enforced through:
- **Automated validation**: Quality gates in commands and workflows
- **Peer review**: Agent outputs reviewed by verifiers
- **User approval**: Explicit user approval for proceeding with violations
- **Documentation**: All violations must be explicitly justified

---

## Complexity Tracking

When constitutional principles require violations:

| Principle Violated | Why Needed | Simpler Alternative Rejected Because |
|--------------------|------------|-------------------------------------|
| [Principle] | [Specific need] | [Why simpler approach insufficient] |

**Requirement**: All violations must be documented and justified before proceeding.

---

## Implementation Notes

### For Command Authors

- Always reference this constitution in validation phases
- Implement gates as explicit checklist validation
- Fail fast on violations unless documented justification provided
- Report compliance status in command output

### For Agent Authors

- Internalize your domain's constitutional principles
- Refuse tasks that violate constitutional boundaries
- Reference constitution when explaining rejection
- Suggest appropriate specialist for out-of-scope tasks

### For Workflow Authors

- Design workflows to enforce constitutional principles
- Include validation steps that check compliance
- Provide clear guidance on principle application
- Document how workflow maintains compliance

### For Template Authors

- Embed constitutional principles as constraints
- Include compliance checklists
- Use explicit markers for required adherence
- Provide examples of compliant outputs

---

**Version**: 1.0.0
**Ratified**: 2025-10-10
**Last Amended**: 2025-10-10
**Status**: Active

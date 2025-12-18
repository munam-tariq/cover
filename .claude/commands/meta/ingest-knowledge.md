---
description: Analyze external repositories to extract knowledge and propose improvements to Commando
scripts:
  sh: scripts/bash/ingest-knowledge.sh --json "{ARGS}"
  ps: scripts/powershell/ingest-knowledge.ps1 -Json "{ARGS}"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

This command analyzes external repositories to extract knowledge for improving Commando. It performs deep analysis of repository structure, patterns, philosophies, and approaches, then compares findings with Commando's current implementation to identify gaps, opportunities, and propose improvements.

**Expected Input Format**:
```
/meta:ingest-knowledge [path-to-repository]
```

**Example**:
```
/meta:ingest-knowledge /Users/username/projects/spec-kit
```

## Outline

1. **Setup**: Run `{SCRIPT}` from repo root and parse JSON output for repository path and output directory paths. All file paths must be absolute.

2. **Load Context**: Read required files:
   - Target repository files (structure, docs, code)
   - Commando's constitution and philosophy
   - Commando's current architecture

3. **Execute Workflow**: Follow knowledge ingestion workflow through phases:
   - Phase 1: Repository Analysis - Analyze structure, patterns, and architecture
   - Phase 2: Knowledge Extraction - Extract concepts, philosophies, and insights
   - Phase 3: Comparative Analysis - Compare with Commando and identify opportunities
   - Phase 4: Report Generation - Create comprehensive knowledge report
   - Phase 5: Approval & Review - Present findings and facilitate user decisions

4. **Validate Output**: Check against quality gates:
   - All analysis sections complete
   - Proposed changes have rationale
   - Implementation roadmap is actionable
   - User decisions captured

5. **Report Completion**: Output report path, decision summary, and next steps

## Phases

### Phase 1: Repository Analysis

**Prerequisites**: Target repository path provided by user

**Process**:
1. Use the **repository-analyzer** agent to analyze the target repository
2. Provide the agent with:
   - Repository path from user input
   - Task: Perform comprehensive structural and technical analysis
   - Success criteria: Complete analysis document with structure, tech stack, architecture, and conventions
3. Agent will create analysis output at output directory
4. Verify analysis completeness

**Outputs**: Repository analysis document with structure, architecture patterns, tech stack, and conventions

**Validation**:
- [ ] Directory structure documented
- [ ] Tech stack extracted
- [ ] Architecture patterns identified
- [ ] Conventions documented
- [ ] Analysis is factual and evidence-based

---

### Phase 2: Knowledge Extraction

**Prerequisites**: Phase 1 (Repository Analysis) complete

**Process**:
1. Use the **knowledge-extractor** agent to extract knowledge from the repository
2. Provide the agent with:
   - Repository path
   - Repository analysis from Phase 1 (for context)
   - Task: Extract concepts, philosophies, patterns, and insights
   - Success criteria: Complete knowledge extraction with concepts, innovative patterns, best practices, and design rationales
3. Agent will create knowledge extraction output at output directory
4. Verify extraction completeness

**Outputs**: Knowledge extraction document with concepts, philosophies, innovative patterns, best practices, and key learnings

**Validation**:
- [ ] Core concepts extracted
- [ ] Philosophies documented
- [ ] Innovative patterns identified with examples
- [ ] Best practices cataloged
- [ ] All insights backed by evidence

---

### Phase 3: Comparative Analysis

**Prerequisites**: Phase 1 (Repository Analysis) and Phase 2 (Knowledge Extraction) complete

**Process**:
1. Use the **comparative-analyzer** agent to compare findings with Commando
2. Provide the agent with:
   - Repository analysis from Phase 1
   - Knowledge extraction from Phase 2
   - Commando's constitution, philosophy, and current architecture
   - Task: Perform comparative analysis to identify gaps, opportunities, and alignment
   - Success criteria: Complete comparative analysis with gaps, opportunities prioritized, feasibility assessed, and strategic questions identified
3. Agent will create comparative analysis output at output directory
4. Verify analysis completeness and objectivity

**Outputs**: Comparative analysis document with gaps, opportunities, feasibility assessments, and strategic questions

**Validation**:
- [ ] Commando's current state understood
- [ ] Structural and conceptual comparisons complete
- [ ] Gaps clearly identified
- [ ] Opportunities categorized by priority and feasibility
- [ ] Philosophical alignment evaluated
- [ ] Strategic questions surfaced

---

### Phase 4: Report Generation

**Prerequisites**: Phase 1, 2, and 3 complete

**Process**:
1. Use the **knowledge-reporter** agent to generate comprehensive report
2. Provide the agent with:
   - Repository analysis from Phase 1
   - Knowledge extraction from Phase 2
   - Comparative analysis from Phase 3
   - Task: Synthesize all findings into comprehensive knowledge ingestion report
   - Success criteria: Complete report with executive summary, all findings, proposed changes with rationale, and implementation roadmap
3. Agent will create knowledge ingestion report at output directory
4. Verify report completeness and structure

**Outputs**: Comprehensive knowledge ingestion report with executive summary, findings, proposed changes, and implementation roadmap

**Validation**:
- [ ] Report is complete and well-structured
- [ ] All analysis findings included
- [ ] Proposed changes documented with rationale
- [ ] Implementation roadmap created with phases
- [ ] Executive summary is concise and actionable

---

### Phase 5: Approval & Review

**Prerequisites**: Phase 4 (Report Generation) complete

**Process**:
1. Use the **meta-advisor** agent to facilitate user review and decisions
2. Provide the agent with:
   - Knowledge ingestion report from Phase 4
   - Task: Present report to user, answer questions, facilitate prioritization, and capture decisions
   - Success criteria: Report presented, user questions answered, changes prioritized, decisions captured
3. Agent will:
   - Present executive summary and key findings
   - Answer user questions about findings and recommendations
   - Help prioritize proposed changes
   - Facilitate strategic direction decisions
   - Create decision summary document
4. Verify all decisions are captured

**Outputs**: Decision summary document with approved changes, priorities, strategic decisions, and implementation approach

**Validation**:
- [ ] Report presented to user
- [ ] User questions answered
- [ ] Changes prioritized with user input
- [ ] Strategic decisions made and captured
- [ ] Decision summary created
- [ ] Next steps are clear

---

## Verification

After all phases complete, use the **meta-verifier** agent to verify outputs:

**Verification Process**:
1. Provide meta-verifier with:
   - Knowledge ingestion report from Phase 4
   - Decision summary from Phase 5
   - Task: Verify quality, completeness, strategic alignment, and actionability
2. Meta-verifier will review:
   - Completeness (no missing sections or placeholders)
   - Strategic alignment (aligns with Commando philosophy and constitutional principles)
   - Quality and actionability (clear, well-structured, actionable recommendations)
3. Meta-verifier will create verification report with findings and verdict
4. If issues found:
   - Address critical issues (must fix)
   - Consider major issues (should fix)
   - Document minor issues (nice to have)
   - Iterate if needed (max 2 iterations)
5. If verification passes: Proceed to completion
6. If verification fails after iterations: Report issues and get user approval to proceed

**Success Criteria**:
- [ ] Verification report created
- [ ] Critical issues resolved
- [ ] Verdict is "APPROVED" or user has approved proceeding despite issues

---

## Validation Rules

### Quality Checklist

After execution, verify:
- [ ] Repository analysis is complete and factual
- [ ] Knowledge extraction is thorough with examples
- [ ] Comparative analysis is objective and comprehensive
- [ ] Proposed changes have clear rationale and alignment assessment
- [ ] Implementation roadmap is realistic and sequenced properly
- [ ] Decision summary accurately reflects user choices
- [ ] All required files created
- [ ] Meta-verifier has approved (or user has accepted with warnings)
- [ ] No placeholder content remains
- [ ] Output follows template structure

**Validation Process**:
1. Check each criterion
2. If failures exist:
   - Document specific issues
   - Attempt to fix (max 2 iterations)
   - Report remaining issues if unfixed
3. If all pass, proceed to completion

---

## Error Handling

**If target repository path is invalid or inaccessible**:
- Action: Verify path exists and is readable
- Message: "Cannot access repository at [path]. Please verify the path and permissions."
- Next: Stop and request valid path

**If agent outputs are incomplete**:
- Action: Review agent output, identify what's missing
- Message: "Agent [agent-name] output is incomplete: [details]"
- Next: Request agent to complete missing sections, or note in verification report

**If comparative analysis identifies no opportunities**:
- Action: Verify target repository is sufficiently different from Commando
- Message: "No significant learning opportunities identified. Target repository may be too similar to Commando or analysis may need review."
- Next: Continue with report, note in findings

**If user decisions are unclear or contradictory**:
- Action: Meta-advisor should seek clarification
- Message: "Need clarification on [decision]"
- Next: Continue dialogue until clarity achieved

**If verification fails after maximum iterations**:
- Action: Document remaining issues clearly
- Message: "Verification identified unresolved issues: [list]. Proceed anyway?"
- Next: Get user approval to proceed or stop

---

## Sub-Agent Delegation

### Available Agents for This Command

| Phase | Agent | Category | Status | Location |
|-------|-------|----------|--------|----------|
| Phase 1 | repository-analyzer | analysts | ✅ Ready | .claude/agents/meta/repository-analyzer.md |
| Phase 2 | knowledge-extractor | analysts | ✅ Ready | .claude/agents/meta/knowledge-extractor.md |
| Phase 3 | comparative-analyzer | analysts | ✅ Ready | .claude/agents/meta/comparative-analyzer.md |
| Phase 4 | knowledge-reporter | implementers | ✅ Ready | .claude/agents/meta/knowledge-reporter.md |
| Phase 5 | meta-advisor | advisors | ✅ Ready | .claude/agents/meta/meta-advisor.md |
| Verification | meta-verifier | verifiers | ✅ Ready | .claude/agents/meta/meta-verifier.md |

### Agent Assignment Guidelines

**Phase 1: Repository Analysis**
- Use the **repository-analyzer** agent
- Provide: Repository path, task description, success criteria
- Expected output: Repository analysis document

**Phase 2: Knowledge Extraction**
- Use the **knowledge-extractor** agent
- Provide: Repository path, repository analysis (context), task description, success criteria
- Expected output: Knowledge extraction document

**Phase 3: Comparative Analysis**
- Use the **comparative-analyzer** agent
- Provide: Repository analysis, knowledge extraction, Commando context, task description, success criteria
- Expected output: Comparative analysis document

**Phase 4: Report Generation**
- Use the **knowledge-reporter** agent
- Provide: All three analysis documents, task description, success criteria
- Expected output: Comprehensive knowledge ingestion report

**Phase 5: Approval & Review**
- Use the **meta-advisor** agent
- Provide: Knowledge ingestion report, task description, success criteria
- Expected output: Decision summary document

**Verification**
- Use the **meta-verifier** agent
- Provide: Knowledge ingestion report, decision summary, task description, success criteria
- Expected output: Verification report with verdict

### Verification Chain

After each implementer agent completes work:
1. Review output against success criteria
2. Run **meta-verifier** to verify quality
3. Collect verification report
4. If verified: Proceed to next phase
5. If issues found: Address critical issues, iterate if needed, or escalate to user

---

## Completion Report

Report the following on successful completion:

### Outputs Created
- `[output-dir]/repository-analysis.md`: Structural and technical analysis of target repository
- `[output-dir]/knowledge-extraction.md`: Extracted concepts, philosophies, and patterns
- `[output-dir]/comparative-analysis.md`: Comparison with Commando, gaps, and opportunities
- `[output-dir]/knowledge-ingestion-report.md`: Comprehensive synthesis of all findings
- `[output-dir]/decision-summary.md`: User decisions and approved changes
- `[output-dir]/verification-report.md`: Quality verification results

### Status Summary
- Phases completed: 5/5 ✅
- Agents used: 6 (5 specialists + 1 verifier)
- Validation status: [PASS/FAIL with details]
- User decisions captured: [count approved/rejected/deferred changes]
- Verification: [APPROVED/NEEDS REVISION/ACCEPTED WITH WARNINGS]

### Key Outcomes
- **Top Learnings**: [List 3-5 key insights]
- **Approved Changes**: [count high/medium/low priority]
- **Strategic Decisions**: [count decisions made]
- **Ready for Implementation**: [Yes/No - what's next]

### Next Steps

Based on approved changes:
1. Review decision summary: `cat [output-dir]/decision-summary.md`
2. Begin implementation of Phase 1 changes (if approved)
3. Create implementation tracking (consider using project management commands)
4. Schedule review after implementing first phase

---

## Notes

- **First Time Usage**: This command is designed to analyze repositories similar to how Commando was initially created by analyzing Spec Kit and Agent OS. Use it when you want to systematically extract knowledge from other projects.
- **Repository Selection**: Works best with repositories that have different approaches or philosophies than Commando. Similar repositories may yield fewer insights.
- **User Involvement**: Phase 5 requires active user participation to make decisions. Set aside time to review the report and make strategic choices.
- **Iterative Process**: You can run this command multiple times on different repositories to continuously improve Commando.
- **Constitutional Alignment**: All analysis and recommendations are evaluated against Commando's constitutional principles to ensure philosophical consistency.
- **Agent Specialization**: This command demonstrates Commando's multi-agent architecture with 6 specialized agents working sequentially.

---

**Command Version**: 1.0.0
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

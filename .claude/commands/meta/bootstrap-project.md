---
description: Analyze project structure and bootstrap domain-specific commands and agents
scripts:
  sh: .commando/scripts/bash/bootstrap-project.sh --json "{ARGS}"
  ps: .commando/scripts/powershell/bootstrap-project.ps1 -Json "{ARGS}"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Purpose

This meta-command analyzes your project's structure, detects its type and technology stack, then generates appropriate commands, agents, and workflows tailored to your project.

**Expected Input Format**:
```bash
/meta:bootstrap-project [--preset minimal|standard|complete]
```

**Examples**:
```bash
# Standard bootstrap (recommended)
/meta:bootstrap-project

# Minimal essentials only
/meta:bootstrap-project --preset minimal

# Everything detected
/meta:bootstrap-project --preset complete
```

## Outline

1. **Check Existing Config**: Look for previous bootstrap
2. **Analyze Project**: Scan files, detect tech stack
3. **Map to Templates**: Identify relevant commands/agents
4. **Present Checklist**: Show interactive selection
5. **Generate Items**: Create selected commands/agents/workflows
6. **Handle Conflicts**: Merge or version existing items
7. **Save Config**: Update `.commando/project-config.yml`
8. **Report Completion**: Show what was created

## Execution Flow

### Phase 1: Check for Existing Bootstrap

**Check if `.commando/project-config.yml` exists**:

If exists:
```
Found existing bootstrap configuration
Last updated: 2025-10-10
Previously generated: 12 commands, 18 agents

Running in UPDATE mode - will detect changes and suggest additions
```

If not exists:
```
No previous bootstrap found

Running in INITIAL mode - will analyze project from scratch
```

**Load existing config** (if present):
- Read generated items
- Note existing domains
- Prepare for delta detection

---

### Phase 2: Analyze Project Structure

**Step 1: Scan Project Files**

Use Glob tool to scan project structure:
```bash
# Find key configuration files
Glob: **/package.json
Glob: **/requirements.txt
Glob: **/Cargo.toml
Glob: **/go.mod
Glob: **/composer.json
Glob: **/tsconfig.json
Glob: **/Dockerfile
Glob: **/*.tf
```

**Step 2: Analyze Key Files**

Read and parse important files:
- `package.json` → Detect Node.js, frameworks, dependencies
- `README.md` → Infer project purpose and goals
- `tsconfig.json` → Confirm TypeScript usage
- `requirements.txt` / `pyproject.toml` → Python dependencies
- `Dockerfile` → Containerization
- `.github/workflows/` → CI/CD

**Step 3: Count File Types**

```bash
# Count by extension
TypeScript files (.ts, .tsx): [count]
JavaScript files (.js, .jsx): [count]
Python files (.py): [count]
Go files (.go): [count]
Rust files (.rs): [count]
```

**Step 4: AI-Inferred Analysis**

Use LLM reasoning to infer:

**Project Type**:
- Web Frontend (React, Vue, Angular, Svelte)
- Web Backend (Node, Python, Go, Rust)
- Full Stack (Frontend + Backend combined)
- Infrastructure (Terraform, Kubernetes, Docker)
- Data Science (Jupyter, Pandas, ML libraries)
- Mobile (React Native, Flutter)
- CLI Tool (Bin scripts, command-line focused)
- Library/Package (No app entry, exports focused)

**Tech Stack Detection**:
```
Primary Language: [language with most files]
Frontend Framework: [detected from package.json, config files]
Backend Framework: [Express, FastAPI, Django, etc.]
Database: [PostgreSQL, MySQL, MongoDB, Redis, etc.]
Infrastructure: [Docker, Kubernetes, Terraform, etc.]
Testing: [Jest, Pytest, Go test, etc.]
CI/CD: [GitHub Actions, GitLab CI, CircleCI, etc.]
```

**Patterns Detected**:
- Monorepo: (Has workspaces/, packages/, or lerna.json)
- Microservices: (Multiple service directories, docker-compose with many services)
- Serverless: (Serverless.yml, Lambda functions, Netlify/Vercel config)
- API Type: (REST, GraphQL, gRPC)

**Confidence Score**: Rate detection confidence (0.0 - 1.0)

**Example Detection Result**:
```json
{
  "project_type": "full-stack-web",
  "confidence": 0.92,
  "tech_stack": {
    "frontend": {
      "framework": "next.js",
      "version": "14.0.0",
      "language": "typescript",
      "styling": "tailwindcss",
      "testing": "jest"
    },
    "backend": {
      "runtime": "node.js",
      "framework": "express",
      "language": "typescript",
      "database": "postgresql",
      "orm": "prisma"
    },
    "infrastructure": {
      "containerization": "docker",
      "orchestration": null,
      "ci_cd": "github-actions"
    }
  },
  "patterns": {
    "monorepo": false,
    "microservices": false,
    "serverless": false,
    "api_type": "rest"
  }
}
```

---

### Phase 3: Map Detection to Command/Agent Templates

Based on detected tech stack, identify relevant items:

**For Full Stack Web (Next.js + Express + PostgreSQL)**:

**Frontend Domain (Next.js + React + TypeScript)**:
```
Commands to suggest:
1. /frontend:review-component
   - Review React component for quality and best practices

2. /frontend:generate-component
   - Generate new React component with tests

3. /frontend:analyze-bundle
   - Analyze Next.js bundle size and dependencies

4. /frontend:validate-types
   - Check TypeScript types and interfaces

Agents needed:
- component-reviewer (verifiers)
- component-generator (implementers)
- bundle-analyzer (analysts)
- type-validator (verifiers)
```

**Backend Domain (Express + TypeScript + PostgreSQL)**:
```
Commands to suggest:
1. /backend:review-api
   - Review API endpoint for security and patterns

2. /backend:generate-endpoint
   - Generate CRUD endpoint with validation

3. /backend:validate-db
   - Check database schema and migrations

Agents needed:
- api-reviewer (verifiers)
- endpoint-generator (implementers)
- db-validator (verifiers)
- security-auditor (analysts)
```

**Infrastructure Domain (Docker)**:
```
Commands to suggest:
1. /infrastructure:validate-docker
   - Validate Dockerfile and docker-compose

2. /infrastructure:optimize-images
   - Optimize Docker image sizes

Agents needed:
- docker-validator (verifiers)
- image-optimizer (implementers)
```

**Testing Domain**:
```
Commands to suggest:
1. /testing:coverage-report
   - Generate test coverage report

2. /testing:generate-tests
   - Generate unit tests for components/functions

Agents needed:
- test-generator (implementers)
- coverage-analyzer (analysts)
```

**Apply Preset Filter**:
- `--preset minimal`: Top 3-5 most essential commands + 5-8 core agents
- `--preset standard`: 7-10 common commands + 10-15 agents [DEFAULT]
- `--preset complete`: All 12-15 detected commands + 15-25 agents

---

### Phase 4: Present Interactive Checklist

**Format the selection UI**:

```markdown
✅ Project Analysis Complete

## Detected Configuration
**Project Type**: Full Stack Web Application
**Tech Stack**: Next.js 14 + Express + PostgreSQL + Docker
**Confidence**: 92%

---

## Commands to Generate

**Select preset**: (1) Minimal | (2) Standard | (3) Complete | (4) Custom
Your choice [2]:

### Frontend Domain (4 commands)
[x] 1. /frontend:review-component - Review React components for quality
[x] 2. /frontend:generate-component - Generate new component with tests
[ ] 3. /frontend:analyze-bundle - Analyze bundle size and dependencies
[x] 4. /frontend:validate-types - Check TypeScript types

### Backend Domain (3 commands)
[x] 5. /backend:review-api - Review API endpoints
[x] 6. /backend:generate-endpoint - Generate CRUD endpoint
[ ] 7. /backend:validate-db - Validate database schema

### Infrastructure Domain (2 commands)
[x] 8. /infrastructure:validate-docker - Validate Docker configs
[ ] 9. /infrastructure:optimize-images - Optimize image sizes

### Testing Domain (2 commands)
[ ] 10. /testing:coverage-report - Generate coverage report
[x] 11. /testing:generate-tests - Generate unit tests

**Selected**: 7 commands

---

## Agents to Generate

### Verifiers (5 agents)
[x] 1. component-reviewer (frontend)
[x] 2. api-reviewer (backend)
[x] 3. docker-validator (infrastructure)
[ ] 4. type-validator (frontend)
[x] 5. test-validator (testing)

### Implementers (4 agents)
[x] 6. component-generator (frontend)
[x] 7. endpoint-generator (backend)
[ ] 8. image-optimizer (infrastructure)
[x] 9. test-generator (testing)

### Analysts (2 agents)
[ ] 10. bundle-analyzer (frontend)
[ ] 11. security-auditor (backend)

### Advisors (1 agent)
[ ] 12. architecture-advisor (system)

**Selected**: 8 agents

---

**Actions**:
- Type `y` or `yes` to generate all selected items
- Type `n` or `no` to cancel
- Type `custom` to modify selections
- Type numbers to toggle (e.g., `3,7,10` to toggle items)

Your choice:
```

**Wait for user input**:
- `y` / `yes` → Proceed with selected items
- `n` / `no` → Cancel bootstrap
- `custom` → Enter custom selection mode (allow toggling)
- Numbers (`3,7,10`) → Toggle those specific items

---

### Phase 5: Generate Selected Items

**For each selected command**:

1. **Check for conflicts**:
   ```
   Command: /frontend:review-component

   Check: Does .claude/commands/frontend/review-component.md exist?

   If YES:
     - Create versioned variant: review-component-v2.md
     - Note in report: "Created v2 (original exists)"

   If NO:
     - Create normally: review-component.md
   ```

2. **Build command spec from template**:
   ```json
   {
     "command_id": "review-component",
     "domain": "frontend",
     "description": "Review React component for quality, accessibility, and best practices",
     "script_name": "review-component",
     "workflow_type": "multi-agent",
     "phases": [
       "Parse component file",
       "Check structure and props",
       "Validate patterns and hooks",
       "Check accessibility",
       "Generate quality report"
     ],
     "agents_required": ["component-reviewer"]
   }
   ```

3. **Generate command** using existing `/meta:create-command` workflow:
   - Build natural language description from template
   - Call create-command internally
   - Track success/failure

**For each selected agent**:

1. **Check for conflicts in YAML**:
   ```
   Agent: component-reviewer
   Category: verifiers

   Check: Does config/roles/verifiers.yml contain component-reviewer?

   If YES:
     - MERGE mode:
       - Read existing entry
       - Compare responsibilities
       - Add new responsibilities not present
       - Add note: "Updated by bootstrap 2025-10-10"
       - Keep existing verified_by

   If NO:
     - CREATE mode:
       - Add new YAML entry
       - Create agent markdown file
   ```

2. **Build agent spec from template**:
   ```json
   {
     "agent_id": "component-reviewer",
     "domain": "frontend",
     "category": "verifiers",
     "description": "Review React components for quality, patterns, and accessibility",
     "responsibilities": [
       "Review component structure and organization",
       "Validate prop-types or TypeScript interfaces",
       "Check React hooks usage (dependencies, rules)",
       "Verify accessibility (a11y) compliance",
       "Check naming conventions and file structure"
     ],
     "out_of_scope": [
       "Generating new components",
       "Fixing runtime errors",
       "Performance profiling",
       "State management architecture"
     ],
     "tools": ["Read", "Bash"],
     "model": "sonnet",
     "verified_by": "frontend-verifier"
   }
   ```

3. **Generate agent** using existing `/meta:create-agent` workflow:
   - Build natural language description
   - Call create-agent internally
   - Track creation status

**For workflows** (if pattern appears 3+ times):

1. **Count pattern usage**:
   ```
   Pattern: "validate-typescript"
   Used by agents:
     - component-reviewer
     - api-reviewer
     - endpoint-generator
     - test-generator

   Count: 4 agents → EXTRACT TO WORKFLOW
   ```

2. **Create workflow file**:
   ```markdown
   # Validate TypeScript

   Check TypeScript code for type errors and issues.

   ## Process

   1. Run TypeScript compiler with --noEmit flag
   2. Parse error output
   3. Group errors by file
   4. Report errors with line numbers and descriptions

   ## Success Criteria

   - [ ] TypeScript compiler runs successfully
   - [ ] All type errors are identified
   - [ ] Errors are grouped by file
   - [ ] Line numbers are accurate

   ## Error Handling

   If compilation fails:
   - Capture full error output
   - Report syntax errors separately
   - Suggest fixes for common issues
   ```

3. **Update agent references**:
   - Change inline steps to: `{{workflows/frontend/validate-typescript}}`

---

### Phase 6: Handle Conflicts & Versioning

**Command Conflicts**:
```
Original: .claude/commands/frontend/review-component.md
New: .claude/commands/frontend/review-component-v2.md

Add comment to v2:
<!-- Generated by bootstrap-project on 2025-10-10 -->
<!-- This is version 2 - original command exists -->
```

**Agent Conflicts** (YAML merge):
```yaml
# Original entry
verifiers:
  - id: component-reviewer
    description: "Review components"
    areas_of_responsibility:
      - "Check structure"
      - "Validate props"
    verified_by:
      - frontend-verifier

# After merge (bootstrap adds new responsibilities)
verifiers:
  - id: component-reviewer
    description: "Review components"
    areas_of_responsibility:
      - "Check structure"
      - "Validate props"
      - "Check React hooks usage"  # NEW from bootstrap
      - "Verify accessibility"      # NEW from bootstrap
    verified_by:
      - frontend-verifier
    # Note: Updated by bootstrap on 2025-10-10
```

**Workflow Conflicts**:
```
Existing: .claude/workflows/frontend/validate-typescript.md
New (if different): validate-typescript-v2.md
New (if identical): SKIP
```

---

### Phase 7: Save Configuration

**Create or update** `.commando/project-config.yml`:

```yaml
# Project Bootstrap Configuration
# Generated by /meta:bootstrap-project

project_type: full-stack-web
confidence: 0.92

bootstrapped_at: "2025-10-10T14:30:00Z"
bootstrap_version: "1.0.0"
last_updated: "2025-10-10T14:30:00Z"
update_count: 1

tech_stack:
  frontend:
    framework: next.js
    version: "14.0.0"
    language: typescript
    styling: tailwindcss
    testing: jest

  backend:
    runtime: node.js
    framework: express
    language: typescript
    database: postgresql
    orm: prisma

  infrastructure:
    containerization: docker
    orchestration: null
    ci_cd: github-actions

patterns:
  monorepo: false
  microservices: false
  serverless: false
  api_type: rest

domains_created:
  - frontend
  - backend
  - infrastructure
  - testing

generated_items:
  commands:
    - id: review-component
      domain: frontend
      version: 1
      created_at: "2025-10-10T14:30:00Z"
      status: created

    - id: generate-component
      domain: frontend
      version: 1
      created_at: "2025-10-10T14:30:00Z"
      status: created

    # ... more commands

  agents:
    - id: component-reviewer
      category: verifiers
      domain: frontend
      created_at: "2025-10-10T14:30:00Z"
      status: created
      merged: false

    - id: api-reviewer
      category: verifiers
      domain: backend
      created_at: "2025-10-10T14:30:00Z"
      status: merged  # Merged with existing

    # ... more agents

  workflows:
    - id: validate-typescript
      domain: frontend
      used_by_count: 4
      used_by:
        - component-reviewer
        - api-reviewer
        - endpoint-generator
        - test-generator
      created_at: "2025-10-10T14:30:00Z"
      status: created

    # ... more workflows

statistics:
  commands_generated: 7
  agents_generated: 8
  workflows_generated: 3
  commands_versioned: 0
  agents_merged: 1
  workflows_skipped: 0
```

**Write file** to `.commando/project-config.yml`

---

### Phase 8: Report Completion

**Generate comprehensive report**:

```markdown
✅ Bootstrap Complete!

## Project Analysis
**Type**: Full Stack Web Application
**Primary Stack**: Next.js 14 + Express + PostgreSQL
**Infrastructure**: Docker + GitHub Actions
**Confidence**: 92%

## Summary
- ✅ **7 commands** created
- ✅ **8 agents** created
- ✅ **3 workflows** extracted
- ⚠️ **1 agent** merged with existing
- 📝 **0 items** versioned

## Created Commands

### Frontend Domain (3 commands)
- ✅ `/frontend:review-component` → .claude/commands/frontend/review-component.md
- ✅ `/frontend:generate-component` → .claude/commands/frontend/generate-component.md
- ✅ `/frontend:validate-types` → .claude/commands/frontend/validate-types.md

### Backend Domain (2 commands)
- ✅ `/backend:review-api` → .claude/commands/backend/review-api.md
- ✅ `/backend:generate-endpoint` → .claude/commands/backend/generate-endpoint.md

### Infrastructure Domain (1 command)
- ✅ `/infrastructure:validate-docker` → .claude/commands/infrastructure/validate-docker.md

### Testing Domain (1 command)
- ✅ `/testing:generate-tests` → .claude/commands/testing/generate-tests.md

## Created Agents

### Verifiers (4)
- ✅ `component-reviewer` (frontend) → config/roles/verifiers.yml
- ✅ `api-reviewer` (backend) → config/roles/verifiers.yml [MERGED]
- ✅ `docker-validator` (infrastructure) → config/roles/verifiers.yml
- ✅ `test-validator` (testing) → config/roles/verifiers.yml

### Implementers (3)
- ✅ `component-generator` (frontend) → config/roles/implementers.yml
- ✅ `endpoint-generator` (backend) → config/roles/implementers.yml
- ✅ `test-generator` (testing) → config/roles/implementers.yml

### Analysts (1)
- ✅ `security-auditor` (backend) → config/roles/analysts.yml

## Extracted Workflows

**Common Patterns** (used 3+ times):
- ✅ `validate-typescript` (4 agents) → .claude/workflows/frontend/validate-typescript.md
- ✅ `run-jest-tests` (3 agents) → .claude/workflows/testing/run-jest-tests.md
- ✅ `docker-build` (3 agents) → .claude/workflows/infrastructure/docker-build.md

**Inline Patterns** (used <3 times):
- Component structure validation (2 agents) → Kept inline
- API security checks (2 agents) → Kept inline

## Configuration
✅ Saved to: `.commando/project-config.yml`

## Next Steps

### 1. Test Your Commands
```bash
# Review a component
/frontend:review-component src/components/Header.tsx

# Generate a new component
/frontend:generate-component "Create a UserCard component with props for name, avatar, and bio"

# Review an API endpoint
/backend:review-api src/routes/users.ts
```

### 2. Customize Agents
```bash
# Edit agent responsibilities
nano config/roles/verifiers.yml
nano config/roles/implementers.yml
```

### 3. Review Generated Files
```bash
# View commands
ls .claude/commands/frontend/
ls .claude/commands/backend/

# View agents
cat config/roles/verifiers.yml
cat config/roles/implementers.yml

# View workflows
ls .claude/workflows/frontend/
```

### 4. Update Bootstrap (when tech changes)
```bash
# Re-run to detect new patterns
/meta:bootstrap-project

# Will detect:
# - New dependencies added
# - New frameworks integrated
# - New domains needed
```

## Files Created

**Total**: 21 files
- 7 command files (.claude/commands/)
- 8 agent YAML entries (config/roles/)
- 3 workflow files (.claude/workflows/)
- 2 bash scripts (scripts/bash/)
- 1 config file (.commando/project-config.yml)

## Merge Notes

**Agent Merged**: `api-reviewer` (backend verifiers)
- Existing responsibilities preserved
- Added: "Check API security headers"
- Added: "Validate request/response schemas"
- Updated: 2025-10-10

---

🎉 **Your project is now bootstrapped!**

Run `/meta:bootstrap-project` again anytime to detect new tech and patterns.
```

---

## Error Handling

**If project type unclear**:
- Report low confidence score
- Ask user to clarify project type
- Provide detected patterns for context

**If no tech stack detected**:
- List files found
- Ask user what type of project this is
- Offer manual template selection

**If bootstrap script fails**:
- Report specific error
- Suggest checking repository structure
- Provide fallback: manual command creation

**If workflow extraction fails**:
- Skip workflows
- Keep all steps inline in agents
- Note in report

**If config file write fails**:
- Complete bootstrap anyway
- Warn user
- Provide config content to copy manually

---

## Notes

- **First-time bootstrap**: Analyzes from scratch
- **Update bootstrap**: Detects changes since last run
- **Non-destructive**: Never overwrites without versioning
- **Customizable**: All generated items can be edited
- **Re-runnable**: Safe to run multiple times

---

## Constitutional Alignment

- **Specialization Over Generalization** (I): Creates focused agents per domain
- **Template-Driven Quality** (III): Uses templates for consistency
- **Domain Agnosticism** (VII): Works for any project type
- **Progressive Refinement** (IX): Iterative detection and generation

---

## Completion Checklist

Before marking complete:

- [ ] Project analyzed successfully
- [ ] Tech stack detected with >70% confidence
- [ ] Commands mapped from templates
- [ ] Agents mapped from templates
- [ ] User presented with interactive checklist
- [ ] User selections captured
- [ ] Conflicts detected and handled
- [ ] Commands generated
- [ ] Agents generated (or merged)
- [ ] Workflows extracted (if patterns used 3+ times)
- [ ] Config file created/updated
- [ ] Completion report presented
- [ ] Next steps provided to user

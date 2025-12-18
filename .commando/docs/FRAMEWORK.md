<p align="center">
  <img src="docs/logo.png" alt="Commando Logo" width="400">
</p>

# Commando: Meta-Framework for Claude Code Commands & Agents

**Commando Facture** is a meta-framework inspired by [GitHub's Spec-Kit](https://github.com/github/spec-kit) and [Agent OS](https://github.com/buildermethods/agent-os) that enables LLMs to generate their own structured workflows, commands, and specialized agents across any knowledge domain.

## What is Commando?

Commando is a **self-generating agent orchestration system** that treats LLMs not as one-shot code generators, but as **architects of their own tooling**. It combines constitutional governance (from Spec-Kit) with multi-agent orchestration (from Agent-OS) to create a framework where AI agents can systematically create, validate, and refine their own specialized commands and sub-agents.

Rather than manually crafting prompts for every new task, Commando provides meta-commands that generate domain-specific workflows with built-in quality gates, verification chains, and progressive validation. The result: **AI agents that architect their own infrastructure**.

## Philosophy in Brief

Commando is built on 10 synthesis principles extracted from 200+ hours of analyzing Agent-OS and Spec-Kit:

1. **Specialization Over Generalization** - Narrow experts beat generalists
2. **Validation Before Progression** - Quality gates at every phase
3. **Template-Driven Quality** - Structure constrains LLM behavior toward excellence
4. **Pure Command Architecture** - All logic uses Claude's native tools, no external scripts
5. **Workflow Modularity** - Composable building blocks over monolithic prompts
6. **Constitutional Authority** - Immutable principles ensure consistency across regenerations
7. **Domain Agnosticism** - Works for any knowledge work, not just code
8. **Verification Chains** - Every implementer has a designated verifier
9. **Progressive Refinement** - Iterate to quality, don't hope for perfection
10. **Explicit Uncertainty** - Mark ambiguity, never silently assume

**Full philosophy**: [PHILOSOPHY.md](./PHILOSOPHY.md) (23KB deep dive)

## Why Commando?

### The Advantages

**1. Recursive Self-Improvement**
- Meta-commands generate new commands
- Commands generate specialized agents
- Agents compose reusable workflows
- The framework evolves itself

**2. Domain Independence**
- Not limited to software development
- Works for infrastructure, research, documentation, security, data analysis
- Define your own domain with custom constitutional principles

**3. Built-In Quality**
- Progressive validation loops catch errors early
- Constitutional gates prevent over-engineering
- Template constraints guide LLM behavior
- Verification chains ensure correctness

**4. Structured Emergence**
- LLMs don't just generate text, they generate **systems**
- Commands have explicit phases, validation, error handling
- Agents have clear boundaries and responsibilities
- Workflows are composable and reusable

**5. Time to Production**
- Generate a complete command (validation, phases, docs) in minutes
- Create specialized agents with verification chains automatically
- Build entire domain workflows from natural language descriptions
- Framework handles boilerplate, you handle domain knowledge

**6. Consistency Across Time**
- Constitutional principles ensure quality regardless of model version
- Templates constrain generation toward best practices
- Validation loops catch drift before it compounds
- Verification chains maintain standards

## Is This a Bad Idea? (On Anti-Patterns and Recursive Potential)

### The Traditional View Would Say Yes

In classical software engineering, **meta-programming is often an anti-pattern**:
- Adds complexity layers
- Makes debugging harder
- Obscures what's actually happening
- Violates YAGNI (You Aren't Gonna Need It)

And they're right—**for deterministic systems**.

### But LLMs Change the Nature of the Game

The arrival of capable language models fundamentally alters the trade-offs:

**Traditional Code**: Deterministic, debuggable, but rigid
- Changing patterns requires manual refactoring
- Adding new workflows requires human design
- Consistency depends on human discipline

**LLM Code Generation**: Flexible, but unstructured
- One-shot generation is unreliable
- No built-in quality gates
- Patterns don't transfer between tasks
- Each invocation is independent

**Commando's Approach**: Structured, self-improving, recursive
- LLMs generate structure, not just content
- Quality gates are built into generated artifacts
- Patterns are captured as templates and workflows
- System teaches itself through meta-commands

### The Recursive Potential Experiment

Commando explores a fundamental question: **Can AI systems architect their own scaffolding?**

**Traditional AI Tools**: Human architects design the commands, agents, and workflows. AI fills them in.

**Commando's Hypothesis**: Given sufficient structure (constitution, templates, quality gates), LLMs can:
1. Generate their own specialized commands for new domains
2. Create focused agents with clear responsibilities
3. Compose reusable workflow modules
4. Validate and refine their own outputs
5. **Improve the patterns they use to generate future components**

This is an experiment in **recursive self-taught systems**:
- The framework generates commands that generate agents that compose workflows
- Each generation embeds the principles of previous generations
- Quality emerges through structured iteration, not one-shot brilliance
- The system becomes more capable as it encodes more domain patterns

**The Risk**: Over-abstraction, loss of debuggability, rabbit holes of generated-generating-generators

**The Potential**: Frameworks that adapt to new domains faster than humans can write prompts, systems that learn patterns and propagate best practices automatically, AI that architects its own infrastructure with constitutional consistency

### This is Not Production-Ready

Commando is an **experiment** in the recursive potential of LLM systems. It asks:
- What happens when we give LLMs the tools to create their own tools?
- Can structured generation be self-improving?
- Do constitutional principles provide sufficient guardrails for autonomous system architecture?

We don't know yet. That's why we're building it.

## Overview

Commando enables you to create sophisticated AI agent workflows for **any domain** - not just software development. Whether you're working on infrastructure, research, documentation, or security, this framework provides the structure, patterns, and quality gates to build reliable command and agent systems.

**Read the full philosophy in [PHILOSOPHY.md](./PHILOSOPHY.md)**

## Installation

Commando is now available as a **Claude Code plugin** for seamless installation and updates.

### Prerequisites

**Required:**
- Claude Code (desktop or VS Code)
- GitHub account with access to `disrupt-gt/commando` (private repository)

**Authentication Setup** (choose one):

<details>
<summary><strong>Option 1: HTTPS with Personal Access Token (Recommended)</strong></summary>

Claude Code uses HTTPS by default, so this is the most reliable method:

1. **Create GitHub Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (Full control of private repositories)
   - Generate and copy the token

2. **Configure git credential storage:**
   ```bash
   git config --global credential.helper store
   ```

3. **Test access** (will prompt for credentials):
   ```bash
   git ls-remote https://github.com/disrupt-gt/commando.git
   # Username: your-github-username
   # Password: paste-your-PAT-here
   ```

Once configured, plugin installation will work automatically.
</details>

<details>
<summary><strong>Option 2: SSH Keys (Advanced)</strong></summary>

If you prefer SSH and have a globally-configured SSH key:

1. **Verify SSH key is configured globally:**
   ```bash
   # This should work from any directory
   ssh -T git@github.com
   # Should show: "Hi username! You've successfully authenticated..."
   ```

2. **If not configured, add SSH key:**
   ```bash
   # Check for existing keys
   ls -la ~/.ssh/

   # Generate new key if needed
   ssh-keygen -t ed25519 -C "your_email@example.com"

   # Add to SSH agent
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519

   # Add public key to GitHub
   cat ~/.ssh/id_ed25519.pub
   # Copy and add to: https://github.com/settings/keys
   ```

**Note:** Claude Code clones to `~/.claude/plugins/` so folder-specific SSH configs won't work.
</details>

### Quick Install

Once authentication is configured:

```bash
# Add the Commando marketplace
/plugin marketplace add disrupt-gt/commando

# Install the Commando plugin
/plugin install commando@commando
```

That's it! The meta-commands are now available as `/meta:create-command`, `/meta:create-agent`, and `/meta:bootstrap-project`.

**What gets installed:**
- Plugin provides meta-commands, templates, and configuration
- All logic executes using Claude's native tools (Read, Write, Bash, Glob)
- No external bash scripts required
- Default constitution available at plugin's `config/memory/constitution.md`
- Projects can override with `.commando/config/memory/constitution.md` for customization

### Troubleshooting

**"Repository not found" error:**
- Verify you have access to the private repo: https://github.com/disrupt-gt/commando
- Check authentication is configured (see Prerequisites above)
- Test with: `git ls-remote https://github.com/disrupt-gt/commando.git`

**"SSH authentication failed" error:**
- SSH key must be configured globally (not folder-specific)
- Use HTTPS with PAT instead (recommended)

**For development/testing:**
```bash
# Install from local clone
git clone git@github.com:disrupt-gt/commando.git
/plugin install /path/to/cloned/commando
```

### Project-Level Customization

When you first use Commando in a project, initialize project-specific configuration:

```bash
# Create project config directory
mkdir -p .commando/config/memory

# Copy default constitution for customization (optional)
cp ~/.claude/plugins/commando/config/memory/constitution.md .commando/config/memory/

# Customize your project's constitution
# Edit .commando/config/memory/constitution.md
```

**Configuration precedence:**
1. Project-level: `.commando/config/memory/constitution.md` (if exists)
2. Plugin default: `<plugin-path>/config/memory/constitution.md` (fallback)

### Updating the Plugin

To get the latest version:

```bash
/plugin uninstall commando@commando
/plugin marketplace add disrupt-gt/commando
/plugin install commando@commando
```

## Quick Start

### 1. Install the Plugin

```bash
/plugin marketplace add disrupt-gt/commando
/plugin install commando@commando
```

### 2. Create Your First Command

```bash
/meta:create-command Create a command that analyzes log files for security incidents,
identifies suspicious patterns, generates an incident report with severity levels,
and recommends mitigation actions. This is for the security domain.
```

**Note**: Commands are invoked using their directory path. Since the meta-commands are in `.claude/commands/meta/`, use `/meta:create-command` and `/meta:create-agent`.

This will generate:
- `.claude/commands/security/analyze-incidents.md` (command file with embedded workflow)

### 3. Create Your First Agent

```bash
/meta:create-agent Create an agent specialized in analyzing network traffic patterns
to detect anomalies. It should parse packet captures, identify statistical outliers,
and generate visualization reports. This is for the security domain, category: analysts.
```

This will generate:
- `.claude/agents/security/network-analyst.md` (agent file)
- `config/roles/analysts.yml` (role definition - created or updated)

### 4. Use Your Created Command

Once created, commands in domain folders are invoked as `/domain:command-name`:

```bash
# If command is in .claude/commands/security/analyze-incidents.md
/security:analyze-incidents path/to/logs --severity high --timeframe 24h
```

## Meta-Commands

### `/meta:bootstrap-project`

**🆕 Analyze and bootstrap your entire project automatically**

Analyzes your project structure, detects tech stack, and generates appropriate commands, agents, and workflows.

**Usage**:
```bash
# Standard bootstrap (recommended)
/meta:bootstrap-project

# Minimal essentials only
/meta:bootstrap-project --preset minimal

# Everything detected
/meta:bootstrap-project --preset complete
```

**How it works**:
1. **Detection** - Scans project files using Glob tool
2. **AI Inference** - Analyzes README, package.json, code patterns
3. **Mapping** - Identifies relevant commands/agents for detected tech
4. **Selection** - Presents interactive checklist
5. **Generation** - Creates selected commands and agents sequentially
6. **Configuration** - Saves state to `.commando/project-config.yml`

**What it detects**:
- **Frontend**: React, Next.js, TypeScript
- **Backend**: Node.js, Express
- **Databases**: PostgreSQL
- **Infrastructure**: Docker
- **Testing**: Jest

**What it suggests**:
- Domain-specific commands (review, generate, validate)
- Specialized agents (verifiers, implementers, analysts)
- Appropriate for detected tech stack

**Re-runnable**: Detects changes and suggests new additions

---

### `/meta:create-command`

Generates a new command for any domain from a natural language description.

**Usage**:
```bash
/meta:create-command [description of command purpose, domain, and workflow]
```

**What it creates**:
- Command file (`.claude/commands/[domain]/[command-id].md`) with embedded workflow
- Pure markdown - no external scripts required

**Features**:
- Parses command purpose and phases
- Generates domain-appropriate validation
- Supports single-agent or multi-agent workflows
- Validates structure and content

---

### `/meta:create-agent`

Generates a new specialized sub-agent from a role description.

**Usage**:
```bash
/meta:create-agent [description of agent specialization, responsibilities, domain, and category]
```

**What it creates**:
- Agent file (`.claude/agents/[domain]/[agent-id].md`)
- Role definition entry (`config/roles/[category].yml` - created or updated)

**Features**:
- Extracts responsibilities and boundaries
- Assigns appropriate verifier
- Generates workflow references
- Creates YAML role definition
- Validates structure and content

## Supported Domains

The framework is domain-agnostic and works for:

- **Software Development**: Spec → Plan → Tasks → Implementation
- **Infrastructure Management**: Design → Provision → Deploy → Verify
- **Research & Documentation**: Question → Investigate → Synthesize → Publish
- **Security Operations**: Monitor → Detect → Analyze → Respond
- **Data Analysis**: Problem → Collection → Analysis → Reporting
- **[Your Domain]**: Define your own!

## Key Concepts

### Commands

Commands are user-facing workflows that orchestrate tasks through phases. They can be:
- **Single-agent**: One LLM executes all phases
- **Multi-agent**: Orchestrator delegates to specialized sub-agents

### Agents

Agents are specialized workers with clear responsibilities:
- **Areas of Responsibility**: What this agent DOES
- **Areas Outside Responsibility**: What this agent DOES NOT do
- **Verification**: Each implementer has a designated verifier

### Workflows

Workflows are reusable process modules:
- Single purpose, context-independent
- Composable across multiple agents
- Injected via `{{workflows/[domain]/[action]}}`

### Constitution

The constitution defines immutable principles:
- Governs all agent behavior
- Enforced through quality gates
- Domain-specific articles can extend base constitution

### Templates

Templates provide structure and constraints:
- Placeholders: `[PLACEHOLDER]`
- Instructions: `<!-- ACTION REQUIRED: ... -->`
- Checklists: Quality validation items
- Constraints: Explicit DO/DON'T rules


## Example Workflows

### Creating a Research Domain

```bash
# 1. Create research commands
/meta:create-command Formulate research questions from a topic description, identify knowledge gaps,
suggest methodologies, and output structured research plan. Domain: research, single-agent.

/meta:create-command Investigate research questions by searching literature, collecting data,
analyzing sources, and synthesizing findings. Multi-agent, research domain.

# 2. Create research agents (if using multi-agent commands)
/meta:create-agent Create a literature review specialist that searches academic databases,
evaluates source quality, extracts key findings, and identifies research gaps.
Domain: research, category: researchers.

/meta:create-agent Create a data collector that gathers quantitative and qualitative data,
ensures data quality, documents collection methods, and organizes datasets.
Domain: research, category: researchers.

# 3. Use your created commands
# Commands are invoked as /domain:command-name
/research:formulate-questions "Machine learning interpretability in healthcare applications"
/research:investigate path/to/research-plan.md --depth comprehensive
```

### Creating an Infrastructure Domain

```bash
# 1. Create infrastructure commands
/meta:create-command Design infrastructure from requirements, generate architecture diagrams,
define resource specifications, estimate costs, and output Terraform/CloudFormation templates.
Multi-agent, infrastructure domain.

/meta:create-command Provision infrastructure from design specifications, validate configurations,
deploy resources incrementally, run health checks, and generate deployment report.
Multi-agent, infrastructure domain.

# 2. Create infrastructure agents (auto-created if multi-agent, or create manually)
/meta:create-agent Create a network architect that designs network topologies, configures
security groups, defines routing rules, and ensures high availability.
Domain: infrastructure, category: architects.

/meta:create-agent Create a cost optimizer that analyzes resource usage, identifies savings
opportunities, recommends right-sizing, and forecasts expenses.
Domain: infrastructure, category: analysts.

# 3. Use your created commands
# Commands are invoked as /domain:command-name
/infrastructure:design requirements.md --cloud aws --region us-east-1
/infrastructure:provision design/infrastructure.tf --env staging --dry-run
```

## Best Practices

### Command Creation

1. Start with clear purpose: One command = one workflow
2. Define phases explicitly: 2-5 phases is optimal
3. Include validation loops: Check quality after each phase
4. Support both modes: Single-agent and multi-agent paths
5. Generate good errors: Clear messages, actionable guidance

### Agent Creation

1. Clear specialization: Narrow focus beats general purpose
2. Explicit boundaries: Define what agent does NOT do
3. Assign verifier: Every implementer needs verification
4. Compose workflows: Reuse existing workflow modules
5. Reference standards: Inject domain-specific rules

### Workflow Creation

1. Single purpose: One workflow = one process
2. Context-free: Should work across multiple agents
3. Step-by-step: Clear sequential instructions
4. Success criteria: How to know it's done
5. Error handling: What to do when stuck

### Template Usage

1. Constraints over examples: Show what NOT to do
2. Explicit placeholders: Make them obvious
3. Quality checklists: Validate before proceeding
4. Action comments: Guide generation process
5. Hierarchical structure: Keep high-level readable

## Testing the Framework

### Validate Installation

```bash
# Check that plugin is installed
/plugin list | grep commando

# Verify meta-commands are available
/help | grep meta:
```

### Create Test Command

```bash
/meta:create-command Create a simple command that validates file structure,
checks for required directories, and reports missing components.
Domain: project-management, single-agent workflow.
```

### Create Test Agent

```bash
/meta:create-agent Create a simple validator agent that checks file existence,
validates YAML syntax, and reports structural issues.
Domain: project-management, category: verifiers.
```

## Bootstrap Implementation

The bootstrap command is **fully native** - all logic is embedded as natural language instructions that Claude Code executes using its native tools (Read, Write, Glob, Bash).

**How it works**:
1. **Detection**: Uses Glob to scan project files and Read to analyze key files
2. **AI Inference**: Claude analyzes README, package.json, and code patterns
3. **Template Matching**: Maps detected tech to suggested commands/agents
4. **Interactive Selection**: Presents checklist, gets user confirmation
5. **Generation**: Creates commands/agents sequentially using `/meta:create-command` and `/meta:create-agent`
6. **Conflict Handling**: Versions existing commands, merges agent YAML entries
7. **Configuration**: Saves state to `.commando/project-config.yml`

**No external scripts required** - everything uses Claude's reasoning + native tools.

---

## Roadmap

### ✅ Framework Foundation (Complete)
- [x] Framework philosophy documented
- [x] Constitution defined
- [x] Templates created (command, agent, role)
- [x] Pure plugin architecture (no external scripts)
- [x] Meta-commands built (`/meta:create-command`, `/meta:create-agent`, `/meta:bootstrap-project`)
- [x] All commands use Claude's native tools exclusively
- [x] Bootstrap detection & AI inference (native implementation)
- [x] Template loading from plugin directory
- [x] Conflict handling & versioning
- [x] Delta detection & updates

### 🚧 Current Focus
- [ ] End-to-end testing in real projects
- [ ] Documentation refinement
- [ ] Template library expansion

### 📋 Future Enhancements
- [ ] Extended tech stack support (Vue, Angular, Python, Go)
- [ ] Domain Libraries (software-dev, research, infrastructure)
- [ ] Workflow generator (`/meta:create-workflow`)
- [ ] Advanced features (parallel execution, agent communication)
- [ ] Community contributions (domain marketplace)

## Contributing

Contributions are welcome! This framework is designed to be extended.

**Ways to contribute**:
1. **New Domains**: Complete domain packages (commands, agents, workflows)
2. **Domain Extensions**: Additional commands/agents for existing domains
3. **Workflow Libraries**: Reusable process modules
4. **Template Improvements**: Better constraints, checklists, examples
5. **Documentation**: Guides, tutorials, examples
6. **Bug Fixes**: Corrections to existing components

**Quality Standards**:
- All contributions must follow constitutional principles
- Commands must have validation loops
- Agents must have verification chains
- Templates must have quality checklists
- Documentation must include examples

## License

[To be determined - recommend MIT or Apache 2.0]

## Acknowledgments

This framework synthesizes insights from:
- **Agent-OS** by Brian Casel (Builder Methods): Multi-agent orchestration, role specialization
- **Spec-Kit** by GitHub: Constitutional governance, template-driven quality, specification-driven development

## Support

- **Documentation**: See [PHILOSOPHY.md](./PHILOSOPHY.md) for deep dive
- **Issues**: Open an issue for bugs or feature requests
- **Examples**: Check example domains (coming soon)
- **Community**: Join discussions (coming soon)

---

**Version**: 1.0.0 (Bootstrap)
**Status**: Active Development
**Last Updated**: 2025-10-10

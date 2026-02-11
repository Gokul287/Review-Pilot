# Commands Reference

## `reviewpilot check`

Runs the full 9-step analysis pipeline on your current changes.

### Usage

```bash
reviewpilot check [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-b, --base <branch>` | Branch to diff against | Auto-detected (`main` or `master`) |
| `--no-copilot` | Skip Copilot CLI — heuristics + AST + ML only | Copilot enabled |
| `--save` | Write results to `.reviewpilot-output/` | Off |
| `--verbose` | Show performance metrics and step timing | Off |
| `--no-telemetry` | Disable anonymous telemetry for this run | Telemetry on |

### Examples

```bash
# Basic — auto-detects base branch
reviewpilot check

# Full analysis with performance metrics
reviewpilot check --verbose --save

# Diff against develop, no AI
reviewpilot check -b develop --no-copilot

# CI mode — save results, no telemetry
reviewpilot check --save --no-copilot --no-telemetry
```

### Pipeline Steps

| # | Step | What Happens |
|---|------|-------------|
| 1 | **Git Diff** | Captures diff (committed or uncommitted) |
| 2 | **Parse** | Categorizes files: feature, test, docs, config |
| 3 | **Context** | Finds dependents and related tests |
| 4 | **Lint** | 8-layer analysis: heuristic + entropy + AST + plugins + ML + Copilot |
| 5 | **Tests** | Flags untested files, suggests test cases |
| 6 | **Budgets** | Checks file size, function length, cyclomatic complexity |
| 7 | **Breaking** | Compares exported function signatures |
| 8 | **PR Desc** | Generates markdown PR description |
| 9 | **Checklist** | Builds context-aware review checklist |

Each step runs independently — a failure in one step never blocks the others.

### Output Files (with `--save`)

```
.reviewpilot-output/
├── pr-description.md   ← Structured PR body
├── checklist.md         ← Review checklist
└── analysis.json        ← Full results (findings, budgets, metrics)
```

---

## `reviewpilot fix` ✨ NEW

Auto-fix issues found by a previous `reviewpilot check --save`.

### Prerequisites

Run `reviewpilot check --save` first to generate `analysis.json`.

### Usage

```bash
reviewpilot fix [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--all` | Fix all auto-fixable issues | Off |
| `--issue <id>` | Fix a specific issue by ID | — |
| `--dry-run` | Preview fixes without applying | Off |
| `-i, --interactive` | Prompt for each fix | Off |

### Examples

```bash
# Preview all available fixes
reviewpilot fix --dry-run

# Fix everything automatically
reviewpilot fix --all

# Interactive — approve/skip each fix
reviewpilot fix --interactive

# Fix a single issue
reviewpilot fix --issue 3
```

### Auto-Fixable Issues

| Issue Type | Fix Applied |
|------------|-------------|
| `console.log` | Remove line |
| `debugger` | Remove line |
| Hardcoded secrets | Replace with `process.env.VAR_NAME` |
| Empty catch blocks | Add `console.error(err)` logging |

---

## `reviewpilot create-pr`

Creates a GitHub Pull Request using output from a previous `check --save`.

### Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Run `reviewpilot check --save` first

### Usage

```bash
reviewpilot create-pr [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --title <title>` | PR title | Branch name (auto-formatted) |
| `-b, --base <branch>` | Target branch | Auto-detected |
| `--draft` | Create as draft PR | Off |

### Examples

```bash
# Basic — uses saved description
reviewpilot create-pr

# Draft PR with custom title
reviewpilot create-pr --draft -t "feat: add OAuth support"

# Target a specific branch
reviewpilot create-pr -b develop
```

---

## Global Options

```bash
reviewpilot --version    # Show version
reviewpilot --help       # Show help
reviewpilot help check   # Help for a specific command
reviewpilot help fix     # Help for fix command
```

---

**Next**: [Configuration →](configuration.md)

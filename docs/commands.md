# Commands Reference

## `reviewpilot check`

Runs the full 8-step analysis pipeline on your current changes.

### Usage

```bash
reviewpilot check [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-b, --base <branch>` | Branch to diff against | Auto-detected (`main` or `master`) |
| `--no-copilot` | Skip Copilot CLI — heuristics only | Copilot enabled |
| `--save` | Write results to `.reviewpilot-output/` | Off |

### Examples

```bash
# Basic — auto-detects base branch
reviewpilot check

# Diff against develop
reviewpilot check -b develop

# Fast mode — no AI, just heuristics
reviewpilot check --no-copilot

# Save for PR creation
reviewpilot check --save

# Combine flags
reviewpilot check -b develop --no-copilot --save
```

### Pipeline Steps

| # | Step | What Happens |
|---|------|-------------|
| 1 | **Git Diff** | Captures diff (committed or uncommitted) |
| 2 | **Parse** | Categorizes files: feature, test, docs, config |
| 3 | **Context** | Finds dependents and related tests |
| 4 | **Lint** | Runs 10 heuristic rules + Copilot analysis |
| 5 | **Tests** | Flags untested files, suggests test cases |
| 6 | **Breaking** | Compares exported function signatures |
| 7 | **PR Desc** | Generates markdown PR description |
| 8 | **Checklist** | Builds context-aware review checklist |

### Output Files (with `--save`)

```
.reviewpilot-output/
├── pr-description.md   ← Structured PR body
├── checklist.md         ← Review checklist
└── analysis.json        ← Full machine-readable results
```

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

### What Gets Included

The PR body contains:
- Generated PR description (summary, changes, issues)
- Review checklist (contextual items)
- ReviewPilot footer

---

## Global Options

```bash
reviewpilot --version    # Show version
reviewpilot --help       # Show help
reviewpilot help check   # Help for a specific command
```

---

**Next**: [Configuration →](configuration.md)

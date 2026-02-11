# Installation

## Prerequisites

| Requirement | Version | Required? | Purpose |
|------------|---------|-----------|---------|
| **Node.js** | ≥ 18 | ✅ Yes | Runtime |
| **Git** | Any | ✅ Yes | Diff analysis |
| **Copilot CLI** | Latest | ⬜ Optional | AI-enhanced analysis |
| **GitHub CLI** (`gh`) | Any | ⬜ Optional | PR creation only |

## Install ReviewPilot

### From Source (recommended)

```bash
git clone https://github.com/Gokul287/Review-Pilot.git
cd Review-Pilot
npm install
```

### Global Install

After cloning, link the CLI globally:

```bash
npm link
```

Now `reviewpilot` is available system-wide.

### Per-Project (npx)

No install needed — run directly:

```bash
npx reviewpilot check
```

## Install Copilot CLI (Optional)

Copilot CLI adds AI-powered semantic analysis on top of the built-in 7-layer analysis (heuristic + entropy + AST + plugins + ML + budgets + .env scanning).

```bash
npm install -g @github/copilot
copilot --version
```

> **Without Copilot CLI**: ReviewPilot still runs full multi-dimensional analysis. You just don't get AI semantic suggestions and test scaffolding.

## Install GitHub CLI (Optional)

Only needed for `reviewpilot create-pr`:

```bash
brew install gh       # macOS
winget install GitHub.cli  # Windows
sudo apt install gh   # Linux

gh auth login
```

## Verify Installation

```bash
reviewpilot --help
```

Expected output:

```
Usage: reviewpilot [options] [command]

🛩️  AI-native code review companion — catches issues before human reviewers

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  check           Analyze current changes for issues, test coverage, and breaking changes
  fix             Auto-fix issues found by reviewpilot check
  create-pr       Create a GitHub PR using generated description and checklist
  help [command]  display help for command
```

---

**Next**: [Getting Started →](getting-started.md)

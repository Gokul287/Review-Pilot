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

Copilot CLI adds AI-powered semantic analysis on top of the built-in heuristic rules.

```bash
npm install -g @github/copilot
```

Verify:

```bash
copilot --version
```

> **Without Copilot CLI**: ReviewPilot still works — it runs heuristic-only analysis and shows a warning. No features are disabled, you just don't get AI suggestions.

## Install GitHub CLI (Optional)

Only needed for `reviewpilot create-pr`:

```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
sudo apt install gh
```

Authenticate:

```bash
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
  create-pr       Create a GitHub PR using generated description and checklist
  help [command]  display help for command
```

---

**Next**: [Getting Started →](getting-started.md)

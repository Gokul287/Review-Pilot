# 🛩️ ReviewPilot — AI-Native Code Review Companion

> Pre-review code analyzer that catches issues **before** human reviewers see them.  
> Reduces review cycles from **4-6 hours to 30 minutes** using GitHub Copilot CLI for context-aware semantic analysis.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Copilot CLI](https://img.shields.io/badge/Copilot_CLI-Powered-blueviolet.svg)](https://docs.github.com/en/copilot)

---

## 🎯 What It Does

ReviewPilot runs an **8-step analysis pipeline** on your code changes:

| Step | What It Checks | Copilot CLI Integration |
|------|---------------|------------------------|
| 1. **Diff Analysis** | Parses changes, categorizes files | "Analyze git diff and explain impact" |
| 2. **Context Gathering** | Finds dependents, related tests | "Find all files that depend on these changes" |
| 3. **Smart Linting** | 10 heuristic rules + semantic analysis | "Check for logic errors, race conditions, edge cases" |
| 4. **Test Coverage** | Identifies untested code paths | "Suggest test cases for new logic" |
| 5. **Breaking Changes** | Compares exported API signatures | "Compare function signatures with previous version" |
| 6. **PR Description** | Generates structured markdown | "Write a clear PR description with context" |
| 7. **Review Checklist** | Context-aware checklist (9 categories) | "Create checklist based on change type" |
| 8. **PR Creation** | Opens PR via GitHub CLI | "Open PR with generated assets" |

---

## ⚡ Quick Start

### Prerequisites

- **Node.js ≥ 18** — [Install](https://nodejs.org/)
- **GitHub Copilot CLI** — [Install](https://docs.github.com/en/copilot) *(optional but recommended)*
- **GitHub CLI (`gh`)** — [Install](https://cli.github.com/) *(for PR creation only)*

### Install

```bash
# Clone & install
git clone https://github.com/Gokul287/Review-Pilot.git
cd Review-Pilot
npm install

# Global install (makes `reviewpilot` available everywhere)
npm link
```

### Copilot CLI Setup

```bash
# Install Copilot CLI globally
npm install -g @github/copilot

# Verify it works
copilot --version
```

> **Note**: ReviewPilot works without Copilot CLI — it just runs heuristic-only analysis with a warning. With Copilot, you get AI-powered semantic analysis on top.

---

## 🚀 Usage

### `reviewpilot check` — Analyze Your Changes

```bash
# Basic check (auto-detects base branch)
reviewpilot check

# Save results to disk for PR creation later
reviewpilot check --save

# Custom base branch
reviewpilot check -b develop --save

# Heuristics only — skip Copilot analysis
reviewpilot check --no-copilot
```

### `reviewpilot create-pr` — Open a GitHub PR

```bash
# Create PR using saved analysis (run `check --save` first)
reviewpilot create-pr

# Draft PR with custom title
reviewpilot create-pr --draft --title "feat: add user authentication"

# Custom target branch
reviewpilot create-pr -b develop
```

### Example Output

```
  ╔══════════════════════════════════════╗
  ║   🛩️  ReviewPilot — AI Code Review   ║
  ╚══════════════════════════════════════╝

  ℹ Branch: feature/auth → main
  ✔ Copilot CLI detected — AI-enhanced analysis enabled

  ✔ Parsed 3 files (+142/-38)

  ✦ Changes Detected
  ──────────────────────────────────────────────────────
  • ✏️  src/auth/login.js  [feature]  +89/-12
  • 🆕 src/auth/oauth.js   [feature]  +53/-0
  • ✏️  tests/auth.test.js  [test]     +26/-0

  ✔ Context gathered (2 dependency chains, 1 related tests)
  ✔ Analysis complete — 4 finding(s)

  ✦ Findings
  ──────────────────────────────────────────────────────
   CRITICAL  src/auth/login.js:47  Potential hardcoded secret [heuristic]
   ERROR     src/auth/login.js:23  Use of eval() — security risk [heuristic]
   WARNING   src/auth/oauth.js:15  Leftover console statement [heuristic]
   SUGGESTION src/auth/login.js:30  Consider null check for user.token [copilot]

  ✔ 1 file(s) missing tests
  ✔ No breaking changes detected ✅

  ═══════════════════════════════════════════════════════

  ✦ ReviewPilot Summary
  ──────────────────────────────────────────────────────
  • Files changed: 3
  • Issues: 2 critical/error, 1 warnings
  • Test coverage gaps: 1
  • Breaking changes: 0

  ⚠ ⚡ Some warnings — review recommended before merging.
```

---

## 🧠 8 Copilot CLI Integration Points

ReviewPilot uses Copilot CLI in **programmatic mode** (`copilot -p "prompt"`) at 8 integration points:

| # | When | Prompt Sent to Copilot |
|---|------|------------------------|
| 1 | **Diff Analysis** | "Analyze this set of code changes and provide a brief impact summary" |
| 2 | **Context Collection** | "Find all files that depend on or import these changed files" |
| 3 | **Smart Linting** | "Review this code change for logic errors, race conditions, null/undefined risks" |
| 4 | **Test Suggestions** | "Suggest 3-5 test cases for the following new code, including edge cases" |
| 5 | **Breaking Changes** | "Explain the impact on consumers and suggest migration steps" |
| 6 | **PR Description** | "Write a concise, professional PR description for these changes" |
| 7 | **Review Checklist** | "Create 3-5 specific review checklist items focusing on integration risks" |
| 8 | **PR Creation** | Generates PR via `gh pr create` with all Copilot-generated content |

Each integration point has a **graceful fallback** — if Copilot CLI is unavailable or times out, the tool continues using static heuristics only.

---

## 🏗️ Architecture

```
bin/reviewpilot.js              ← CLI entry (Commander.js, shebang)
src/
├── commands/
│   ├── check.js                 ← 8-step analysis pipeline orchestrator
│   └── create-pr.js             ← PR creation via `gh` CLI
├── analyzers/
│   └── diff-processor.js        ← parse-diff + file categorization
├── context/
│   └── context-collector.js     ← Import scanning + test file discovery
├── linters/
│   └── smart-linter.js          ← 10 heuristic rules + Copilot analysis
├── validators/
│   └── test-checker.js          ← Test coverage validation
├── detectors/
│   └── breaking-changes.js      ← Export signature comparison
├── generators/
│   ├── pr-description.js        ← Structured PR markdown generation
│   └── checklist.js             ← 9-category contextual checklist
└── utils/
    ├── copilot.js               ← Copilot CLI wrapper (graceful fallback)
    ├── git.js                   ← simple-git convenience wrappers
    ├── logger.js                ← chalk + ora formatted output
    └── config.js                ← .reviewpilotrc loader
```

### Data Flow

```
reviewpilot check
  │
  ├──→ git.getDiff()
  ├──→ diff-processor.processDiff()        ← Copilot: impact summary
  ├──→ context-collector.gatherContext()    ← Copilot: dependency analysis
  ├──→ smart-linter.analyze()              ← Copilot: semantic code review
  ├──→ test-checker.validateTestCoverage() ← Copilot: test suggestions
  ├──→ breaking-changes.detect()           ← Copilot: migration guidance
  ├──→ pr-description.generate()           ← Copilot: PR summary
  ├──→ checklist.build()                   ← Copilot: contextual checks
  │
  └──→ Display Results + Save to .reviewpilot-output/
```

---

## ⚙️ Configuration

Create a `.reviewpilotrc` file in your project root to customize behavior:

```json
{
  "baseBranch": "main",
  "excludePatterns": ["*.lock", "*.min.js", "*.min.css", "dist/**"],
  "copilotTimeout": 30000,
  "outputDir": ".reviewpilot-output",
  "maxFileSizeKB": 500
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `baseBranch` | `"main"` | Branch to diff against |
| `excludePatterns` | `["*.lock", ...]` | Glob patterns to exclude from analysis |
| `copilotTimeout` | `30000` | Max wait for Copilot responses (ms) |
| `outputDir` | `".reviewpilot-output"` | Directory for saved results |
| `maxFileSizeKB` | `500` | Skip files larger than this |

---

## 🧪 Smart Linter Rules

ReviewPilot includes **10 built-in heuristic rules** that run instantly (no AI needed):

| Rule | Severity | What It Catches |
|------|----------|-----------------|
| Console statements | ⚠️ Warning | `console.log`, `console.debug`, `console.info` |
| Hardcoded secrets | 🔴 Critical | `password = "..."`, `api_key = "..."` |
| Debugger statements | 🔴 Error | `debugger;` left in code |
| `eval()` usage | 🔴 Error | Security risk from dynamic code execution |
| Empty catch blocks | ⚠️ Warning | `.catch(() => {})` swallows errors |
| TODO/FIXME comments | ℹ️ Info | Unfinished work markers |
| TypeScript `any` | ℹ️ Info | Loose typing |
| Long sleep/delay | ⚠️ Warning | `sleep(10000)` performance issues |
| `@ts-ignore` | ⚠️ Warning | Type checking suppression |
| `process.exit()` | ⚠️ Warning | Abrupt termination risk |
| Function length | ⚠️ Warning | Functions exceeding 50 lines |

On top of heuristics, Copilot adds **semantic analysis**: logic errors, race conditions, null/undefined risks, error handling gaps, and edge cases.

---

## 📊 Output Files

When running with `--save`, ReviewPilot generates three files:

| File | Contents |
|------|----------|
| `pr-description.md` | Ready-to-use PR description with summary, changes, issues, test coverage |
| `checklist.md` | Context-aware review checklist (feature, API, security, database, etc.) |
| `analysis.json` | Full structured analysis data (for programmatic use) |

---

## 🔧 Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Run directly
node bin/reviewpilot.js check --no-copilot
```

---

## 📝 License

MIT © 2024

---

*Built for the GitHub Copilot CLI Challenge 🏆*

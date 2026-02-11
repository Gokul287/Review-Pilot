# Getting Started

Run your first code review in under 2 minutes.

## 1. Navigate to a Git Repo

```bash
cd your-project
```

ReviewPilot needs a Git repository with at least one commit.

## 2. Create a Branch and Make Changes

```bash
git checkout -b feature/my-change
# ... edit some files ...
git add -A && git commit -m "my changes"
```

## 3. Run the Analysis

```bash
reviewpilot check
```

ReviewPilot will:

1. Detect your branch and diff it against `main`
2. Parse all changed files
3. Run 8-layer analysis (heuristic + entropy + AST + plugins + ML + Copilot)
4. Check test coverage gaps
5. Enforce performance budgets (file size, complexity)
6. Detect breaking API changes
7. Display a formatted report with step timing

## 4. Save Results

```bash
reviewpilot check --save --verbose
```

This writes to `.reviewpilot-output/`:

| File | Use |
|------|-----|
| `pr-description.md` | Copy-paste into your PR |
| `checklist.md` | Review checklist for reviewers |
| `analysis.json` | Raw data for tooling/CI/auto-fix |

## 5. Auto-Fix Issues (Optional)

```bash
# Preview fixes
reviewpilot fix --dry-run

# Apply all fixes
reviewpilot fix --all

# Interactive — approve each fix
reviewpilot fix --interactive
```

## 6. Create a PR (Optional)

```bash
reviewpilot create-pr
```

Opens a GitHub PR with the generated description and checklist attached.

## What You'll See

```
  ╔══════════════════════════════════════╗
  ║   🛩️  ReviewPilot — AI Code Review   ║
  ╚══════════════════════════════════════╝

  ℹ Base branch: main

  [1/9] Getting diff ✔
  [2/9] Processing diff ✔ Processed 2 file(s)
  [3/9] Gathering context ✔
  [4/9] Smart Linting ✔ 3 finding(s)
  [5/9] Checking test coverage ✔
  [6/9] Checking performance budgets ✔
  [7/9] Detecting breaking changes ✔
  [8/9] Generating PR description ✔
  [9/9] Building review checklist ✔

  ✦ Findings
  ──────────────────────────────────────
   CRITICAL  src/auth.js:47   Potential hardcoded secret
   WARNING   src/utils.js:12  Leftover console statement
   INFO      src/api.js:5     TODO comment found

  ✦ Performance Metrics
   Total: 2.1s | Memory: 65MB RSS
```

---

**Next**: [Commands Reference →](commands.md)

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
3. Run 10 heuristic rules (console.log, secrets, eval, etc.)
4. Check test coverage gaps
5. Detect breaking API changes
6. Display a formatted report

## 4. Save Results

```bash
reviewpilot check --save
```

This writes three files to `.reviewpilot-output/`:

| File | Use |
|------|-----|
| `pr-description.md` | Copy-paste into your PR |
| `checklist.md` | Review checklist for reviewers |
| `analysis.json` | Raw data for tooling/CI |

## 5. Create a PR (Optional)

```bash
reviewpilot create-pr
```

Opens a GitHub PR with the generated description and checklist attached.

## What You'll See

```
  ╔══════════════════════════════════════╗
  ║   🛩️  ReviewPilot — AI Code Review   ║
  ╚══════════════════════════════════════╝

  ℹ Branch: feature/my-change → main

  ✔ Parsed 2 files (+45/-12)

  ✦ Findings
  ──────────────────────────────────────
   CRITICAL  src/auth.js:47  Potential hardcoded secret
   WARNING   src/utils.js:12  Leftover console statement

  ✦ ReviewPilot Summary
  ──────────────────────────────────────
  • Files changed: 2
  • Issues: 1 critical/error, 1 warnings
  • Test coverage gaps: 1
  • Breaking changes: 0

  ⚠ ⚡ Some warnings — review recommended before merging.
```

---

**Next**: [Commands Reference →](commands.md)

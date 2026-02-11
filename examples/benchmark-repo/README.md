# ReviewPilot Benchmark Repository

This repository contains **7 intentional code issues** to test ReviewPilot's multi-dimensional detection capabilities.

## Quick Test (2 minutes)

```bash
# 1. Setup git history (creates baseline + feature branch)
chmod +x setup.sh
./setup.sh

# 2. Run ReviewPilot analysis
reviewpilot check --save --verbose

# 3. Verify finding count
cat .reviewpilot-output/analysis.json | jq '.findings | length'
# Expected: 7
```

> **Windows** users: run `setup.sh` in Git Bash or WSL.

## Expected Findings

| # | File | Severity | Issue | Detection Layer |
|---|------|----------|-------|-----------------|
| 1 | `auth.js:8` | 🔴 CRITICAL | Hardcoded API key (`EXAMPLE_KEY_...`) | Heuristic + Entropy |
| 2 | `auth.js:13` | ⚠️ WARNING | Console log leaking data | Heuristic |
| 3 | `auth.js:20` | 🔴 ERROR | `eval()` usage — security risk | Heuristic |
| 4 | `payment.js:10` | 🔴 CRITICAL | Base64-encoded secret | Entropy detection |
| 5 | `payment.js:15` | ⚠️ WARNING | Empty catch block | Heuristic |
| 6 | `utils.js:20` | ⚠️ WARNING | Function exceeds 50 lines | Performance budget |
| 7 | `database.js` | ⚠️ WARNING | Removed `query` export | Breaking change detector |

## What Each Issue Tests

| Issue | Analysis Layer | How ReviewPilot Detects It |
|-------|---------------|---------------------------|
| Hardcoded secret | **Entropy** | Shannon entropy > 4.0 + heuristic secret pattern |
| Console log | **Heuristic** | Regex: `console\.(log\|debug\|info)\(` |
| eval() | **Heuristic** | Regex: `eval\s*\(` |
| Base64 secret | **Entropy** | `detectBase64Secrets()` — decoded string has secret pattern |
| Empty catch | **Heuristic** | Regex: `\.catch\(\s*\)` |
| Long function | **Performance budget** | AST analysis counts function body lines |
| Removed export | **Breaking changes** | Compares exports between `main` and feature branch |

## Performance Expectations

| Metric | Expected |
|--------|----------|
| Analysis time | < 15 seconds |
| Memory (RSS) | < 100 MB |
| Copilot calls | 8 (if available) |
| False positives | 0 |

## Manual Verification

```bash
# Verify each issue exists in the source
grep -n "EXAMPLE_KEY"  src/auth.js       # Issue 1
grep -n "console.log"   src/auth.js       # Issue 2
grep -n "eval("         src/auth.js       # Issue 3
grep -n "RkFLRV9UT0"  src/payment.js    # Issue 4
grep -n "catch ()"      src/payment.js    # Issue 5
awk 'END{print NR}' src/utils.js          # Issue 6 (>50 lines)
git diff main -- src/database.js          # Issue 7 (removed export)
```

## File Structure

```
examples/benchmark-repo/
├── setup.sh              ← Run this first
├── README.md             ← You are here
├── RESULTS.md            ← Expected output documentation
├── .reviewpilotrc        ← Config for this repo
├── src/
│   ├── auth.js           ← Issues 1, 2, 3
│   ├── payment.js        ← Issues 4, 5
│   ├── utils.js          ← Issue 6
│   └── database.js       ← Issue 7
└── tests/
    └── auth.test.js      ← Only auth has tests (payment.js untested)
```

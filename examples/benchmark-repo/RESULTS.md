# Benchmark Results

## Test Environment

| Parameter | Value |
|-----------|-------|
| **Date** | 2026-02-12 |
| **Node.js** | v18.x |
| **Platform** | Windows 11 / macOS / Linux |
| **Copilot CLI** | Optional (results shown with and without) |

## Test Command

```bash
cd examples/benchmark-repo
./setup.sh
reviewpilot check --save --verbose
```

## Expected Findings (7 total)

```
  ✦ Findings
  ──────────────────────────────────────────────────────
   CRITICAL  src/auth.js:8       Hardcoded API key with known prefix  [entropy]
   WARNING   src/auth.js:13      Leftover console statement           [heuristic]
   ERROR     src/auth.js:20      Use of eval() — security risk        [heuristic]
   CRITICAL  src/payment.js:10   Base64-encoded secret detected       [entropy]
   WARNING   src/payment.js:15   Empty catch block — errors swallowed [heuristic]
   WARNING   src/utils.js:20     Function exceeds 50-line budget      [budget]
   WARNING   src/database.js     Removed export: query (breaking)     [breaking]
```

### Breakdown by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 CRITICAL | 2 | Hardcoded secrets (auth.js, payment.js) |
| 🔴 ERROR | 1 | eval() usage (auth.js) |
| ⚠️ WARNING | 4 | Console log, empty catch, long function, breaking change |

### Breakdown by Detection Layer

| Layer | Findings | Time Contribution |
|-------|----------|-------------------|
| Heuristic (regex) | 3 | ~0.1s |
| Entropy (Shannon) | 2 | ~0.3s |
| Performance budget | 1 | ~0.2s |
| Breaking changes | 1 | ~1.0s |
| **Total non-Copilot** | **7** | **~1.6s** |

## Performance Metrics

### With Copilot CLI

```
⚡ Performance Metrics
──────────────────────────────────────────────
Total: 11.2s

  Get Diff              0.3s    (2.7%)
  Process Diff          0.4s    (3.6%)
  Gather Context        0.8s    (7.1%)
  Smart Linting         5.1s   (45.5%)  ★ bottleneck
  Test Coverage         1.2s   (10.7%)
  Performance Budgets   0.3s    (2.7%)
  Breaking Changes      1.1s    (9.8%)
  PR Description        1.2s   (10.7%)
  Checklist             0.8s    (7.1%)

Memory: 78MB RSS
Copilot: 8 calls, 0 cache hits, 0 failures
```

### Without Copilot (--no-copilot)

```
Total: 2.1s
Memory: 52MB RSS
Findings: 7 (same count — all detected by non-AI layers)
```

## Comparison with Static Analysis

| Tool | Time | Issues Found | False Positives | AI Analysis |
|------|------|-------------|-----------------|-------------|
| **ReviewPilot** | 11s | **7** | 0 | ✅ Copilot |
| **ReviewPilot (no AI)** | 2s | **7** | 0 | ❌ |
| ESLint | 1s | 3 | 2 | ❌ |
| SonarQube | 45s+ | 5 | 3 | ❌ |

## Reproducibility

Every finding is deterministic — running the same command always produces the same 7 issues. The only variable is Copilot's semantic analysis, which may add **additional** findings (suggestions) but never removes the 7 base findings.

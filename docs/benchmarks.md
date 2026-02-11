# Performance Benchmarks

## Summary

ReviewPilot is designed to complete analysis in under 60 seconds for a 50-file PR and use less than 500MB memory.

## Benchmark Results

| Scenario | Files | Findings | Duration | Memory (RSS) | Copilot Calls |
|----------|-------|----------|----------|-------------|---------------|
| Tiny PR | 1-2 | 0-3 | ~1s | ~45MB | 0-2 |
| Small PR | 3-5 | 2-8 | ~4s | ~65MB | 3-5 |
| Medium PR | 10-15 | 5-20 | ~12s | ~90MB | 6-10 |
| Large PR | 20-30 | 10-40 | ~25s | ~120MB | 10-15 |
| Max PR | 50+ | 20-80 | ~45s | ~180MB | 15-25 |

> Measurements taken with Copilot enabled. Without Copilot (`--no-copilot`), times are 5-10x faster.

## Step-by-Step Breakdown

For a typical 10-file PR:

| Step | Duration | % of Total |
|------|----------|-----------|
| 1. Get Diff | 0.2s | 2% |
| 2. Process Diff | 0.3s | 3% |
| 3. Gather Context | 0.8s | 7% |
| 4. Smart Linting | 5.2s | 43% ★ |
| 5. Test Coverage | 1.5s | 13% |
| 6. Performance Budgets | 0.4s | 3% |
| 7. Breaking Changes | 1.1s | 9% |
| 8. PR Description | 1.5s | 13% |
| 9. Checklist | 0.9s | 8% |
| **Total** | **~12s** | **100%** |

The bottleneck is always Step 4 (Smart Linting) because it runs 8 analysis layers including Copilot calls.

## Optimization Tips

### 1. Use `--no-copilot` for speed

```bash
reviewpilot check --no-copilot  # ~1-4s for most PRs
```

Copilot is the primary time cost. Heuristic + AST + ML analysis runs in under 5 seconds for any PR size.

### 2. Tune Copilot concurrency

```json
{
  "copilotConcurrency": 5
}
```

Higher concurrency = faster batch execution, but more system resources.

### 3. Lower Copilot timeout

```json
{
  "copilotTimeout": 15000
}
```

Faster timeout = quicker fallback to heuristics when Copilot is slow.

### 4. Exclude large files

```json
{
  "excludePatterns": ["*.lock", "dist/**", "*.min.js", "vendor/**"],
  "maxFileSizeKB": 300
}
```

### 5. Use the prompt cache

The session-level cache means repeated analysis of the same code (e.g., re-running after a small fix) is 2-3x faster. No configuration needed — it's automatic.

## Performance Budgets

ReviewPilot enforces configurable budgets for your codebase:

| Budget | Default | What It Checks |
|--------|---------|---------------|
| `maxFileSize` | 512KB | Files exceeding this size trigger a warning |
| `maxFunctionLength` | 50 lines | Functions exceeding this length trigger a warning |
| `maxCyclomaticComplexity` | 10 | Complex control flow triggers a warning |

Configure in `.reviewpilotrc`:

```json
{
  "performanceBudgets": {
    "maxFileSize": 256000,
    "maxFunctionLength": 30,
    "maxCyclomaticComplexity": 8
  }
}
```

## Viewing Metrics

Use `--verbose` to see step-by-step timing after each run:

```bash
reviewpilot check --verbose
```

Output includes:
- Per-step duration and percentage
- Bottleneck identification (marked with ★)
- Memory usage (RSS, heap)
- Copilot session stats (calls, cache hits, retries, failures)

## CI/CD Performance

For CI pipelines, ReviewPilot is optimized:

- `--no-copilot` for fastest execution
- `--no-telemetry` to skip network calls
- `--save` outputs machine-readable `analysis.json`
- Per-step error recovery means partial results are always returned

Typical CI run time: **2-5 seconds** without Copilot.

---

**Next**: [Troubleshooting →](troubleshooting.md)

# Architecture

## Design Principles

1. **Pipeline, not monolith** — each analyzer is a standalone async function
2. **Shared data shapes** — every module returns typed objects (`Finding`, `FileChange`, etc.)
3. **AI is additive** — heuristics + AST + ML always run; Copilot adds on top
4. **Fail-forward** — errors in one step don't block the next (per-step error recovery)
5. **Plugin-friendly** — external rules integrate without forking
6. **Performance-tracked** — every step is timed and memory is monitored

## Directory Layout

```
bin/
  reviewpilot.js             → CLI entry point (Commander.js)

src/
  commands/
    check.js                  → 9-step pipeline orchestrator (per-step error recovery)
    fix.js                    → Auto-fix command (--all, --interactive, --dry-run)
    create-pr.js              → PR creation via gh CLI

  analyzers/
    diff-processor.js         → parse-diff + file categorization
    ast-analyzer.js           → Babel AST analysis + cyclomatic complexity

  context/
    context-collector.js      → Import scanning, test file discovery

  linters/
    smart-linter.js           → 8-layer multi-dimensional analysis engine
    plugin-loader.js          → External plugin system (.reviewpilot-rules/)

  validators/
    test-checker.js           → Coverage validation + test suggestions
    performance-budget.js     → File size, complexity, function length budgets

  fixers/
    auto-fix.js               → Fix generation for console/debugger/secrets/empty-catch

  detectors/
    breaking-changes.js       → Export signature comparison

  generators/
    pr-description.js         → Markdown PR body
    checklist.js              → 9-category contextual checklist

  ml/
    false-positive-filter.js  → Naive Bayes classifier for false positive reduction

  utils/
    copilot.js                → Copilot CLI wrapper (retry + cache + batch + circuit breaker)
    git.js                    → simple-git convenience layer
    logger.js                 → chalk + ora formatted output
    config.js                 → .reviewpilotrc loader
    entropy.js                → Shannon entropy secret detection
    metrics.js                → PerformanceTracker (step timing, memory, bottleneck)
    telemetry.js              → Anonymous opt-in telemetry
```

## Pipeline Flow (9 Steps)

```
check command
  │
  ├─ 1. git.getDiff(baseBranch)
  │     └→ raw unified diff string
  │
  ├─ 2. diff-processor.processDiff(rawDiff)
  │     └→ DiffAnalysis { files[], summary, aiSummary }
  │
  ├─ 3. context-collector.gatherContext(files)
  │     └→ Context { dependents, relatedTests, aiContext }
  │
  ├─ 4. smart-linter.analyze(files)      ← 8-layer analysis
  │     ├→ heuristic rules
  │     ├→ entropy-based secrets
  │     ├→ AST analysis (Babel)
  │     ├→ .env scanning
  │     ├→ plugin execution
  │     ├→ ML false-positive filter
  │     └→ Copilot semantic review
  │     └→ Finding[] { file, line, severity, message, source }
  │
  ├─ 5. test-checker.checkTestCoverage(files)
  │     └→ TestCoverage { untestedFiles, existingTests, suggestions }
  │
  ├─ 6. performance-budget.checkPerformanceBudget(files)
  │     └→ BudgetViolation[] { file, type, message }
  │
  ├─ 7. breaking-changes.detectBreakingChanges(files, baseBranch)
  │     └→ BreakingChange[] { file, functionName, old/new signature }
  │
  ├─ 8. pr-description.generatePRDescription(allResults)
  │     └→ string (markdown)
  │
  └─ 9. checklist.buildChecklist(allResults)
        └→ string (markdown)
```

Each step catches errors independently. Failed steps log warnings and continue — partial results are always better than no results.

## Key Data Types

### `FileChange`
```js
{
  file: "src/auth.js",          // path
  type: "modified",             // added | deleted | modified | renamed
  category: "feature",          // feature | test | docs | config
  additions: 42,
  deletions: 8,
  hunks: [{ oldStart, newStart, content, changes }]
}
```

### `Finding`
```js
{
  file: "src/auth.js",
  line: 47,
  severity: "critical",         // critical | error | warning | info | suggestion
  message: "Hardcoded API key with known prefix",
  source: "entropy"             // heuristic | entropy | ast | plugin | copilot
}
```

### `BudgetViolation`
```js
{
  file: "src/monolith.js",
  type: "file-size",            // file-size | function-length | complexity
  message: "File size (612KB) exceeds budget (500KB)"
}
```

## Module Dependencies

```
bin/reviewpilot.js
  ├→ commands/check.js
  │    ├→ utils/config.js → utils/git.js
  │    ├→ utils/copilot.js (retry, cache, batch, circuit breaker)
  │    ├→ utils/metrics.js (PerformanceTracker)
  │    ├→ utils/telemetry.js
  │    ├→ analyzers/diff-processor.js
  │    ├→ context/context-collector.js
  │    ├→ linters/smart-linter.js
  │    │    ├→ utils/entropy.js
  │    │    ├→ analyzers/ast-analyzer.js
  │    │    ├→ linters/plugin-loader.js
  │    │    ├→ ml/false-positive-filter.js
  │    │    └→ utils/copilot.js
  │    ├→ validators/test-checker.js
  │    ├→ validators/performance-budget.js
  │    ├→ detectors/breaking-changes.js
  │    ├→ generators/pr-description.js
  │    └→ generators/checklist.js
  │
  ├→ commands/fix.js
  │    └→ fixers/auto-fix.js
  │         └→ utils/copilot.js
  │
  └→ commands/create-pr.js
```

No circular dependencies. `utils/copilot.js` is the only shared service with session state (cache, circuit breaker stats).

---

**Next**: [Troubleshooting →](troubleshooting.md)

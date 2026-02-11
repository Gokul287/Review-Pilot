# Architecture

## Design Principles

1. **Pipeline, not monolith** — each analyzer is a standalone async function
2. **Shared data shapes** — every module returns typed objects (`Finding`, `FileChange`, etc.)
3. **AI is additive** — heuristics always run; Copilot adds on top
4. **Fail-forward** — errors in one step don't block the next

## Directory Layout

```
bin/
  reviewpilot.js             → CLI entry point (Commander.js)

src/
  commands/
    check.js                  → Pipeline orchestrator (8 steps)
    create-pr.js              → PR creation via gh CLI

  analyzers/
    diff-processor.js         → parse-diff + file categorization

  context/
    context-collector.js      → Import scanning, test file discovery

  linters/
    smart-linter.js           → 10 heuristic rules + Copilot review

  validators/
    test-checker.js           → Coverage validation + test suggestions

  detectors/
    breaking-changes.js       → Export signature comparison

  generators/
    pr-description.js         → Markdown PR body
    checklist.js              → 9-category contextual checklist

  utils/
    copilot.js                → Copilot CLI wrapper (graceful fallback)
    git.js                    → simple-git convenience layer
    logger.js                 → chalk + ora formatted output
    config.js                 → .reviewpilotrc loader
```

## Pipeline Flow

```
check command
  │
  ├─ 1. git.getDiff(baseBranch)
  │     └→ raw unified diff string
  │
  ├─ 2. diff-processor.processDiff(rawDiff)
  │     └→ DiffAnalysis { files[], summary, aiSummary }
  │
  ├─ 3. context-collector.gatherContext(files, repoRoot)
  │     └→ Context { dependents, relatedTests, aiContext }
  │
  ├─ 4. smart-linter.analyze(files)
  │     └→ Finding[] { file, line, severity, message, source }
  │
  ├─ 5. test-checker.validateTestCoverage(files, repoRoot)
  │     └→ TestCoverage { untestedFiles, existingTests, suggestions }
  │
  ├─ 6. breaking-changes.detectBreakingChanges(files, baseBranch)
  │     └→ BreakingChange[] { file, functionName, old/new signature }
  │
  ├─ 7. pr-description.generatePRDescription(allResults)
  │     └→ string (markdown)
  │
  └─ 8. checklist.buildChecklist(allResults)
        └→ string (markdown)
```

Each step receives the accumulated results from prior steps. Steps 2–8 call `askCopilot()` internally for AI enhancement.

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
  message: "Hardcoded secret",
  source: "heuristic"           // heuristic | copilot
}
```

### `BreakingChange`
```js
{
  file: "src/api.js",
  functionName: "getUser",
  oldSignature: "id",
  newSignature: "(removed)",
  severity: "major",            // major | minor | patch
  description: "Removed export"
}
```

## Module Dependencies

```
bin/reviewpilot.js
  └→ commands/check.js
       ├→ utils/config.js → utils/git.js
       ├→ utils/copilot.js (via askCopilot)
       ├→ analyzers/diff-processor.js
       ├→ context/context-collector.js
       ├→ linters/smart-linter.js
       ├→ validators/test-checker.js
       ├→ detectors/breaking-changes.js
       ├→ generators/pr-description.js
       └→ generators/checklist.js
```

No circular dependencies. Every module depends on `utils/copilot.js` for AI calls and nothing else from utils.

---

**Next**: [Troubleshooting →](troubleshooting.md)

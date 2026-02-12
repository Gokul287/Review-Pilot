### **ReviewPilot CLI** - AI-Native Code Review Companion

**Category:** Problem Solver

#### 🎪 THE HOOK

Pre-review code analyzer that catches issues **before** human reviewers see them, reducing review cycles from 4-6 hours to 30 minutes. Uses 8-layer analysis (heuristic + entropy + AST + plugins + ML + Copilot) for context-aware analysis beyond static linters.

#### 📊 ARCHITECTURAL BLUEPRINT

| Component                    | Responsibility                      | Copilot CLI Integration                        | File Path                              |
| ---------------------------- | ----------------------------------- | ---------------------------------------------- | -------------------------------------- |
| **Git Diff Analyzer**        | Extracts changed files and hunks    | Copilot explains impact of each change         | `src/analyzers/diff-processor.js`      |
| **AST Analyzer**             | Babel-based code structure analysis | Cyclomatic complexity, XSS, empty catches      | `src/analyzers/ast-analyzer.js`        |
| **Context Gatherer**         | Fetches related code, tests, docs   | Copilot finds dependencies and usage patterns  | `src/context/context-collector.js`     |
| **Smart Linter**             | 8-layer multi-dimensional analysis  | Copilot checks logic, naming, edge cases       | `src/linters/smart-linter.js`          |
| **Plugin Loader**            | External custom rules               | Team-specific rules from `.reviewpilot-rules/` | `src/linters/plugin-loader.js`         |
| **Test Coverage Validator**  | Identifies untested code paths      | Copilot suggests test cases                    | `src/validators/test-checker.js`       |
| **Performance Budget**       | File size, complexity limits        | AST-computed cyclomatic complexity             | `src/validators/performance-budget.js` |
| **Breaking Change Detector** | Analyzes API compatibility          | Copilot compares signatures                    | `src/detectors/breaking-changes.js`    |
| **ML False-Positive Filter** | Naive Bayes noise reduction         | Learns from feedback                           | `src/ml/false-positive-filter.js`      |
| **Auto-Fix Engine**          | Generates fixes for common issues   | Copilot generates test scaffolding             | `src/fixers/auto-fix.js`               |
| **PR Description Generator** | Creates comprehensive PR template   | Copilot writes description                     | `src/generators/pr-description.js`     |
| **Review Checklist Builder** | Generates custom review checklist   | Copilot creates contextual items               | `src/generators/checklist.js`          |

**Utilities**: `copilot.js` (retry+cache+batch+circuit breaker), `entropy.js` (secret detection), `metrics.js` (perf tracking), `telemetry.js` (anonymous opt-in), `git.js`, `logger.js`, `config.js` — all in `src/utils/`

#### 🔄 DATA FLOW SEQUENCE

```
User runs: reviewpilot check [--verbose] [--save]
    ↓
 [1/9] Get diff → git.getDiff(baseBranch)
    ↓ (Copilot: "Analyze git diff and categorize changes")
 [2/9] Process diff → diff-processor.processDiff()
    ↓ (Copilot: "Find all files that import these functions")
 [3/9] Gather context → context-collector.gatherContext()
    ↓ (Copilot: "Check for logic errors, race conditions, edge cases")
 [4/9] Smart Lint → smart-linter.analyze()  ← 8 layers
    ↓ (Copilot: "Identify untested code paths")
 [5/9] Test coverage → test-checker.checkTestCoverage()
    ↓
 [6/9] Performance budgets → performance-budget.checkBudget()
    ↓ (Copilot: "Compare function signatures")
 [7/9] Breaking changes → breaking-changes.detect()
    ↓ (Copilot: "Write PR description with context")
 [8/9] PR description → pr-description.generate()
    ↓ (Copilot: "Create checklist based on change type")
 [9/9] Checklist → checklist.build()

User runs: reviewpilot fix [--all | --interactive | --dry-run]
    ↓
 Reads analysis.json → auto-fix.js generates patches → applies fixes

User runs: reviewpilot create-pr
    ↓
 Opens PR via gh CLI with generated description + checklist
```

#### 🎯 COPILOT CLI SHOWCASE (8 Integration Points)

| #   | Prompt Example                              | What Copilot Does         | Resilience                       |
| --- | ------------------------------------------- | ------------------------- | -------------------------------- |
| 1   | "Analyze git diff and explain impact"       | Change summary            | Retry 3x, cache, circuit breaker |
| 2   | "Find files that depend on these changes"   | Dependency tracing        | Retry 3x, cache, circuit breaker |
| 3   | "Check for race conditions and null errors" | Semantic analysis         | Retry 3x, cache, circuit breaker |
| 4   | "Suggest test cases for new logic"          | Test generation           | Retry 3x, cache, circuit breaker |
| 5   | "Compare API signatures with main branch"   | Breaking change detection | Retry 3x, cache, circuit breaker |
| 6   | "Generate PR description"                   | Structured docs           | Retry 3x, cache, circuit breaker |
| 7   | "Create review checklist for these changes" | Custom checklist          | Retry 3x, cache, circuit breaker |
| 8   | "Open PR with all generated assets"         | PR creation via `gh`      | Fallback to manual               |

All calls use exponential backoff (1s→2s→4s), session-level prompt cache, batch concurrency via `p-limit`, and a circuit breaker that trips after 5 consecutive failures.

#### ✅ CURRENT STATUS

| Area                    | Status  | Details                                                         |
| ----------------------- | ------- | --------------------------------------------------------------- |
| **Core Pipeline**       | ✅ Done | 9-step with per-step error recovery (`src/commands/check.js`)   |
| **Auto-Fix**            | ✅ Done | `reviewpilot fix` command (`src/commands/fix.js`)               |
| **Plugin System**       | ✅ Done | `.reviewpilot-rules/` loader (`src/linters/plugin-loader.js`)   |
| **AST Analysis**        | ✅ Done | Babel parser + complexity (`src/analyzers/ast-analyzer.js`)     |
| **ML Filter**           | ✅ Done | Naive Bayes classifier (`src/ml/false-positive-filter.js`)      |
| **Secret Detection**    | ✅ Done | Shannon entropy (`src/utils/entropy.js`)                        |
| **Performance Budgets** | ✅ Done | Size/complexity/length (`src/validators/performance-budget.js`) |
| **Copilot Resilience**  | ✅ Done | Retry+cache+batch+circuit breaker (`src/utils/copilot.js`)      |
| **Telemetry**           | ✅ Done | Anonymous opt-in (`src/utils/telemetry.js`)                     |
| **CI/CD**               | ✅ Done | GitHub Actions workflow (`.github/workflows/reviewpilot.yml`)   |
| **Tests**               | ✅ Done | 142 passing, 13 suites (`tests/`)                               |
| **Documentation**       | ✅ Done | 11 guides (`docs/`)                                             |

#### DIFFERENTIATORS

✅ **8-layer analysis** — heuristic + entropy + AST + .env + plugins + budgets + ML + Copilot
✅ **Auto-fix** — `reviewpilot fix` patches common issues automatically
✅ **Plugin system** — teams add custom rules without forking
✅ **Copilot resilience** — retry, cache, batch, circuit breaker (never crashes)
✅ **142 tests** — comprehensive coverage across 13 test suites
✅ **Instant utility** — works with any Git repo, zero config required

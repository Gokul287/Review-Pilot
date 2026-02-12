# Contributing

## Dev Setup

```bash
git clone https://github.com/Gokul287/Review-Pilot.git
cd Review-Pilot
npm install
```

## Running Locally

```bash
# Run directly
node bin/reviewpilot.js check --no-copilot

# Or link globally
npm link
reviewpilot check
```

## Tests

```bash
# Run all 142 tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch
```

### Test Structure

```
tests/
├── analyzers/
│   ├── diff-processor.test.js    ← Diff parsing, file categorization
│   └── ast-analyzer.test.js      ← AST detection, complexity calculation    ★ NEW
├── linters/
│   ├── smart-linter.test.js      ← Heuristic rules, edge cases
│   └── plugin-loader.test.js     ← Plugin loading, validation, execution   ★ NEW
├── fixers/
│   └── auto-fix.test.js          ← Fix generation, patching, application   ★ NEW
├── validators/
│   └── performance-budget.test.js ← Budget checks, thresholds              ★ NEW
├── detectors/
│   └── breaking-changes.test.js  ← Signature comparison (mocked git)
├── generators/
│   └── checklist.test.js         ← Contextual checklist generation
├── ml/
│   └── false-positive-filter.test.js ← ML classifier, learning          ★ NEW
└── utils/
    ├── copilot.test.js           ← Retry, fallback (mocked child_process)
    ├── entropy.test.js           ← Shannon entropy, secret detection      ★ NEW
    ├── metrics.test.js           ← Performance tracking                   ★ NEW
    └── telemetry.test.js         ← Opt-in/out, env vars                   ★ NEW
```

Tests mock `copilot.js` and `git.js` — no real Git or Copilot calls during testing.

## Adding a New Heuristic Rule

Edit `src/linters/smart-linter.js`:

```js
const HEURISTIC_RULES = [
  // Add your rule:
  [/your-regex-pattern/g, "warning", "Description of what it catches"],
  // ... existing rules
];
```

Then add a test in `tests/linters/smart-linter.test.js`:

```js
it("should detect your new pattern", async () => {
  const files = [mockFile("app.js", ["code that matches your pattern"])];
  const findings = await analyze(files, { useML: false });
  expect(findings.some((f) => f.message.includes("your description"))).toBe(
    true,
  );
});
```

> **Note**: Pass `{ useML: false }` in tests to prevent the ML filter from affecting assertions.

## Creating a Plugin

Instead of modifying `smart-linter.js`, you can create a plugin. See [Plugin Authoring Guide](plugins.md).

## Adding an Auto-Fix

Edit `src/fixers/auto-fix.js` — add a new generator to the `FIX_GENERATORS` map:

```js
const FIX_GENERATORS = {
  // Add your fix:
  "your-pattern": (finding, lines, repoRoot) => ({
    type: "replace",
    file: finding.file,
    line: finding.line,
    original: lines[finding.line - 1],
    replacement: "fixed version",
    rule: "your-pattern",
    description: "What this fix does",
  }),
};
```

## Project Conventions

| Convention    | Rule                                                 |
| ------------- | ---------------------------------------------------- |
| **Modules**   | ESM (`import`/`export`), no CommonJS                 |
| **Functions** | Async, pure where possible                           |
| **Types**     | JSDoc `@typedef` for data shapes                     |
| **Errors**    | Catch and log, never crash the pipeline              |
| **AI calls**  | Always via `askCopilot()`, never direct `execFile`   |
| **Tests**     | Pass `{ useML: false }` for deterministic assertions |

## Commit Messages

```
feat: add new heuristic rule for X
fix: correct file categorization for Y
docs: update troubleshooting guide
test: add tests for breaking-changes edge case
chore: update dependencies
```

---

**Back to**: [Docs Index →](README.md)

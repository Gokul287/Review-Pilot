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
# Run all tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch
```

### Test Structure

```
tests/
├── analyzers/
│   └── diff-processor.test.js    ← Diff parsing, file categorization
├── linters/
│   └── smart-linter.test.js      ← 10 heuristic rules, edge cases
├── detectors/
│   └── breaking-changes.test.js  ← Signature comparison (mocked git)
├── generators/
│   └── checklist.test.js         ← Contextual checklist generation
└── utils/
    └── copilot.test.js           ← Fallback handling (mocked child_process)
```

Tests mock `copilot.js` and `git.js` — no real Git or Copilot calls during testing.

## Adding a New Heuristic Rule

Edit `src/linters/smart-linter.js`:

```js
const HEURISTIC_RULES = [
  // Add your rule:
  [/your-regex-pattern/g, 'warning', 'Description of what it catches'],
  // ... existing rules
];
```

Then add a test in `tests/linters/smart-linter.test.js`:

```js
it('should detect your new pattern', async () => {
  const files = [mockFile('app.js', ['code that matches your pattern'])];
  const findings = await analyze(files);
  expect(findings.some((f) => f.message.includes('your description'))).toBe(true);
});
```

## Adding a New Checklist Category

Edit `src/generators/checklist.js`:

```js
const CHECKLIST_TEMPLATES = {
  // Add your category:
  performance: [
    'Load tested with expected traffic volume',
    'No N+1 queries introduced',
    'Caching strategy considered',
  ],
  // ... existing categories
};
```

Detection logic is in `buildChecklist()` — add a condition to auto-detect when the category applies.

## Project Conventions

| Convention | Rule |
|-----------|------|
| **Modules** | ESM (`import`/`export`), no CommonJS |
| **Functions** | Async, pure where possible |
| **Types** | JSDoc `@typedef` for data shapes |
| **Errors** | Catch and log, never crash the pipeline |
| **AI calls** | Always via `askCopilot()`, never direct `execFile` |

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

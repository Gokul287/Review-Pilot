# Copilot CLI Integration

ReviewPilot uses GitHub Copilot CLI in **programmatic mode** at 8 points in the analysis pipeline. Every integration point has a built-in fallback — the tool works without Copilot.

## How It Connects

ReviewPilot calls `copilot -p "<prompt>"` via `child_process.execFile`. The wrapper lives in `src/utils/copilot.js`.

```
Your code change
    ↓
ReviewPilot heuristic analysis (instant, always runs)
    ↓
Copilot CLI semantic analysis (if available, 30s timeout per call)
    ↓
Combined results
```

## The 8 Integration Points

### 1. Change Impact Summary
**Module**: `diff-processor.js`  
**When**: After parsing the diff  
**Prompt**: _"Analyze this set of code changes and provide a brief impact summary"_  
**Output**: 2-3 sentence summary of what changed and why it matters

### 2. Dependency Analysis
**Module**: `context-collector.js`  
**When**: After finding static import chains  
**Prompt**: _"Find all files that depend on or import these changed files and explain the impact"_  
**Output**: List of affected downstream files

### 3. Semantic Code Review
**Module**: `smart-linter.js`  
**When**: For each hunk with 3+ added lines  
**Prompt**: _"Review this code change for logic errors, race conditions, null/undefined risks, error handling gaps, and edge cases"_  
**Output**: Structured findings with severity levels

### 4. Test Case Suggestions
**Module**: `test-checker.js`  
**When**: For source files with no matching test file  
**Prompt**: _"Suggest 3-5 test cases for the following new code, including edge cases"_  
**Output**: Concrete test scenarios for untested code

### 5. Breaking Change Migration
**Module**: `breaking-changes.js`  
**When**: After signature comparison detects changes  
**Prompt**: _"Explain the impact on consumers and suggest migration steps"_  
**Output**: Migration guidance for downstream users

### 6. PR Description
**Module**: `pr-description.js`  
**When**: After all analysis completes  
**Prompt**: _"Write a concise, professional PR description for these changes"_  
**Output**: Natural-language summary for the PR body

### 7. Review Checklist
**Module**: `checklist.js`  
**When**: After generating template-based checklist  
**Prompt**: _"Create 3-5 specific review checklist items focusing on integration risks, data integrity, and performance"_  
**Output**: Context-specific checklist items beyond templates

### 8. PR Creation
**Module**: `create-pr.js`  
Uses `gh pr create` with all Copilot-generated content (description + checklist) as the PR body.

## Fallback Behavior

| Scenario | What Happens |
|----------|-------------|
| Copilot CLI not installed | Warning printed, heuristic-only mode |
| Copilot times out (>30s) | Skips that step, continues pipeline |
| Copilot returns error | Logs warning, proceeds without AI result |
| `--no-copilot` flag used | All AI calls skipped by design |

The availability check runs once per session and caches the result — no repeated spawn failures.

## Performance

| Metric | With Copilot | Without Copilot |
|--------|-------------|----------------|
| Small PR (1-3 files) | ~15s | ~2s |
| Medium PR (5-10 files) | ~45s | ~3s |
| Large PR (20+ files) | ~90s | ~5s |

Each Copilot call has a 30s timeout (`copilotTimeout` in config). For faster runs, lower the timeout or use `--no-copilot`.

---

**Next**: [Architecture →](architecture.md)

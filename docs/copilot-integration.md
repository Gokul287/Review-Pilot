# Copilot CLI Integration

ReviewPilot uses GitHub Copilot CLI in **programmatic mode** at 8 points in the analysis pipeline. Every integration point has a built-in fallback — the tool works without Copilot.

## How It Connects

ReviewPilot calls `copilot -p "<prompt>"` via `child_process.execFile`. The wrapper lives in `src/utils/copilot.js` and includes:

- **Retry with exponential backoff** — failed calls retry up to 3 times (1s → 2s → 4s delay)
- **Session-level prompt cache** — identical prompts return cached results instantly
- **Batch execution** — multiple prompts processed concurrently using `p-limit`
- **Circuit breaker** — after 5 consecutive failures, all Copilot calls are disabled for the session

```
Your code change
    ↓
ReviewPilot multi-layer analysis (heuristic + AST + entropy + plugins + ML)
    ↓
Copilot CLI semantic analysis (if available, with retry + cache)
    ↓
Combined, deduplicated results
```

## The 8 Integration Points

### 1. Change Impact Summary
**Module**: `diff-processor.js`  
**Prompt**: _"Analyze this set of code changes and provide a brief impact summary"_  
**Output**: 2-3 sentence summary of what changed and why it matters

### 2. Dependency Analysis
**Module**: `context-collector.js`  
**Prompt**: _"Find all files that depend on these changes and explain the impact"_  
**Output**: List of affected downstream files

### 3. Semantic Code Review
**Module**: `smart-linter.js`  
**When**: For each hunk with 3+ added lines (after heuristic/AST/ML filtering)  
**Prompt**: _"Review this code for logic errors, race conditions, null risks, edge cases"_  
**Output**: Structured findings with severity levels

### 4. Test Case Suggestions
**Module**: `test-checker.js`  
**Prompt**: _"Suggest 3-5 test cases including edge cases"_  
**Output**: Concrete test scenarios for untested code

### 5. Breaking Change Migration
**Module**: `breaking-changes.js`  
**Prompt**: _"Explain the impact and suggest migration steps"_  
**Output**: Migration guidance for downstream users

### 6. PR Description
**Module**: `pr-description.js`  
**Prompt**: _"Write a concise, professional PR description"_  
**Output**: Natural-language summary for the PR body

### 7. Review Checklist
**Module**: `checklist.js`  
**Prompt**: _"Create 3-5 specific review checklist items"_  
**Output**: Context-specific items beyond templates

### 8. Auto-Fix Test Scaffolding
**Module**: `auto-fix.js`  
**Prompt**: _"Generate test scaffolding for this function"_  
**Output**: Test file template for fixed code

## Resilience Features

| Feature | Behavior |
|---------|----------|
| **Retry + backoff** | Failed calls retry 1→2→4s delays (configurable via `retryAttempts`) |
| **Prompt cache** | Identical prompts return instantly from session cache |
| **Batch execution** | Multiple prompts run concurrently (configurable via `copilotConcurrency`) |
| **Circuit breaker** | After 5 consecutive failures, Copilot is disabled for the session |

## Fallback Behavior

| Scenario | What Happens |
|----------|-------------|
| Copilot CLI not installed | Warning printed, multi-layer heuristic mode |
| Copilot times out | Retries up to 3 times, then skips that call |
| 5+ consecutive failures | Circuit breaker trips, remaining calls skipped |
| `--no-copilot` flag used | All AI calls skipped by design |
| Copilot error (ENOENT) | Disables Copilot for session, logs warning once |

## Performance

| Metric | With Copilot | Without Copilot |
|--------|-------------|----------------|
| Small PR (1-3 files) | ~12s | ~1s |
| Medium PR (5-10 files) | ~30s | ~2s |
| Large PR (20+ files) | ~60s | ~4s |

With caching enabled, repeated analysis of similar code runs **2-3x faster** after the first run.

## Session Stats

After each run, ReviewPilot reports Copilot session statistics:

```
Copilot: 8 calls, 3 cache hits, 1 retry, 0 failures
```

---

**Next**: [Architecture →](architecture.md)

# Configuration

ReviewPilot works with zero config. For customization, add a `.reviewpilotrc` file to your project root.

## Config File

Create `.reviewpilotrc` (JSON format) in your repo root:

```json
{
  "baseBranch": "main",
  "excludePatterns": ["*.lock", "*.min.js", "dist/**"],
  "copilotTimeout": 30000,
  "outputDir": ".reviewpilot-output",
  "maxFileSizeKB": 500,
  "telemetry": true,
  "performanceBudgets": {
    "maxFileSize": 512000,
    "maxFunctionLength": 50,
    "maxCyclomaticComplexity": 10
  },
  "retryAttempts": 3,
  "copilotConcurrency": 3,
  "pluginDir": ".reviewpilot-rules"
}
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseBranch` | `string` | `"main"` | Branch to diff against. Set to `"develop"` if your team uses GitFlow. |
| `excludePatterns` | `string[]` | `["*.lock", "*.min.js", "*.min.css", "node_modules/**", "dist/**"]` | Glob patterns for files to skip during analysis. |
| `copilotTimeout` | `number` | `30000` | Max milliseconds to wait for each Copilot CLI response. Lower for faster runs. |
| `outputDir` | `string` | `".reviewpilot-output"` | Directory where `--save` writes results. |
| `maxFileSizeKB` | `number` | `500` | Skip files larger than this (in KB). |
| `telemetry` | `boolean` | `true` | Enable anonymous usage telemetry. Respects `DO_NOT_TRACK` env var. |
| `retryAttempts` | `number` | `3` | Number of retry attempts for failed Copilot calls (with exponential backoff). |
| `copilotConcurrency` | `number` | `3` | Max parallel Copilot CLI calls during batch execution. |
| `pluginDir` | `string` | `".reviewpilot-rules"` | Directory to load custom linter plugins from. |

### Performance Budgets

Nested under `performanceBudgets`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFileSize` | `number` | `512000` | Max file size in bytes before a budget violation is raised. |
| `maxFunctionLength` | `number` | `50` | Max lines per function. |
| `maxCyclomaticComplexity` | `number` | `10` | Max cyclomatic complexity per file (AST-computed). |

## How It Works

1. ReviewPilot detects the Git repo root automatically
2. Looks for `.reviewpilotrc` in that directory
3. Merges your settings with defaults (your values win)
4. If the file is missing or has JSON errors → uses defaults silently

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEBUG=1` | Show full stack traces on errors |
| `REVIEWPILOT_TELEMETRY=0` | Disable telemetry (same as config `telemetry: false`) |
| `DO_NOT_TRACK=1` | Universal telemetry opt-out (respects the standard) |
| `CI=true` | Auto-detected — disables telemetry and interactive prompts |

## Team Configuration

Commit `.reviewpilotrc` to your repo so the whole team shares the same settings:

```bash
cp .reviewpilotrc.example .reviewpilotrc
git add .reviewpilotrc
git commit -m "chore: add reviewpilot config"
```

---

**Next**: [Copilot Integration →](copilot-integration.md)

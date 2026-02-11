# Configuration

ReviewPilot works with zero config. For customization, add a `.reviewpilotrc` file to your project root.

## Config File

Create `.reviewpilotrc` (JSON format) in your repo root:

```json
{
  "baseBranch": "main",
  "excludePatterns": ["*.lock", "*.min.js"],
  "copilotTimeout": 30000,
  "outputDir": ".reviewpilot-output",
  "maxFileSizeKB": 500
}
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseBranch` | `string` | `"main"` | Branch to diff against. Set to `"develop"` if your team uses GitFlow. |
| `excludePatterns` | `string[]` | `["*.lock", "*.min.js", "*.min.css", "node_modules/**", "dist/**"]` | Glob patterns for files to skip during analysis. |
| `copilotTimeout` | `number` | `30000` | Max milliseconds to wait for each Copilot CLI response. Lower for faster runs. |
| `outputDir` | `string` | `".reviewpilot-output"` | Directory where `--save` writes results. |
| `maxFileSizeKB` | `number` | `500` | Skip files larger than this (in KB). Prevents slow analysis on bundled files. |

## How It Works

1. ReviewPilot detects the Git repo root automatically
2. Looks for `.reviewpilotrc` in that directory
3. Merges your settings with defaults (your values win)
4. If the file is missing or has JSON errors → uses defaults silently

## Pattern Syntax

Exclude patterns support:

| Pattern | Matches |
|---------|---------|
| `*.lock` | Any file ending in `.lock` |
| `dist/**` | Everything inside `dist/` |
| `package-lock.json` | Exact filename |

## Team Configuration

Commit `.reviewpilotrc` to your repo so the whole team shares the same settings:

```bash
# Add to version control
git add .reviewpilotrc
git commit -m "chore: add reviewpilot config"
```

Copy the example file to get started:

```bash
cp .reviewpilotrc.example .reviewpilotrc
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEBUG=1` | Show full stack traces on errors |

---

**Next**: [Copilot Integration →](copilot-integration.md)

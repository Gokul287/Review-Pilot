# Troubleshooting

## Common Issues

### "No changes detected"

**Symptoms**: ReviewPilot says _"No diff found between X and Y"_

| Cause | Fix |
|-------|-----|
| You're on the base branch | `git checkout -b feature/my-change` |
| Changes aren't committed | `git add -A && git commit -m "wip"` |
| Wrong base branch | `reviewpilot check -b develop` |
| Branch just created, no commits ahead | Make a commit first |

### "Copilot CLI not found"

**Symptoms**: `⚠ Copilot CLI not found — running in heuristic-only mode`

**Fix**:

```bash
npm install -g @github/copilot
copilot --version   # verify
```

This is a **warning, not an error**. ReviewPilot still runs full analysis (heuristic + AST + entropy + ML) without Copilot.

### "GitHub CLI (gh) not found"

**Symptoms**: `create-pr` command fails

```bash
brew install gh    # macOS
winget install GitHub.cli   # Windows
gh auth login
```

### "No saved PR description found"

**Symptoms**: `create-pr` or `fix` warns about missing files

**Fix**: Run `check --save` first:

```bash
reviewpilot check --save
reviewpilot create-pr    # now works
reviewpilot fix --dry-run  # now works
```

### "A PR for this branch already exists"

```bash
gh pr view   # view the existing PR
```

### Copilot Times Out Repeatedly

**Symptoms**: `⚠ Copilot timed out` or `Circuit breaker tripped`

ReviewPilot retries up to 3 times with exponential backoff (1s → 2s → 4s). After 5 consecutive failures, the circuit breaker disables Copilot for the session.

**Fixes**:

```bash
# Lower timeout
# .reviewpilotrc: { "copilotTimeout": 15000 }

# Or skip Copilot entirely
reviewpilot check --no-copilot
```

### Plugin Errors

**Symptoms**: `⚠ Plugin "my-rule" error on src/app.js: ...`

Plugins run in error-isolated sandboxes. A broken plugin won't crash the analysis.

**Debug**: Check your plugin file in `.reviewpilot-rules/`:
- Ensure it exports a default object with `name` and `analyze`
- `analyze` must return an array (even empty)
- Use `async` if your plugin does I/O

### Performance Budget False Positives

**Symptoms**: Files flagged for size/complexity that are acceptable

**Fix**: Adjust budgets in `.reviewpilotrc`:

```json
{
  "performanceBudgets": {
    "maxFileSize": 1024000,
    "maxFunctionLength": 80,
    "maxCyclomaticComplexity": 15
  }
}
```

### ML Filter Removes Valid Findings

**Symptoms**: Expected issues don't appear in results

The ML false-positive filter learns over time. If it's filtering too aggressively:

1. The classifier stores data in `~/.reviewpilot/classifier.json`
2. Delete this file to reset: `rm ~/.reviewpilot/classifier.json`

### Wrong Files Being Analyzed

**Fix**: Add exclude patterns to `.reviewpilotrc`:

```json
{
  "excludePatterns": ["*.lock", "*.min.js", "dist/**", "build/**", "vendor/**"]
}
```

### Permission Errors on Windows

**Fix**: Run as Administrator or fix permissions:

```powershell
icacls "D:\your-repo" /grant Users:F /T
```

## Debug Mode

For full stack traces:

```bash
# Windows PowerShell
$env:DEBUG="1"; reviewpilot check

# macOS / Linux
DEBUG=1 reviewpilot check
```

## Getting Help

- **CLI help**: `reviewpilot --help` or `reviewpilot help check`
- **Issues**: [github.com/Gokul287/Review-Pilot/issues](https://github.com/Gokul287/Review-Pilot/issues)

---

**Next**: [Contributing →](contributing.md)

# Troubleshooting

## Common Issues

### "No changes detected"

**Symptoms**: ReviewPilot says _"No diff found between X and Y"_

**Causes & Fixes**:

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

This is a **warning, not an error**. ReviewPilot still works without Copilot.

### "GitHub CLI (gh) not found"

**Symptoms**: `create-pr` command fails

**Fix**:

```bash
# Install gh
brew install gh    # macOS
winget install GitHub.cli   # Windows

# Authenticate
gh auth login
```

### "No saved PR description found"

**Symptoms**: `create-pr` warns about missing description

**Fix**: Run `check --save` first:

```bash
reviewpilot check --save
reviewpilot create-pr
```

### "A PR for this branch already exists"

**Symptoms**: `create-pr` fails with "already exists"

**Fix**: View the existing PR:

```bash
gh pr view
```

### Copilot Times Out

**Symptoms**: `⚠ Copilot timed out after 30s`

**Fixes**:

```bash
# Lower timeout for faster (less thorough) runs
# Edit .reviewpilotrc:
{ "copilotTimeout": 15000 }

# Or skip Copilot entirely
reviewpilot check --no-copilot
```

### Wrong Files Being Analyzed

**Symptoms**: Large generated files (bundles, lock files) slow down analysis

**Fix**: Add exclude patterns to `.reviewpilotrc`:

```json
{
  "excludePatterns": [
    "*.lock",
    "*.min.js",
    "dist/**",
    "build/**",
    "*.generated.ts"
  ]
}
```

### Permission Errors on Windows

**Symptoms**: `EPERM` or `EACCES` errors

**Fix**: Run your terminal as Administrator, or ensure the repo directory isn't read-only:

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

# ReviewPilot Demo Video Script (3 minutes)

## Scene 1: The Problem (30s)

**[Screen: Terminal with a large PR diff]**

> "Code reviews take hours. Issues slip through.
> Teams spend 4-6 hours reviewing each PR, and 40% of critical issues aren't caught until production."

**[Show split screen: developer waiting → CI pipeline running → reviewer overwhelmed]**

---

## Scene 2: The Solution (30s)

**[Terminal: Clean, minimal]**

```bash
npm install -g reviewpilot
cd my-project
reviewpilot check
```

**[Show ReviewPilot output — colorful findings appearing step by step]**

> "ReviewPilot analyzes your code in seconds using 8 detection layers — instant feedback, before you push."

---

## Scene 3: Key Features (90s)

### Feature 1: Multi-Layer Detection (20s)

**[Terminal: Run on benchmark repo]**

```bash
cd examples/benchmark-repo
./setup.sh
reviewpilot check --save
```

> "8 detection layers: regex heuristics, entropy-based secret scanning, AST analysis, plugins, ML filtering, and Copilot-powered semantic analysis."

**[Highlight: 7 findings appearing — secrets, eval, empty catch, long function]**

---

### Feature 2: Auto-Fix (20s)

```bash
reviewpilot fix --interactive
```

**[Show interactive prompt with diff preview]**

> "Interactive fixes with dry-run mode. You see the patch before it's applied."

**[Show: y/n/q prompt, patch applied, success message]**

---

### Feature 3: Breaking Change Detection (15s)

> "Automatically compares exports between branches. If you remove or rename a public function, ReviewPilot catches it."

**[Show: `WARNING: Removed export 'query' in database.js`]**

---

### Feature 4: Performance Budgets (15s)

> "Enforce code quality standards — max function length, file size, cyclomatic complexity."

**[Show: `WARNING: Function processUserData exceeds 50-line budget (55 lines)`]**

---

### Feature 5: Speed Comparison (20s)

**[Split screen animation]**

```
ReviewPilot:  11s  ████░░░░░░░░░░░░░░  Done!
Danger.js:    3m   ████████████░░░░░░  Still in CI queue...
SonarQube:    45s  ██████████░░░░░░░░  Loading server...
```

> "8x faster than CI-based tools. Get feedback before you even commit."

---

## Scene 4: CI Integration (15s)

**[Show `.github/workflows/reviewpilot.yml`]**

> "Drop one YAML file into your repo — ReviewPilot runs on every PR."

**[Show: PR comment with findings]**

---

## Scene 5: Call to Action (15s)

**[GitHub URL on clean background]**

> "Free. Open-source. Works with your GitHub Copilot license."

```
github.com/Gokul287/Review-Pilot
```

> "Install in 2 minutes:  npm install -g reviewpilot"

**[End screen: ReviewPilot logo + tagline]**

> "Built for the GitHub Copilot CLI Challenge 🏆"

---

## Recording Tips

- **Tool**: [asciinema](https://asciinema.org/) for terminal, OBS for screen
- **Resolution**: 1920×1080 at 60fps
- **Terminal**: iTerm2 / Windows Terminal with Dracula theme
- **Font**: JetBrains Mono, 16pt minimum
- **Editing**: DaVinci Resolve (free) or iMovie
- **Upload**: YouTube → embed in README

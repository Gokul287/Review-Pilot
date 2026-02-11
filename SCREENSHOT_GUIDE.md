# Screenshot Capture Guide

4 screenshots needed for README and documentation.

## 1. Terminal Output (`docs/images/terminal-output.png`)

**Command:**
```bash
cd examples/benchmark-repo
./setup.sh
reviewpilot check --save
```

**Capture:** Full terminal showing all 7 findings with colored severity levels, step progress (1/9 → 9/9), and summary.

**Settings:**
- Theme: Dracula / One Dark
- Font: JetBrains Mono 16pt
- Window: 1200×800px
- Tool: `carbon.now.sh` or native screenshot

---

## 2. Interactive Fix (`docs/images/fix-interactive.png`)

**Command:**
```bash
reviewpilot fix --interactive
```

**Capture:** The fix preview with colored diff and y/n/q prompt.

---

## 3. Performance Metrics (`docs/images/performance-metrics.png`)

**Command:**
```bash
reviewpilot check --verbose
```

**Capture:** The bottom metrics section showing step-by-step timing breakdown.

---

## 4. Speed Comparison (`docs/images/comparison-chart.png`)

Create a bar chart:

| Tool | Seconds |
|------|---------|
| ReviewPilot | 11 |
| CodeRabbit | 14 |
| SonarQube | 45 |
| Danger.js | 180 |

**Tools:** Excalidraw, `termgraph`, or any chart tool.

---

## Embedding in README

```markdown
## 📸 Screenshots

### Finding Issues
![Terminal Output](docs/images/terminal-output.png)

### Interactive Auto-Fix
![Fix Mode](docs/images/fix-interactive.png)

### Performance Metrics
![Metrics](docs/images/performance-metrics.png)
```

## Alternative: Animated GIF

```bash
npm install -g terminalizer
terminalizer record demo
terminalizer render demo
```

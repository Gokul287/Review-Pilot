# Plugin Authoring Guide

ReviewPilot supports custom linting rules via a plugin system. Drop JavaScript files into `.reviewpilot-rules/` and they'll run alongside the built-in analysis.

## Quick Start

### 1. Create the plugin directory

```bash
mkdir .reviewpilot-rules
```

### 2. Create a plugin file

```javascript
// .reviewpilot-rules/no-console-error.js
export default {
  name: 'no-console-error',
  severity: 'warning',
  description: 'Discourage console.error in favor of structured logging',

  async analyze(filename, content) {
    const findings = [];

    content.split('\n').forEach((line, index) => {
      if (/console\.error\(/.test(line)) {
        findings.push({
          line: index + 1,
          message: 'Use structured logger instead of console.error',
        });
      }
    });

    return findings;
  },
};
```

### 3. Run the analysis

```bash
reviewpilot check
```

Plugin findings appear alongside built-in results, tagged with `[plugin:no-console-error]`.

## Plugin API

### Required Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique rule name (used in finding labels) |
| `analyze` | `async function(filename, content) → Finding[]` | Analysis function |

### Optional Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `severity` | `string` | `"warning"` | Default severity: `critical`, `error`, `warning`, `info` |
| `description` | `string` | — | Human-readable rule description |

### Finding Object

Each finding returned by `analyze()`:

```javascript
{
  line: 42,          // Line number (1-indexed)
  message: "..."     // Description of the issue
}
```

## Examples

### Enforce import ordering

```javascript
// .reviewpilot-rules/import-order.js
export default {
  name: 'import-order',
  severity: 'info',

  async analyze(filename, content) {
    if (!/\.(js|ts|jsx|tsx)$/.test(filename)) return [];

    const lines = content.split('\n');
    const findings = [];
    let lastImport = '';

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^import\s+.*from\s+['"](.+)['"]/);
      if (match) {
        if (match[1] < lastImport) {
          findings.push({ line: i + 1, message: `Import "${match[1]}" should come before "${lastImport}"` });
        }
        lastImport = match[1];
      }
    }

    return findings;
  },
};
```

### Ban specific dependencies

```javascript
// .reviewpilot-rules/no-lodash.js
export default {
  name: 'no-lodash',
  severity: 'warning',
  description: 'Use native JS methods instead of lodash',

  async analyze(filename, content) {
    const findings = [];
    content.split('\n').forEach((line, i) => {
      if (/import.*lodash|require\(.*lodash/.test(line)) {
        findings.push({ line: i + 1, message: 'Prefer native Array/Object methods over lodash' });
      }
    });
    return findings;
  },
};
```

### Enforce max file length

```javascript
// .reviewpilot-rules/max-file-length.js
const MAX_LINES = 300;

export default {
  name: 'max-file-length',
  severity: 'warning',

  async analyze(filename, content) {
    const lines = content.split('\n').length;
    if (lines > MAX_LINES) {
      return [{ line: 1, message: `File has ${lines} lines (max: ${MAX_LINES}). Consider splitting.` }];
    }
    return [];
  },
};
```

## Error Handling

Plugins run in **error-isolated sandboxes**. If a plugin throws:

- The error is logged as a warning
- Other plugins continue running
- Built-in analysis is unaffected

```
⚠ Plugin "broken-plugin" error on src/app.js: TypeError: Cannot read properties of undefined
```

## Configuration

Set a custom plugin directory in `.reviewpilotrc`:

```json
{
  "pluginDir": ".reviewpilot-rules"
}
```

Plugins are loaded from `.js` and `.mjs` files in this directory. Subdirectories are not scanned.

---

**Next**: [Benchmarks →](benchmarks.md)

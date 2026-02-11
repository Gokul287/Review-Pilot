import { askCopilot } from '../utils/copilot.js';
import { detectSecret, isHighEntropyString, detectBase64Secrets } from '../utils/entropy.js';
import { analyzeWithAST, canAnalyze } from '../analyzers/ast-analyzer.js';
import { loadPlugins, runPlugin } from './plugin-loader.js';
import { FalsePositiveFilter } from '../ml/false-positive-filter.js';

/**
 * @typedef {object} Finding
 * @property {string} file       - File path
 * @property {number|null} line  - Line number (null if file-level)
 * @property {'critical'|'error'|'warning'|'info'|'suggestion'} severity
 * @property {string} message    - Human-readable finding description
 * @property {'heuristic'|'copilot'|'ast'|'entropy'|'plugin'} source
 */

// Heuristic patterns: [regex, severity, message template]
const HEURISTIC_RULES = [
    [/console\.(log|debug|info)\(/g, 'warning', 'Leftover console statement'],
    [/TODO|FIXME|HACK|XXX/g, 'info', 'Contains TODO/FIXME comment'],
    [/debugger;/g, 'error', 'Debugger statement left in code'],
    [/(password|secret|api_?key|token)\s*[:=]\s*['"][^'"]+['"]/gi, 'critical', 'Potential hardcoded secret or credential'],
    [/\.catch\(\s*\)/g, 'warning', 'Empty catch block — errors are silently swallowed'],
    [/eval\s*\(/g, 'error', 'Use of eval() — security risk'],
    [/any\s*[;,)]/g, 'info', 'TypeScript "any" type usage — consider a stricter type'],
    [/sleep\s*\(\s*\d{4,}/g, 'warning', 'Long sleep/delay — potential performance issue'],
    [/\/\/\s*@ts-ignore/g, 'warning', '@ts-ignore suppresses type checking'],
    [/process\.exit/g, 'warning', 'process.exit() call — may cause abrupt termination'],
];

// Environment file patterns
const ENV_SECRET_KEYS = [
    /^(API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|PRIVATE_KEY|DATABASE_URL|DB_PASSWORD|AWS_SECRET)/i,
    /^(STRIPE_SECRET|SENDGRID_API_KEY|TWILIO_AUTH_TOKEN|GITHUB_TOKEN|NPM_TOKEN)/i,
];

// Function length threshold (lines)
const MAX_FUNCTION_LINES = 50;

/**
 * Runs multi-dimensional analysis on changed code:
 *   1. Heuristic pattern matching (instant, no AI)
 *   2. Entropy-based secret detection
 *   3. AST-level semantic analysis
 *   4. Function length checks
 *   5. Plugin-based custom rules
 *   6. ML false-positive filtering
 *   7. Copilot-powered semantic analysis (logic errors, race conditions, edge cases)
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} files
 * @param {object} [options={}]
 * @param {string} [options.repoRoot=process.cwd()] - Repository root for plugin loading
 * @param {boolean} [options.useML=true] - Enable ML false-positive filtering
 * @returns {Promise<Finding[]>}
 */
export async function analyze(files, options = {}) {
    const { repoRoot = process.cwd(), useML = true } = options;
    const findings = [];

    // Load plugins (once per run)
    let plugins = [];
    try {
        plugins = await loadPlugins(repoRoot);
    } catch {
        // Plugin loading failure is non-fatal
    }

    // Initialize ML filter
    let fpFilter = null;
    if (useML) {
        try {
            fpFilter = new FalsePositiveFilter();
            await fpFilter.initialize();
        } catch {
            fpFilter = null;
        }
    }

    for (const file of files) {
        if (file.type === 'deleted') continue;

        // ── .env file scanning ───────────────────────────────
        if (file.file.includes('.env') && !file.file.includes('.example')) {
            const envFindings = scanEnvFile(file);
            findings.push(...envFindings);
        }

        for (const hunk of file.hunks) {
            const addedLines = hunk.changes
                .filter((c) => c.type === 'add')
                .map((c) => ({ content: c.content, line: c.ln || c.ln2 || hunk.newStart }));

            // 1. Heuristic pattern checks
            for (const { content, line } of addedLines) {
                for (const [pattern, severity, message] of HEURISTIC_RULES) {
                    pattern.lastIndex = 0; // Reset regex state
                    if (pattern.test(content)) {
                        findings.push({
                            file: file.file,
                            line,
                            severity,
                            message: `${message}: ${content.trim().slice(0, 80)}`,
                            source: 'heuristic',
                        });
                    }
                }

                // 2. Entropy-based secret detection
                const strings = extractStrings(content);
                for (const { value, context } of strings) {
                    const result = detectSecret(value, context);
                    if (result.isSecret) {
                        findings.push({
                            file: file.file,
                            line,
                            severity: result.confidence === 'high' ? 'critical' : 'warning',
                            message: `${result.reason}: ${value.slice(0, 40)}...`,
                            source: 'entropy',
                        });
                    }
                }

                // 3. Base64 encoded secret detection
                const b64Strings = content.match(/['"`]([A-Za-z0-9+/]{24,}={0,2})['"`]/g);
                if (b64Strings) {
                    for (const match of b64Strings) {
                        const value = match.slice(1, -1);
                        const b64Result = detectBase64Secrets(value);
                        if (b64Result.isSecret) {
                            findings.push({
                                file: file.file,
                                line,
                                severity: 'critical',
                                message: `Base64-encoded credential detected: ${value.slice(0, 30)}...`,
                                source: 'entropy',
                            });
                        }
                    }
                }
            }

            // 4. Function length check
            const funcLengthFindings = checkFunctionLength(hunk.content, file.file, hunk.newStart);
            findings.push(...funcLengthFindings);

            // 5. AST-level analysis (for supported file types)
            if (canAnalyze(file.file) && addedLines.length >= 3) {
                const codeSnippet = addedLines.map((l) => l.content).join('\n');
                const astFindings = analyzeWithAST(codeSnippet, file.file);
                for (const af of astFindings) {
                    findings.push({
                        file: file.file,
                        line: af.line ? hunk.newStart + af.line - 1 : hunk.newStart,
                        severity: af.severity,
                        message: af.message,
                        source: 'ast',
                    });
                }
            }

            // 6. Copilot semantic analysis (per-hunk, batched)
            if (addedLines.length >= 3) {
                const codeSnippet = addedLines.map((l) => l.content).join('\n');
                const aiFindings = await analyzeWithCopilot(codeSnippet, file.file, hunk.newStart);
                findings.push(...aiFindings);
            }
        }

        // 7. Run plugins
        if (plugins.length > 0) {
            const fullContent = file.hunks.map((h) => h.content).join('\n');
            for (const plugin of plugins) {
                const pluginFindings = await runPlugin(plugin, file.file, fullContent);
                findings.push(...pluginFindings);
            }
        }
    }

    // Deduplicate
    let result = deduplicateFindings(findings);

    // 8. ML false-positive filtering
    if (fpFilter && result.length > 0) {
        const filtered = [];
        for (const finding of result) {
            const { shouldReport } = await fpFilter.shouldReport(finding);
            if (shouldReport) {
                filtered.push(finding);
            }
        }
        result = filtered;
    }

    return result;
}

// --- Internals ---

function scanEnvFile(file) {
    const findings = [];

    for (const hunk of file.hunks) {
        const addedLines = hunk.changes
            .filter((c) => c.type === 'add')
            .map((c) => ({ content: c.content, line: c.ln || c.ln2 || hunk.newStart }));

        for (const { content, line } of addedLines) {
            // Parse KEY=VALUE patterns
            const envMatch = content.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
            if (!envMatch) continue;

            const [, key, value] = envMatch;

            // Check if key matches known secret patterns
            if (ENV_SECRET_KEYS.some((p) => p.test(key)) && value.trim().length > 0) {
                // Skip placeholder/example values
                if (/^(your_|<|changeme|xxx|placeholder)/i.test(value.trim())) continue;

                findings.push({
                    file: file.file,
                    line,
                    severity: 'critical',
                    message: `Secret in .env file: ${key}=${value.slice(0, 20)}...`,
                    source: 'entropy',
                });
            }
        }
    }

    return findings;
}

function extractStrings(line) {
    const strings = [];
    const regex = /(?:const|let|var)\s+(\w+)\s*=\s*['"`]([^'"`]{8,})['"`]/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
        strings.push({ context: match[1], value: match[2] });
    }
    return strings;
}

function checkFunctionLength(content, file, startLine) {
    const findings = [];
    const lines = content.split('\n');
    let funcStart = -1;
    let braceDepth = 0;
    let funcName = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcMatch = line.match(/(?:function|const|let|var)\s+(\w+)|(\w+)\s*(?:=\s*)?\(.*\)\s*(?:=>)?\s*\{/);

        if (funcMatch && braceDepth === 0) {
            funcStart = i;
            funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
            braceDepth = 0;
        }

        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        braceDepth += opens - closes;

        if (funcStart !== -1 && braceDepth <= 0) {
            const funcLength = i - funcStart + 1;
            if (funcLength > MAX_FUNCTION_LINES) {
                findings.push({
                    file,
                    line: startLine + funcStart,
                    severity: 'warning',
                    message: `Function "${funcName}" is ${funcLength} lines long (max recommended: ${MAX_FUNCTION_LINES})`,
                    source: 'heuristic',
                });
            }
            funcStart = -1;
            braceDepth = 0;
        }
    }

    return findings;
}

async function analyzeWithCopilot(codeSnippet, file, startLine) {
    const response = await askCopilot(
        `Review this code change for potential issues. Check for logic errors, ` +
        `race conditions, null/undefined risks, error handling gaps, and edge cases. ` +
        `Be concise — list only real issues, not style preferences:\n\n${codeSnippet.slice(0, 2000)}`,
        { timeout: 20000 }
    );

    if (!response) return [];

    // Parse Copilot's response into structured findings
    return parseCopilotResponse(response, file, startLine);
}

function parseCopilotResponse(response, file, startLine) {
    const findings = [];
    const lines = response.split('\n').filter((l) => l.trim());

    for (const line of lines) {
        // Skip meta lines
        if (line.startsWith('Here') || line.startsWith('The code') || line.startsWith('Overall')) continue;

        // Try to extract severity from keywords
        const lower = line.toLowerCase();
        let severity = 'suggestion';
        if (lower.includes('error') || lower.includes('bug') || lower.includes('crash')) severity = 'error';
        else if (lower.includes('warn') || lower.includes('risk') || lower.includes('issue')) severity = 'warning';
        else if (lower.includes('consider') || lower.includes('suggest') || lower.includes('could')) severity = 'suggestion';

        const message = line.replace(/^[-*•\d.)\s]+/, '').trim();
        if (message.length > 10) {
            findings.push({ file, line: startLine, severity, message, source: 'copilot' });
        }
    }

    return findings;
}

function deduplicateFindings(findings) {
    const seen = new Set();
    return findings.filter((f) => {
        const key = `${f.file}:${f.line}:${f.message.slice(0, 50)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

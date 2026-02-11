import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} Finding
 * @property {string} file       - File path
 * @property {number|null} line  - Line number (null if file-level)
 * @property {'critical'|'error'|'warning'|'info'|'suggestion'} severity
 * @property {string} message    - Human-readable finding description
 * @property {'heuristic'|'copilot'} source
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

// Function length threshold (lines)
const MAX_FUNCTION_LINES = 50;

/**
 * Runs multi-dimensional analysis on changed code:
 *   1. Heuristic pattern matching (instant, no AI)
 *   2. Function length checks
 *   3. Copilot-powered semantic analysis (logic errors, race conditions, edge cases)
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} files
 * @returns {Promise<Finding[]>}
 */
export async function analyze(files) {
    const findings = [];

    for (const file of files) {
        if (file.type === 'deleted') continue;

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
            }

            // 2. Function length check
            const funcLengthFindings = checkFunctionLength(hunk.content, file.file, hunk.newStart);
            findings.push(...funcLengthFindings);

            // 3. Copilot semantic analysis (per-hunk, batched)
            if (addedLines.length >= 3) {
                const codeSnippet = addedLines.map((l) => l.content).join('\n');
                const aiFindings = await analyzeWithCopilot(codeSnippet, file.file, hunk.newStart);
                findings.push(...aiFindings);
            }
        }
    }

    return deduplicateFindings(findings);
}

// --- Internals ---

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

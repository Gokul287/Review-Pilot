/**
 * Performance budget validator.
 * Checks changed files against configurable thresholds for size,
 * function length, and cyclomatic complexity.
 */

import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { calculateComplexity, canAnalyze } from '../analyzers/ast-analyzer.js';

/**
 * @typedef {object} BudgetViolation
 * @property {'file-size'|'function-length'|'complexity'} type
 * @property {string} file    - File path
 * @property {number} actual  - Measured value
 * @property {number} limit   - Budget limit
 * @property {string} message - Human-readable message
 */

// Default budgets (can be overridden in .reviewpilotrc)
const DEFAULT_BUDGETS = {
    maxFileSize: 500 * 1024,         // 500KB
    maxFunctionLength: 50,            // lines
    maxCyclomaticComplexity: 10,      // McCabe
};

/**
 * Checks changed files against performance budgets.
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} files
 * @param {string} repoRoot
 * @param {object} [budgets] - Custom budget thresholds
 * @returns {Promise<BudgetViolation[]>}
 */
export async function checkPerformanceBudget(files, repoRoot, budgets = {}) {
    const config = { ...DEFAULT_BUDGETS, ...budgets };
    const violations = [];

    const sourceFiles = files.filter(
        (f) => f.type !== 'deleted' && f.category === 'feature'
    );

    for (const file of sourceFiles) {
        const fullPath = join(repoRoot, file.file);

        // ── File size check ──────────────────────────────────
        if (existsSync(fullPath)) {
            try {
                const stat = statSync(fullPath);
                if (stat.size > config.maxFileSize) {
                    violations.push({
                        type: 'file-size',
                        file: file.file,
                        actual: stat.size,
                        limit: config.maxFileSize,
                        message: `File size ${formatBytes(stat.size)} exceeds budget of ${formatBytes(config.maxFileSize)}`,
                    });
                }
            } catch {
                // Skip unreadable files
            }
        }

        // ── Function length check (hunk-based) ──────────────
        for (const hunk of file.hunks) {
            const funcLengths = measureFunctionLengths(hunk.content);
            for (const { name, length, startLine } of funcLengths) {
                if (length > config.maxFunctionLength) {
                    violations.push({
                        type: 'function-length',
                        file: file.file,
                        actual: length,
                        limit: config.maxFunctionLength,
                        message: `Function "${name}" is ${length} lines (budget: ${config.maxFunctionLength})`,
                    });
                }
            }
        }

        // ── Cyclomatic complexity check (AST-based) ─────────
        if (canAnalyze(file.file) && existsSync(fullPath)) {
            try {
                const content = readFileSync(fullPath, 'utf-8');
                const complexity = calculateComplexity(content, file.file);
                if (complexity > config.maxCyclomaticComplexity) {
                    violations.push({
                        type: 'complexity',
                        file: file.file,
                        actual: complexity,
                        limit: config.maxCyclomaticComplexity,
                        message: `Cyclomatic complexity ${complexity} exceeds budget of ${config.maxCyclomaticComplexity}`,
                    });
                }
            } catch {
                // Skip files that can't be analyzed
            }
        }
    }

    return violations;
}

// ── Internals ────────────────────────────────────────────────

/**
 * Measures function lengths in a code block using brace counting.
 */
function measureFunctionLengths(content) {
    const lines = content.split('\n');
    const functions = [];
    let funcStart = -1;
    let braceDepth = 0;
    let funcName = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcMatch = line.match(
            /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(.*\)\s*(?:=>)?\s*\{/
        );

        if (funcMatch && braceDepth === 0) {
            funcStart = i;
            funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
            braceDepth = 0;
        }

        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;

        if (funcStart !== -1 && braceDepth <= 0) {
            functions.push({
                name: funcName,
                length: i - funcStart + 1,
                startLine: funcStart,
            });
            funcStart = -1;
            braceDepth = 0;
        }
    }

    return functions;
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

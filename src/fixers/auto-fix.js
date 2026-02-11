/**
 * Auto-fix system for ReviewPilot findings.
 * Generates and applies fixes for common code issues.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} Fix
 * @property {number} id           - Fix ID (maps to finding index)
 * @property {string} type         - Fix type: remove-line | replace | insert
 * @property {string} file         - File path
 * @property {number} line         - Line number
 * @property {string} description  - Human-readable description
 * @property {string} original     - Original content
 * @property {string} replacement  - Replacement content (empty for removals)
 * @property {string} rule         - Rule that triggered the fix
 */

// Fix generators per rule pattern
const FIX_GENERATORS = {
    'console': generateConsoleFix,
    'debugger': generateDebuggerFix,
    'secret': generateSecretFix,
    'catch': generateCatchFix,
    'eval': generateEvalFix,
};

/**
 * Generates available fixes for a list of findings.
 *
 * @param {import('../linters/smart-linter.js').Finding[]} findings
 * @param {string} repoRoot
 * @returns {Fix[]}
 */
export function getAvailableFixes(findings, repoRoot) {
    const fixes = [];

    for (let i = 0; i < findings.length; i++) {
        const finding = findings[i];
        const fix = generateFix(finding, i, repoRoot);
        if (fix) {
            fixes.push(fix);
        }
    }

    return fixes;
}

/**
 * Generates a fix for a single finding.
 *
 * @param {object} finding - Finding object
 * @param {number} id      - Finding index (used as fix ID)
 * @param {string} repoRoot
 * @returns {Fix | null}
 */
export function generateFix(finding, id, repoRoot) {
    const message = finding.message.toLowerCase();

    for (const [pattern, generator] of Object.entries(FIX_GENERATORS)) {
        if (message.includes(pattern)) {
            return generator(finding, id, repoRoot);
        }
    }

    return null;
}

/**
 * Applies a fix to the filesystem.
 *
 * @param {Fix} fix       - Fix to apply
 * @param {string} repoRoot
 * @returns {{ success: boolean, error?: string }}
 */
export function applyFix(fix, repoRoot) {
    try {
        const fullPath = join(repoRoot, fix.file);
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        if (fix.line < 1 || fix.line > lines.length) {
            return { success: false, error: `Line ${fix.line} out of range` };
        }

        let newContent;

        switch (fix.type) {
            case 'remove-line':
                lines.splice(fix.line - 1, 1);
                newContent = lines.join('\n');
                break;

            case 'replace':
                lines[fix.line - 1] = fix.replacement;
                newContent = lines.join('\n');
                break;

            case 'insert':
                lines.splice(fix.line, 0, fix.replacement);
                newContent = lines.join('\n');
                break;

            default:
                return { success: false, error: `Unknown fix type: ${fix.type}` };
        }

        writeFileSync(fullPath, newContent, 'utf-8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Generates a unified diff patch string for a fix (for preview).
 *
 * @param {Fix} fix - Fix object
 * @returns {string} Unified diff format
 */
export function generatePatch(fix) {
    const lines = [];
    lines.push(`--- a/${fix.file}`);
    lines.push(`+++ b/${fix.file}`);

    switch (fix.type) {
        case 'remove-line':
            lines.push(`@@ -${fix.line},1 +${fix.line},0 @@`);
            lines.push(`-${fix.original}`);
            break;

        case 'replace':
            lines.push(`@@ -${fix.line},1 +${fix.line},1 @@`);
            lines.push(`-${fix.original}`);
            lines.push(`+${fix.replacement}`);
            break;

        case 'insert':
            lines.push(`@@ -${fix.line},0 +${fix.line},1 @@`);
            lines.push(`+${fix.replacement}`);
            break;
    }

    return lines.join('\n');
}

/**
 * Generates a test scaffold for an untested file using Copilot.
 *
 * @param {string} sourceFile - Source file path
 * @param {string} repoRoot
 * @returns {Promise<{ testFile: string, content: string } | null>}
 */
export async function generateTestScaffold(sourceFile, repoRoot) {
    const fullPath = join(repoRoot, sourceFile);

    try {
        const content = readFileSync(fullPath, 'utf-8').slice(0, 2000);

        const scaffold = await askCopilot(
            `Generate a Vitest test file for the following code. Include test cases for ` +
            `happy path, error cases, and edge cases. Use describe/it blocks:\n\n${content}`,
            { timeout: 20000 }
        );

        if (!scaffold) return null;

        // Determine test file path
        const testFile = sourceFile
            .replace(/\.(js|ts|mjs)$/, '.test.$1')
            .replace('src/', 'tests/');

        return { testFile, content: scaffold };
    } catch {
        return null;
    }
}

// ── Fix Generators ───────────────────────────────────────────

function generateConsoleFix(finding, id, repoRoot) {
    const original = getLineContent(finding.file, finding.line, repoRoot);
    if (!original) return null;

    return {
        id,
        type: 'remove-line',
        file: finding.file,
        line: finding.line,
        description: 'Remove console statement',
        original: original.trim(),
        replacement: '',
        rule: 'console',
    };
}

function generateDebuggerFix(finding, id, repoRoot) {
    const original = getLineContent(finding.file, finding.line, repoRoot);
    if (!original) return null;

    return {
        id,
        type: 'remove-line',
        file: finding.file,
        line: finding.line,
        description: 'Remove debugger statement',
        original: original.trim(),
        replacement: '',
        rule: 'debugger',
    };
}

function generateSecretFix(finding, id, repoRoot) {
    const original = getLineContent(finding.file, finding.line, repoRoot);
    if (!original) return null;

    // Extract variable name and suggest env var
    const varMatch = original.match(/(?:const|let|var)\s+(\w+)/);
    const varName = varMatch ? varMatch[1] : 'SECRET';
    const envVar = varName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();

    const indent = original.match(/^(\s*)/)?.[1] || '';
    const replacement = `${indent}const ${varName} = process.env.${envVar};`;

    return {
        id,
        type: 'replace',
        file: finding.file,
        line: finding.line,
        description: `Replace hardcoded value with process.env.${envVar}`,
        original: original.trim(),
        replacement: replacement.trim(),
        rule: 'secret',
    };
}

function generateCatchFix(finding, id, repoRoot) {
    const original = getLineContent(finding.file, finding.line, repoRoot);
    if (!original) return null;

    const indent = original.match(/^(\s*)/)?.[1] || '';

    return {
        id,
        type: 'replace',
        file: finding.file,
        line: finding.line,
        description: 'Add error logging to empty catch block',
        original: original.trim(),
        replacement: `${indent}.catch((err) => { console.error('Unhandled error:', err); })`.trim(),
        rule: 'catch',
    };
}

function generateEvalFix(finding, id, repoRoot) {
    const original = getLineContent(finding.file, finding.line, repoRoot);
    if (!original) return null;

    return {
        id,
        type: 'replace',
        file: finding.file,
        line: finding.line,
        description: 'Replace eval() with safer alternative (needs manual review)',
        original: original.trim(),
        replacement: `// TODO: Replace eval() with a safer alternative\n// ${original.trim()}`,
        rule: 'eval',
    };
}

// ── Helpers ──────────────────────────────────────────────────

function getLineContent(file, line, repoRoot) {
    try {
        const fullPath = join(repoRoot, file);
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        return lines[line - 1] || null;
    } catch {
        return null;
    }
}

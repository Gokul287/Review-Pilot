/**
 * AST-level code analysis using Babel parser.
 * Provides semantic understanding of JavaScript/TypeScript code,
 * reducing false positives compared to regex-based matching.
 */

import * as babelParser from '@babel/parser';
import babelTraverse from '@babel/traverse';
import { calculateEntropy } from '../utils/entropy.js';

// Babel traverse default export handling
const traverse = babelTraverse.default || babelTraverse;

// File extensions supported by the AST analyzer
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];

/**
 * Checks if a file can be analyzed by the AST analyzer.
 * @param {string} filename
 * @returns {boolean}
 */
export function canAnalyze(filename) {
    return SUPPORTED_EXTENSIONS.some((ext) => filename.endsWith(ext));
}

/**
 * Performs AST-based analysis on JavaScript/TypeScript code.
 * Falls back gracefully on parse errors (e.g. unsupported syntax).
 *
 * @param {string} code     - Source code text
 * @param {string} filename - File path (used for determining parser options)
 * @returns {Array<{ line: number, message: string, severity: string }>}
 */
export function analyzeWithAST(code, filename) {
    if (!code || !canAnalyze(filename)) return [];

    let ast;
    try {
        ast = babelParser.parse(code, {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            plugins: getPlugins(filename),
            errorRecovery: true,
        });
    } catch {
        // Graceful fallback — unsupported syntax or broken file
        return [];
    }

    const findings = [];

    try {
        traverse(ast, {
            // ── Console statements outside conditionals ──────────
            CallExpression(path) {
                if (
                    path.node.callee.type === 'MemberExpression' &&
                    path.node.callee.object.name === 'console'
                ) {
                    const method = path.node.callee.property.name || path.node.callee.property.value;

                    // Check if inside a conditional block (reduces false positives)
                    const inCondition = path.findParent(
                        (p) => p.isIfStatement() || p.isConditionalExpression() || p.isSwitchCase()
                    );

                    // Check if inside a catch block (acceptable)
                    const inCatch = path.findParent((p) => p.isCatchClause());

                    if (!inCondition && !inCatch && ['log', 'debug', 'info'].includes(method)) {
                        findings.push({
                            line: path.node.loc?.start.line || 0,
                            message: `Console.${method}() statement outside conditional/catch block`,
                            severity: 'warning',
                        });
                    }
                }

                // ── eval() detection with context ────────────────
                if (
                    path.node.callee.name === 'eval' ||
                    (path.node.callee.type === 'Identifier' && path.node.callee.name === 'eval')
                ) {
                    findings.push({
                        line: path.node.loc?.start.line || 0,
                        message: 'Use of eval() — security risk; consider safer alternatives',
                        severity: 'error',
                    });
                }
            },

            // ── Hardcoded secrets in security-sensitive assignments ──
            AssignmentExpression(path) {
                const left = path.node.left;
                const right = path.node.right;

                if (left.type !== 'Identifier' && left.type !== 'MemberExpression') return;

                const varName = left.name || left.property?.name || '';

                if (!/password|secret|token|key|auth|cred|api.?key/i.test(varName)) return;

                if (right.type === 'StringLiteral' && right.value.length > 4) {
                    const entropy = calculateEntropy(right.value);
                    if (entropy > 3.5) {
                        findings.push({
                            line: path.node.loc?.start.line || 0,
                            message: `High-entropy string assigned to security variable "${varName}" (entropy: ${entropy.toFixed(1)})`,
                            severity: 'critical',
                        });
                    }
                }
            },

            // ── Variable declarators with hardcoded secrets ──────
            VariableDeclarator(path) {
                const id = path.node.id;
                const init = path.node.init;

                if (id.type !== 'Identifier' || !init) return;

                if (!/password|secret|token|key|auth|cred|api.?key/i.test(id.name)) return;

                if (init.type === 'StringLiteral' && init.value.length > 4) {
                    const entropy = calculateEntropy(init.value);
                    if (entropy > 3.5) {
                        findings.push({
                            line: path.node.loc?.start.line || 0,
                            message: `High-entropy string in security variable "${id.name}" (entropy: ${entropy.toFixed(1)})`,
                            severity: 'critical',
                        });
                    }
                }
            },

            // ── innerHTML / outerHTML assignments ────────────────
            MemberExpression(path) {
                const prop = path.node.property;
                if (
                    prop &&
                    (prop.name === 'innerHTML' || prop.name === 'outerHTML') &&
                    path.parent.type === 'AssignmentExpression' &&
                    path.parent.left === path.node
                ) {
                    findings.push({
                        line: path.node.loc?.start.line || 0,
                        message: `Direct ${prop.name} assignment — XSS risk; use textContent or sanitize`,
                        severity: 'warning',
                    });
                }
            },

            // ── Empty catch blocks ──────────────────────────────
            CatchClause(path) {
                if (
                    path.node.body.body.length === 0 ||
                    (path.node.body.body.length === 1 &&
                        path.node.body.body[0].type === 'EmptyStatement')
                ) {
                    findings.push({
                        line: path.node.loc?.start.line || 0,
                        message: 'Empty catch block — errors are silently swallowed',
                        severity: 'warning',
                    });
                }
            },
        });
    } catch {
        // Traversal error — return what we have
    }

    return findings;
}

/**
 * Calculates cyclomatic complexity of code using AST.
 *
 * @param {string} code     - Source code
 * @param {string} filename - File name
 * @returns {number} Cyclomatic complexity
 */
export function calculateComplexity(code, filename) {
    if (!code || !canAnalyze(filename)) return 0;

    let ast;
    try {
        ast = babelParser.parse(code, {
            sourceType: 'module',
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            plugins: getPlugins(filename),
            errorRecovery: true,
        });
    } catch {
        return 0;
    }

    let complexity = 1; // Base complexity

    try {
        traverse(ast, {
            IfStatement() { complexity++; },
            ConditionalExpression() { complexity++; },
            SwitchCase() { complexity++; },
            ForStatement() { complexity++; },
            ForInStatement() { complexity++; },
            ForOfStatement() { complexity++; },
            WhileStatement() { complexity++; },
            DoWhileStatement() { complexity++; },
            CatchClause() { complexity++; },
            LogicalExpression({ node }) {
                if (node.operator === '&&' || node.operator === '||') complexity++;
            },
        });
    } catch {
        // Return base complexity on error
    }

    return complexity;
}

// ── Internals ────────────────────────────────────────────────

function getPlugins(filename) {
    const plugins = ['decorators-legacy', 'importAssertions', 'dynamicImport'];

    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
        plugins.push('typescript');
    }
    if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) {
        plugins.push('jsx');
    }

    return plugins;
}

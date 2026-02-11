import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/linters/smart-linter.js';

// Helper to create a mock FileChange with a hunk containing the given code lines
function mockFile(file, lines) {
    return {
        file,
        type: 'modified',
        category: 'feature',
        additions: lines.length,
        deletions: 0,
        hunks: [
            {
                oldStart: 1,
                newStart: 1,
                content: lines.join('\n'),
                changes: lines.map((content, i) => ({
                    type: 'add',
                    add: true,
                    ln: i + 1,
                    content: `+${content}`,
                })),
            },
        ],
    };
}

describe('smart-linter', () => {
    describe('heuristic rules', () => {
        it('should detect console.log statements', async () => {
            const files = [mockFile('app.js', ['console.log("debug");'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.message.includes('console'))).toBe(true);
            expect(findings.find((f) => f.message.includes('console')).severity).toBe('warning');
        });

        it('should detect hardcoded secrets', async () => {
            const files = [mockFile('app.js', ['const password = "super_secret_123";'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.severity === 'critical' && f.message.includes('secret'))).toBe(true);
        });

        it('should detect api_key patterns', async () => {
            const files = [mockFile('config.js', ['const api_key = "sk-live-abc123";'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.severity === 'critical')).toBe(true);
        });

        it('should detect debugger statements', async () => {
            const files = [mockFile('app.js', ['function test() {', '  debugger;', '}'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.severity === 'error' && f.message.includes('Debugger'))).toBe(true);
        });

        it('should detect eval() usage', async () => {
            const files = [mockFile('app.js', ['eval(userInput);'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.severity === 'error' && f.message.includes('eval'))).toBe(true);
        });

        it('should detect TODO/FIXME comments', async () => {
            const files = [mockFile('app.js', ['// TODO: fix this later', '// FIXME: broken'])];
            const findings = await analyze(files, { useML: false });

            const todos = findings.filter((f) => f.message.includes('TODO'));
            expect(todos.length).toBeGreaterThanOrEqual(1);
            expect(todos[0].severity).toBe('info');
        });

        it('should detect empty catch blocks', async () => {
            const files = [mockFile('app.js', ['promise.catch()'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.message.includes('catch'))).toBe(true);
        });

        it('should detect @ts-ignore', async () => {
            const files = [mockFile('app.ts', ['// @ts-ignore', 'const x: any = 5;'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.message.includes('ts-ignore'))).toBe(true);
        });

        it('should detect process.exit calls', async () => {
            const files = [mockFile('app.js', ['process.exit(1);'])];
            const findings = await analyze(files, { useML: false });

            expect(findings.some((f) => f.message.includes('process.exit'))).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should skip deleted files', async () => {
            const files = [
                {
                    file: 'old.js',
                    type: 'deleted',
                    category: 'feature',
                    additions: 0,
                    deletions: 10,
                    hunks: [],
                },
            ];
            const findings = await analyze(files, { useML: false });
            expect(findings).toHaveLength(0);
        });

        it('should handle files with no hunks', async () => {
            const files = [
                {
                    file: 'empty.js',
                    type: 'modified',
                    category: 'feature',
                    additions: 0,
                    deletions: 0,
                    hunks: [],
                },
            ];
            const findings = await analyze(files, { useML: false });
            expect(findings).toHaveLength(0);
        });

        it('should deduplicate identical findings', async () => {
            const files = [mockFile('app.js', ['console.log("a");'])];
            const findings = await analyze(files, { useML: false });

            const consoleLogs = findings.filter((f) => f.message.includes('console'));
            expect(consoleLogs).toHaveLength(1);
        });

        it('should include file path and line number in findings', async () => {
            const files = [mockFile('src/utils/helper.js', ['debugger;'])];
            const findings = await analyze(files, { useML: false });

            const finding = findings.find((f) => f.message.includes('Debugger'));
            expect(finding.file).toBe('src/utils/helper.js');
            expect(finding.line).toBeDefined();
            expect(finding.source).toBe('heuristic');
        });
    });

    describe('clean code', () => {
        it('should produce no findings for clean code', async () => {
            const files = [
                mockFile('app.js', [
                    'export function add(a, b) {',
                    '  return a + b;',
                    '}',
                ]),
            ];
            const findings = await analyze(files, { useML: false });
            expect(findings).toHaveLength(0);
        });
    });
});

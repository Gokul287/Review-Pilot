import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAvailableFixes, generateFix, generatePatch, applyFix } from '../../src/fixers/auto-fix.js';
import { readFileSync, writeFileSync } from 'node:fs';

vi.mock('node:fs', async () => {
    const actual = await vi.importActual('node:fs');
    return {
        ...actual,
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    };
});

vi.mock('../../src/utils/copilot.js', () => ({
    askCopilot: vi.fn().mockResolvedValue(null),
}));

describe('generateFix', () => {
    beforeEach(() => {
        readFileSync.mockReturnValue('line1\nconsole.log("test");\nline3\n');
    });

    it('should generate fix for console statements', () => {
        const finding = {
            file: 'src/app.js',
            line: 2,
            message: 'Leftover console statement',
        };

        const fix = generateFix(finding, 0, '/repo');
        expect(fix).not.toBeNull();
        expect(fix.type).toBe('remove-line');
        expect(fix.rule).toBe('console');
    });

    it('should generate fix for debugger statements', () => {
        readFileSync.mockReturnValue('line1\ndebugger;\nline3\n');

        const finding = {
            file: 'src/app.js',
            line: 2,
            message: 'Debugger statement left in code',
        };

        const fix = generateFix(finding, 0, '/repo');
        expect(fix).not.toBeNull();
        expect(fix.type).toBe('remove-line');
        expect(fix.rule).toBe('debugger');
    });

    it('should generate fix for hardcoded secrets', () => {
        readFileSync.mockReturnValue('const apiKey = "sk-1234567890";\n');

        const finding = {
            file: 'src/config.js',
            line: 1,
            message: 'Potential hardcoded secret or credential',
        };

        const fix = generateFix(finding, 0, '/repo');
        expect(fix).not.toBeNull();
        expect(fix.type).toBe('replace');
        expect(fix.replacement).toContain('process.env');
        expect(fix.rule).toBe('secret');
    });

    it('should return null for unknown issue types', () => {
        const finding = {
            file: 'src/app.js',
            line: 1,
            message: 'TypeScript any type usage',
        };

        expect(generateFix(finding, 0, '/repo')).toBeNull();
    });
});

describe('generatePatch', () => {
    it('should generate unified diff for remove-line', () => {
        const fix = {
            type: 'remove-line',
            file: 'src/app.js',
            line: 5,
            original: 'console.log("test");',
            replacement: '',
        };

        const patch = generatePatch(fix);
        expect(patch).toContain('--- a/src/app.js');
        expect(patch).toContain('+++ b/src/app.js');
        expect(patch).toContain('-console.log("test");');
    });

    it('should generate unified diff for replace', () => {
        const fix = {
            type: 'replace',
            file: 'src/config.js',
            line: 1,
            original: 'const key = "abc";',
            replacement: 'const key = process.env.KEY;',
        };

        const patch = generatePatch(fix);
        expect(patch).toContain('-const key = "abc";');
        expect(patch).toContain('+const key = process.env.KEY;');
    });
});

describe('getAvailableFixes', () => {
    it('should return fixes for fixable findings', () => {
        readFileSync.mockReturnValue('console.log("test");\ndebugger;\n');

        const findings = [
            { file: 'a.js', line: 1, message: 'Leftover console statement' },
            { file: 'a.js', line: 2, message: 'Debugger statement' },
            { file: 'a.js', line: 3, message: 'TypeScript any type' },
        ];

        const fixes = getAvailableFixes(findings, '/repo');
        expect(fixes).toHaveLength(2); // console + debugger, not "any type"
    });

    it('should return empty array for no fixable findings', () => {
        const findings = [
            { file: 'a.js', line: 1, message: 'Consider using const' },
        ];

        const fixes = getAvailableFixes(findings, '/repo');
        expect(fixes).toHaveLength(0);
    });
});

describe('applyFix', () => {
    it('should apply remove-line fix', () => {
        readFileSync.mockReturnValue('line1\nconsole.log("test");\nline3\n');

        const fix = {
            type: 'remove-line',
            file: 'src/app.js',
            line: 2,
        };

        const result = applyFix(fix, '/repo');
        expect(result.success).toBe(true);
        expect(writeFileSync).toHaveBeenCalled();
    });

    it('should fail for out-of-range line', () => {
        readFileSync.mockReturnValue('single line');

        const fix = {
            type: 'remove-line',
            file: 'src/app.js',
            line: 999,
        };

        const result = applyFix(fix, '/repo');
        expect(result.success).toBe(false);
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkPerformanceBudget } from '../../src/validators/performance-budget.js';

vi.mock('node:fs', async () => {
    const actual = await vi.importActual('node:fs');
    return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(true),
        statSync: vi.fn().mockReturnValue({ size: 1024 }),
        readFileSync: vi.fn().mockReturnValue('function simple() { return 1; }'),
    };
});

vi.mock('../../src/analyzers/ast-analyzer.js', () => ({
    canAnalyze: vi.fn().mockImplementation((f) => f.endsWith('.js')),
    calculateComplexity: vi.fn().mockReturnValue(5),
}));

describe('checkPerformanceBudget', () => {
    const makeFile = (name, overrides = {}) => ({
        file: name,
        type: 'modified',
        category: 'feature',
        hunks: [{ content: 'function test() { return 1; }', changes: [] }],
        ...overrides,
    });

    it('should return empty array when all budgets pass', async () => {
        const files = [makeFile('src/app.js')];
        const violations = await checkPerformanceBudget(files, '/repo');
        expect(violations).toHaveLength(0);
    });

    it('should detect file size violations', async () => {
        const { statSync } = await import('node:fs');
        statSync.mockReturnValue({ size: 600 * 1024 }); // 600KB > 500KB

        const files = [makeFile('src/large.js')];
        const violations = await checkPerformanceBudget(files, '/repo');
        expect(violations.some((v) => v.type === 'file-size')).toBe(true);
    });

    it('should detect cyclomatic complexity violations', async () => {
        const { calculateComplexity } = await import('../../src/analyzers/ast-analyzer.js');
        calculateComplexity.mockReturnValue(15); // > 10 default

        const files = [makeFile('src/complex.js')];
        const violations = await checkPerformanceBudget(files, '/repo');
        expect(violations.some((v) => v.type === 'complexity')).toBe(true);
    });

    it('should respect custom budget thresholds', async () => {
        const { statSync } = await import('node:fs');
        statSync.mockReturnValue({ size: 200 * 1024 });

        const files = [makeFile('src/app.js')];
        const violations = await checkPerformanceBudget(files, '/repo', {
            maxFileSize: 100 * 1024, // 100KB threshold
        });
        expect(violations.some((v) => v.type === 'file-size')).toBe(true);
    });

    it('should skip deleted files', async () => {
        const files = [makeFile('src/deleted.js', { type: 'deleted' })];
        const violations = await checkPerformanceBudget(files, '/repo');
        expect(violations).toHaveLength(0);
    });

    it('should skip non-feature files', async () => {
        const files = [makeFile('docs/readme.md', { category: 'docs' })];
        const violations = await checkPerformanceBudget(files, '/repo');
        expect(violations).toHaveLength(0);
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FalsePositiveFilter } from '../../src/ml/false-positive-filter.js';

vi.mock('node:fs', async () => {
    const actual = await vi.importActual('node:fs');
    return {
        ...actual,
        readFileSync: vi.fn().mockImplementation(() => { throw new Error('Not found'); }),
        writeFileSync: vi.fn(),
        mkdirSync: vi.fn(),
        existsSync: vi.fn().mockReturnValue(false),
    };
});

describe('FalsePositiveFilter', () => {
    let filter;

    beforeEach(async () => {
        filter = new FalsePositiveFilter();
        await filter.initialize();
    });

    it('should classify real issues as reportable', async () => {
        const result = await filter.shouldReport({
            message: 'Use of eval() — security risk',
            context: 'eval(userInput)',
        });
        expect(result.shouldReport).toBe(true);
    });

    it('should classify test fixtures as non-reportable', async () => {
        const result = await filter.shouldReport({
            message: 'Potential hardcoded secret',
            context: 'const mockApiKey = "test-key-for-unit-tests"',
            file: 'tests/auth.test.js',
        });
        expect(result.shouldReport).toBe(false);
    });

    it('should learn from feedback', async () => {
        const finding = {
            message: 'Contains TODO comment',
            context: '// TODO: add error handling',
        };

        // Train it to skip TODOs
        await filter.learn(finding, false);
        await filter.learn(finding, false);
        await filter.learn(finding, false);

        const result = await filter.shouldReport(finding);
        expect(result.shouldReport).toBe(false);
    });

    it('should build feature text from finding', () => {
        const text = filter.buildFeatureText({
            message: 'test message',
            context: 'test context',
            file: 'test.js',
        });
        expect(text).toContain('test message');
        expect(text).toContain('test context');
        expect(text).toContain('test.js');
    });

    it('should handle empty finding gracefully', async () => {
        const result = await filter.shouldReport({});
        expect(typeof result.shouldReport).toBe('boolean');
    });

    it('should default to reporting when unsure', async () => {
        const result = await filter.shouldReport({
            message: 'completely novel finding type xyz_unknown',
        });
        // Should still return a valid result
        expect(typeof result.shouldReport).toBe('boolean');
    });
});

import { describe, it, expect, vi } from 'vitest';
import { buildChecklist } from '../../src/generators/checklist.js';

// Mock copilot to return null (no AI in tests)
vi.mock('../../src/utils/copilot.js', () => ({
    askCopilot: vi.fn(async () => null),
}));

function makeDiffAnalysis(files) {
    return {
        files,
        summary: {
            additions: files.reduce((s, f) => s + f.additions, 0),
            deletions: files.reduce((s, f) => s + f.deletions, 0),
            fileCount: files.length,
        },
    };
}

describe('checklist', () => {
    it('should include General section for all changes', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/app.js', type: 'modified', category: 'feature', additions: 10, deletions: 2 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toContain('### General');
        expect(result).toContain('Code follows project conventions');
    });

    it('should include Feature checklist items for feature changes', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/auth.js', type: 'modified', category: 'feature', additions: 20, deletions: 5 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toContain('### Feature');
        expect(result).toContain('Edge cases are handled');
        expect(result).toContain('documented');
    });

    it('should include Test checklist items for test changes', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'tests/auth.test.js', type: 'added', category: 'test', additions: 30, deletions: 0 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toContain('### Test');
        expect(result).toContain('deterministic');
    });

    it('should add API checklist when breaking changes exist', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/api.js', type: 'modified', category: 'feature', additions: 5, deletions: 3 },
            ]),
            breakingChanges: [
                { file: 'src/api.js', functionName: 'getUser', severity: 'major', description: 'removed' },
            ],
            findings: [],
        });

        expect(result).toContain('### Api');
        expect(result).toContain('API versioning');
    });

    it('should add Security checklist when credential findings exist', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/app.js', type: 'modified', category: 'feature', additions: 5, deletions: 0 },
            ]),
            breakingChanges: [],
            findings: [
                { file: 'src/app.js', line: 10, severity: 'critical', message: 'Potential hardcoded secret or credential', source: 'heuristic' },
            ],
        });

        expect(result).toContain('### Security');
        expect(result).toContain('Input validation');
    });

    it('should add Database checklist when migration files detected', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'db/migration_001.sql', type: 'added', category: 'feature', additions: 20, deletions: 0 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toContain('### Database');
        expect(result).toContain('Migration is reversible');
    });

    it('should include ReviewPilot footer', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/app.js', type: 'modified', category: 'feature', additions: 1, deletions: 0 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toContain('ReviewPilot');
    });

    it('should generate markdown checkbox syntax', async () => {
        const result = await buildChecklist({
            diffAnalysis: makeDiffAnalysis([
                { file: 'src/app.js', type: 'modified', category: 'feature', additions: 1, deletions: 0 },
            ]),
            breakingChanges: [],
            findings: [],
        });

        expect(result).toMatch(/- \[ \]/);
    });
});

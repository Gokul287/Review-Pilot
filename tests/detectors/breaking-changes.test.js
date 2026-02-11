import { describe, it, expect, vi } from 'vitest';
import { detectBreakingChanges } from '../../src/detectors/breaking-changes.js';

// Mock git.js to return controlled file content
vi.mock('../../src/utils/git.js', () => ({
    getFileContent: vi.fn(async (filePath, ref) => {
        const contents = {
            // Old version on 'main'
            'src/api.js:main': `
export function getUser(id) {
  return fetch('/users/' + id);
}

export function createUser(name, email) {
  return fetch('/users', { method: 'POST', body: JSON.stringify({ name, email }) });
}

export function deleteUser(id) {
  return fetch('/users/' + id, { method: 'DELETE' });
}
`,
            // New version on 'HEAD' — removed deleteUser, changed createUser signature
            'src/api.js:HEAD': `
export function getUser(id) {
  return fetch('/users/' + id);
}

export function createUser(name, email, role) {
  return fetch('/users', { method: 'POST', body: JSON.stringify({ name, email, role }) });
}

export function updateUser(id, data) {
  return fetch('/users/' + id, { method: 'PUT', body: JSON.stringify(data) });
}
`,
        };
        return contents[`${filePath}:${ref}`] || null;
    }),
}));

// Mock copilot.js to return null (no AI in tests)
vi.mock('../../src/utils/copilot.js', () => ({
    askCopilot: vi.fn(async () => null),
}));

describe('breaking-changes', () => {
    const mockFiles = [
        {
            file: 'src/api.js',
            type: 'modified',
            category: 'feature',
            additions: 10,
            deletions: 5,
            hunks: [{ content: 'mock', changes: [] }],
        },
    ];

    it('should detect removed exports as major breaking changes', async () => {
        const changes = await detectBreakingChanges(mockFiles, 'main');

        const removed = changes.find(
            (c) => c.functionName === 'deleteUser' && c.newSignature === '(removed)'
        );
        expect(removed).toBeDefined();
        expect(removed.severity).toBe('major');
    });

    it('should detect changed function signatures', async () => {
        const changes = await detectBreakingChanges(mockFiles, 'main');

        const changed = changes.find((c) => c.functionName === 'createUser');
        expect(changed).toBeDefined();
        expect(changed.oldSignature).toBe('name, email');
        expect(changed.newSignature).toBe('name, email, role');
    });

    it('should detect new exports as patch-level changes', async () => {
        const changes = await detectBreakingChanges(mockFiles, 'main');

        const added = changes.find((c) => c.functionName === 'updateUser');
        expect(added).toBeDefined();
        expect(added.severity).toBe('patch');
        expect(added.oldSignature).toBe('(new)');
    });

    it('should NOT flag unchanged exports', async () => {
        const changes = await detectBreakingChanges(mockFiles, 'main');

        const unchanged = changes.find(
            (c) => c.functionName === 'getUser' && c.severity === 'major'
        );
        expect(unchanged).toBeUndefined();
    });

    it('should skip deleted files', async () => {
        const deletedFiles = [
            {
                file: 'src/api.js',
                type: 'deleted',
                category: 'feature',
                additions: 0,
                deletions: 20,
                hunks: [],
            },
        ];

        const changes = await detectBreakingChanges(deletedFiles, 'main');
        expect(changes).toHaveLength(0);
    });

    it('should skip non-feature files', async () => {
        const testFiles = [
            {
                file: 'tests/api.test.js',
                type: 'modified',
                category: 'test',
                additions: 5,
                deletions: 2,
                hunks: [{ content: 'test', changes: [] }],
            },
        ];

        const changes = await detectBreakingChanges(testFiles, 'main');
        expect(changes).toHaveLength(0);
    });
});

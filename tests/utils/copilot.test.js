import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFile } from 'node:child_process';

// We need to mock child_process before importing copilot.js
vi.mock('node:child_process', () => ({
    execFile: vi.fn(),
}));

// Fresh import after mocking
let askCopilot, isCopilotAvailable;

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // Dynamic import to reset module state
    const mod = await import('../../src/utils/copilot.js');
    askCopilot = mod.askCopilot;
    isCopilotAvailable = mod.isCopilotAvailable;
});

describe('copilot', () => {
    describe('askCopilot', () => {
        it('should return Copilot response when available', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(null, 'This code looks clean with no issues.\n', '');
            });

            const result = await askCopilot('Review this code');

            expect(result).toBe('This code looks clean with no issues.');
            expect(execFile).toHaveBeenCalledWith(
                'copilot',
                ['-p', 'Review this code'],
                expect.objectContaining({ timeout: 30000 }),
                expect.any(Function)
            );
        });

        it('should return null when Copilot binary not found (ENOENT)', async () => {
            const err = new Error('spawn copilot ENOENT');
            err.code = 'ENOENT';
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(err, '', '');
            });

            const result = await askCopilot('Test prompt');
            expect(result).toBeNull();
        });

        it('should return null on timeout', async () => {
            const err = new Error('timed out');
            err.killed = true;
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(err, '', '');
            });

            const result = await askCopilot('Test prompt', { timeout: 1000 });
            expect(result).toBeNull();
        });

        it('should use custom timeout when specified', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(null, 'response', '');
            });

            await askCopilot('Test', { timeout: 5000 });

            expect(execFile).toHaveBeenCalledWith(
                'copilot',
                ['-p', 'Test'],
                expect.objectContaining({ timeout: 5000 }),
                expect.any(Function)
            );
        });

        it('should return null on generic errors', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(new Error('unexpected error'), '', 'stderr');
            });

            const result = await askCopilot('Test prompt');
            expect(result).toBeNull();
        });
    });

    describe('isCopilotAvailable', () => {
        it('should return true when copilot --version succeeds', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(null, 'copilot v1.0.0', '');
            });

            const available = await isCopilotAvailable();
            expect(available).toBe(true);
        });

        it('should return false when copilot --version fails', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(new Error('not found'), '', '');
            });

            const available = await isCopilotAvailable();
            expect(available).toBe(false);
        });
    });
});

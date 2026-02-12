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
        it('should return Copilot response when available via gh', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                if (cmd === 'gh') {
                    cb(null, 'This code looks clean with no issues.\n', '');
                } else {
                    cb(new Error('not found'), '', '');
                }
            });

            const result = await askCopilot('Review this code');

            expect(result).toBe('This code looks clean with no issues.');
            expect(execFile).toHaveBeenCalledWith(
                'gh',
                ['copilot', '-p', 'Review this code'],
                expect.objectContaining({ timeout: 60000 }), // Checked against new default
                expect.any(Function)
            );
        });

        it('should use fallback to copilot binary if gh fails', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                if (cmd === 'gh') {
                    const err = new Error('gh: command not found');
                    err.code = 'ENOENT';
                    cb(err, '', '');
                } else if (cmd === 'copilot') {
                    cb(null, 'Fallback response', '');
                }
            });

            const result = await askCopilot('Review this code');
            expect(result).toBe('Fallback response');
            expect(execFile).toHaveBeenCalledWith(
                'copilot',
                ['-p', 'Review this code'],
                expect.any(Object),
                expect.any(Function)
            );
        });

        it('should return null when both binaries not found (ENOENT)', async () => {
            const err = new Error('spawn ENOENT');
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

            const result = await askCopilot('Test prompt', { timeout: 1000, retries: 0 });
            expect(result).toBeNull();
        });

        it('should use custom timeout when specified', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                if (cmd === 'gh') {
                    cb(null, 'response', '');
                }
            });

            await askCopilot('Test', { timeout: 5000 });

            expect(execFile).toHaveBeenCalledWith(
                'gh',
                ['copilot', '-p', 'Test'],
                expect.objectContaining({ timeout: 5000 }),
                expect.any(Function)
            );
        });

        it('should return null on generic errors', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(new Error('unexpected error'), '', 'stderr');
            });

            const result = await askCopilot('Test prompt', { retries: 0 });
            expect(result).toBeNull();
        });
    });

    describe('isCopilotAvailable', () => {
        it('should return true when gh copilot --version succeeds', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                if (cmd === 'gh') cb(null, 'gh version 2.0.0', '');
            });

            const available = await isCopilotAvailable();
            expect(available).toBe(true);
        });

        it('should return true when gh fails but copilot succeeds', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                if (cmd === 'gh') cb(new Error('not found'), '', '');
                if (cmd === 'copilot') cb(null, 'copilot 1.0', '');
            });

            const available = await isCopilotAvailable();
            expect(available).toBe(true);
        });

        it('should return false when both fail', async () => {
            execFile.mockImplementation((cmd, args, opts, cb) => {
                cb(new Error('not found'), '', '');
            });

            const available = await isCopilotAvailable();
            expect(available).toBe(false);
        });
    });
});

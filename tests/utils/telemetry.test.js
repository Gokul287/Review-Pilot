import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTelemetryEnabled, trackUsage } from '../../src/utils/telemetry.js';

describe('isTelemetryEnabled', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('should be enabled by default', () => {
        delete process.env.REVIEWPILOT_TELEMETRY;
        delete process.env.DO_NOT_TRACK;
        delete process.env.CI;
        expect(isTelemetryEnabled()).toBe(true);
    });

    it('should respect REVIEWPILOT_TELEMETRY=0', () => {
        process.env.REVIEWPILOT_TELEMETRY = '0';
        expect(isTelemetryEnabled()).toBe(false);
    });

    it('should respect DO_NOT_TRACK=1', () => {
        process.env.DO_NOT_TRACK = '1';
        expect(isTelemetryEnabled()).toBe(false);
    });

    it('should be disabled in CI', () => {
        process.env.CI = 'true';
        expect(isTelemetryEnabled()).toBe(false);
    });

    it('should respect config.telemetry = false', () => {
        delete process.env.REVIEWPILOT_TELEMETRY;
        delete process.env.DO_NOT_TRACK;
        delete process.env.CI;
        expect(isTelemetryEnabled({ telemetry: false })).toBe(false);
    });

    it('should respect config.telemetry = true', () => {
        delete process.env.REVIEWPILOT_TELEMETRY;
        delete process.env.DO_NOT_TRACK;
        delete process.env.CI;
        expect(isTelemetryEnabled({ telemetry: true })).toBe(true);
    });
});

describe('trackUsage', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.REVIEWPILOT_TELEMETRY;
    });

    it('should not call fetch when telemetry is disabled', async () => {
        process.env.REVIEWPILOT_TELEMETRY = '0';
        await trackUsage('test_event');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should silently handle fetch errors', async () => {
        delete process.env.REVIEWPILOT_TELEMETRY;
        delete process.env.DO_NOT_TRACK;
        delete process.env.CI;
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        // Should not throw
        await expect(trackUsage('test_event', {}, { telemetry: true })).resolves.not.toThrow();
    });
});

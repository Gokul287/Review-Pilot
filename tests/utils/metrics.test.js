import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceTracker } from '../../src/utils/metrics.js';

describe('PerformanceTracker', () => {
    let tracker;

    beforeEach(() => {
        tracker = new PerformanceTracker();
    });

    it('should track step timing', async () => {
        tracker.startStep('Test Step');
        await new Promise((r) => setTimeout(r, 50));
        tracker.endStep();

        const summary = tracker.getSummary();
        expect(summary.breakdown).toHaveLength(1);
        expect(summary.breakdown[0].step).toBe('Test Step');
        expect(summary.breakdown[0].ms).toBeGreaterThanOrEqual(40);
    });

    it('should track multiple steps', () => {
        tracker.startStep('Step A');
        tracker.endStep();
        tracker.startStep('Step B');
        tracker.endStep();

        const summary = tracker.getSummary();
        expect(summary.breakdown).toHaveLength(2);
    });

    it('should calculate percentages', async () => {
        tracker.startStep('Fast');
        await new Promise((r) => setTimeout(r, 10));
        tracker.endStep();

        tracker.startStep('Slow');
        await new Promise((r) => setTimeout(r, 30));
        tracker.endStep();

        const summary = tracker.getSummary();
        const fastPct = parseFloat(summary.breakdown[0].percent);
        const slowPct = parseFloat(summary.breakdown[1].percent);
        expect(slowPct).toBeGreaterThan(fastPct);
    });

    it('should identify the bottleneck', () => {
        tracker.startStep('Fast');
        tracker.endStep();

        // Manually set durations for deterministic test
        tracker.steps = [
            { name: 'Fast', start: 0, end: 100, duration: 100 },
            { name: 'Slow', start: 100, end: 600, duration: 500 },
        ];

        const summary = tracker.getSummary();
        const bottleneck = summary.breakdown.find((s) => s.isBottleneck);
        expect(bottleneck.step).toBe('Slow');
    });

    it('should return memory usage', () => {
        const memory = tracker.getMemoryUsage();
        expect(memory.rss).toBeGreaterThan(0);
        expect(memory.heapUsed).toBeGreaterThan(0);
        expect(memory.heapTotal).toBeGreaterThan(0);
    });

    it('should format summary as string', () => {
        tracker.steps = [
            { name: 'Analysis', start: 0, end: 3200, duration: 3200 },
        ];

        const formatted = tracker.formatSummary();
        expect(formatted).toContain('Performance Metrics');
        expect(formatted).toContain('Analysis');
        expect(formatted).toContain('3.2s');
    });

    it('should handle totalTime of 0', () => {
        tracker.steps = [{ name: 'A', start: 0, end: 0, duration: 0 }];
        const summary = tracker.getSummary();
        expect(summary.breakdown[0].percent).toBe('0.0');
    });
});

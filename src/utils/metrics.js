/**
 * Performance instrumentation for the ReviewPilot pipeline.
 * Tracks timing, memory usage, and step-by-step breakdowns.
 */

/**
 * @typedef {object} StepMetric
 * @property {string} name       - Step name
 * @property {number} start      - Start timestamp (ms)
 * @property {number|null} end   - End timestamp (ms)
 * @property {number|null} duration - Duration in ms
 */

/**
 * Tracks performance metrics across pipeline steps.
 *
 * @example
 *   const tracker = new PerformanceTracker();
 *   tracker.startStep('Diff Analysis');
 *   await processDiff(...);
 *   tracker.endStep();
 *   console.log(tracker.getSummary());
 */
export class PerformanceTracker {
    constructor() {
        /** @type {StepMetric[]} */
        this.steps = [];
        this.pipelineStart = Date.now();
    }

    /**
     * Starts timing a named step.
     * @param {string} name - Step name
     */
    startStep(name) {
        this.steps.push({ name, start: Date.now(), end: null, duration: null });
    }

    /**
     * Ends timing of the current (last started) step.
     */
    endStep() {
        const current = this.steps[this.steps.length - 1];
        if (current && current.end === null) {
            current.end = Date.now();
            current.duration = current.end - current.start;
        }
    }

    /**
     * Returns memory usage in MB.
     * @returns {{ rss: number, heapUsed: number, heapTotal: number }}
     */
    getMemoryUsage() {
        const mem = process.memoryUsage();
        return {
            rss: Math.round(mem.rss / 1024 / 1024 * 10) / 10,
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
        };
    }

    /**
     * Returns a summary of all tracked steps.
     * @returns {{ totalTime: number, breakdown: Array<{ step: string, ms: number, percent: string }>, memory: object }}
     */
    getSummary() {
        const totalTime = this.steps.reduce((sum, s) => sum + (s.duration || 0), 0);

        const breakdown = this.steps.map((s) => ({
            step: s.name,
            ms: s.duration || 0,
            percent: totalTime > 0 ? ((s.duration || 0) / totalTime * 100).toFixed(1) : '0.0',
        }));

        // Mark the bottleneck
        if (breakdown.length > 0) {
            const maxStep = breakdown.reduce((max, s) => (s.ms > max.ms ? s : max), breakdown[0]);
            maxStep.isBottleneck = true;
        }

        return {
            totalTime,
            totalTimeFormatted: formatDuration(totalTime),
            wallTime: Date.now() - this.pipelineStart,
            wallTimeFormatted: formatDuration(Date.now() - this.pipelineStart),
            breakdown,
            memory: this.getMemoryUsage(),
        };
    }

    /**
     * Formats the summary as a display-ready string.
     * @returns {string}
     */
    formatSummary() {
        const summary = this.getSummary();
        const lines = [];

        lines.push('⚡ Performance Metrics');
        lines.push('─'.repeat(42));
        lines.push(`Total time: ${summary.totalTimeFormatted}`);
        lines.push('');
        lines.push('Breakdown:');

        const maxNameLen = Math.max(...summary.breakdown.map((s) => s.step.length), 10);

        for (const step of summary.breakdown) {
            const name = step.step.padEnd(maxNameLen + 2);
            const time = formatDuration(step.ms).padStart(8);
            const pct = `(${step.percent}%)`.padStart(8);
            const marker = step.isBottleneck ? ' ← Bottleneck' : '';
            lines.push(`  ${name}${time} ${pct}${marker}`);
        }

        lines.push('');
        lines.push(`Memory: ${summary.memory.rss}MB RSS, ${summary.memory.heapUsed}MB heap`);

        return lines.join('\n');
    }
}

/**
 * Formats milliseconds into a human-readable duration string.
 * @param {number} ms - Milliseconds
 * @returns {string} e.g. "3.2s", "47.3s", "1m 23s"
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
}

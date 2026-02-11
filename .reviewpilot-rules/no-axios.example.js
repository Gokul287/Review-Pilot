/**
 * Example ReviewPilot Plugin: no-axios
 *
 * Recommends using the native `fetch` API instead of axios.
 * Drop this file into `.reviewpilot-rules/` for automatic loading.
 *
 * @see docs/plugins.md for the full plugin authoring guide
 */
export default {
    name: 'no-axios',
    severity: 'info',
    description: 'Prefer native fetch API over axios for HTTP requests',

    /**
     * @param {string} filename - File path being analyzed
     * @param {string} content  - Full file content
     * @returns {Array<{line: number, message: string}>}
     */
    async analyze(filename, content) {
        // Only check JS/TS files
        if (!/\.(js|ts|jsx|tsx|mjs)$/.test(filename)) return [];

        const findings = [];

        content.split('\n').forEach((line, index) => {
            if (/import\s+.*from\s+['"]axios['"]/.test(line) ||
                /require\(\s*['"]axios['"]\s*\)/.test(line)) {
                findings.push({
                    line: index + 1,
                    message: 'Consider using native fetch API instead of axios (smaller bundle, no dependency)',
                });
            }
        });

        return findings;
    },
};

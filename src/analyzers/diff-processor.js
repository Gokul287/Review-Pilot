import parseDiff from 'parse-diff';
import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} FileChange
 * @property {string} file         - File path
 * @property {string} type         - Change type: added | deleted | modified | renamed
 * @property {string} category     - Semantic category: feature | bugfix | refactor | test | docs | config
 * @property {number} additions    - Lines added
 * @property {number} deletions    - Lines deleted
 * @property {Array}  hunks        - Parsed hunk data
 */

/**
 * @typedef {object} DiffAnalysis
 * @property {FileChange[]} files
 * @property {{ additions: number, deletions: number, fileCount: number }} summary
 * @property {string|null} aiSummary - Copilot-generated summary of the overall change
 */

// File extension → semantic category mapping (order matters: test > docs > config)
const CATEGORY_MAP = {
    test: ['.test.', '.spec.', '__tests__', '__mocks__'],
    docs: ['.md', '.txt', '.rst', 'docs/', 'README'],
    config: [
        'package.json', 'tsconfig.json', '.eslintrc', '.prettierrc',
        '.yaml', '.yml', '.toml', '.env',
        '.config.js', '.config.ts', '.config.mjs',
        'webpack.config', 'vite.config', 'jest.config', 'vitest.config',
        '.babelrc', '.editorconfig', '.gitignore', '.npmrc',
        'Dockerfile', 'docker-compose', 'Makefile',
    ],
};

/**
 * Parses a unified diff string into structured file changes with categories.
 *
 * @param {string} rawDiff - Raw unified diff output from git
 * @returns {Promise<DiffAnalysis>}
 */
export async function processDiff(rawDiff) {
    if (!rawDiff || !rawDiff.trim()) {
        return { files: [], summary: { additions: 0, deletions: 0, fileCount: 0 }, aiSummary: null };
    }

    const parsed = parseDiff(rawDiff);

    const files = parsed.map((file) => {
        const filePath = file.to || file.from || 'unknown';
        const type = resolveChangeType(file);
        const category = categorizeFile(filePath);

        return {
            file: filePath,
            type,
            category,
            additions: file.additions || 0,
            deletions: file.deletions || 0,
            hunks: file.chunks.map((chunk) => ({
                oldStart: chunk.oldStart,
                newStart: chunk.newStart,
                content: chunk.changes.map((c) => c.content).join('\n'),
                changes: chunk.changes,
            })),
        };
    });

    const summary = {
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
        fileCount: files.length,
    };

    // Ask Copilot for an overall impact summary
    let aiSummary = null;
    if (files.length > 0) {
        const fileList = files
            .map((f) => `  - ${f.file} (${f.type}, +${f.additions}/-${f.deletions})`)
            .join('\n');

        aiSummary = await askCopilot(
            `Analyze this set of code changes and provide a brief impact summary (2-3 sentences):\n${fileList}`,
            { timeout: 15000 }
        );
    }

    return { files, summary, aiSummary };
}

// --- Internals ---

function resolveChangeType(file) {
    if (file.new) return 'added';
    if (file.deleted) return 'deleted';
    if (file.from !== file.to) return 'renamed';
    return 'modified';
}

function categorizeFile(filePath) {
    const lower = filePath.toLowerCase();
    const fileName = lower.split('/').pop();

    // Priority order: test > docs > config > feature
    for (const [category, patterns] of Object.entries(CATEGORY_MAP)) {
        if (patterns.some((p) => lower.includes(p) || fileName.includes(p))) return category;
    }

    // Source files are features by default
    if (lower.includes('src/') || lower.includes('lib/') || lower.includes('app/')) return 'feature';
    if (/\.(js|ts|jsx|tsx|mjs)$/.test(lower)) return 'feature';
    return 'feature';
}

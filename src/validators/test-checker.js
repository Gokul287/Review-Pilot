import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} TestSuggestion
 * @property {string} file        - Source file needing tests
 * @property {string} suggestion  - Suggested test description
 */

/**
 * @typedef {object} TestCoverage
 * @property {string[]}         untestedFiles  - Source files with no corresponding test
 * @property {string[]}         existingTests  - Found test files for changed sources
 * @property {TestSuggestion[]} suggestions    - AI-suggested test cases
 */

/**
 * Validates test coverage for changed files:
 *   1. Checks if each source file has a corresponding test file (naming convention)
 *   2. Uses Copilot to suggest test cases for untested code
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} files
 * @param {string} repoRoot
 * @returns {Promise<TestCoverage>}
 */
export async function validateTestCoverage(files, repoRoot) {
    const untestedFiles = [];
    const existingTests = [];
    const suggestions = [];

    // Only check source files, not tests or config
    const sourceFiles = files.filter(
        (f) => f.category === 'feature' && f.type !== 'deleted'
    );

    for (const file of sourceFiles) {
        const testFile = findTestFile(file.file, repoRoot);

        if (testFile) {
            existingTests.push(testFile);
        } else {
            untestedFiles.push(file.file);

            // Ask Copilot for test suggestions on new/changed code
            const addedCode = file.hunks
                .flatMap((h) => h.changes.filter((c) => c.type === 'add').map((c) => c.content))
                .join('\n');

            if (addedCode.length > 30) {
                const aiSuggestion = await askCopilot(
                    `Suggest 3-5 test cases for the following new code. ` +
                    `Be specific about edge cases and error scenarios:\n\n${addedCode.slice(0, 1500)}`,
                    { timeout: 15000 }
                );

                if (aiSuggestion) {
                    suggestions.push({ file: file.file, suggestion: aiSuggestion });
                }
            }
        }
    }

    return { untestedFiles, existingTests, suggestions };
}

// --- Internals ---

function findTestFile(filePath, repoRoot) {
    const base = basename(filePath).replace(/\.(js|ts|mjs|jsx|tsx)$/, '');
    const ext = filePath.match(/\.(js|ts|mjs|jsx|tsx)$/)?.[0] || '.js';
    const dir = dirname(filePath);

    const candidates = [
        join(repoRoot, dir, `${base}.test${ext}`),
        join(repoRoot, dir, `${base}.spec${ext}`),
        join(repoRoot, dir, '__tests__', `${base}.test${ext}`),
        join(repoRoot, dir, '__tests__', `${base}${ext}`),
        join(repoRoot, 'tests', dir, `${base}.test${ext}`),
        join(repoRoot, 'test', dir, `${base}.test${ext}`),
        join(repoRoot, 'tests', `${base}.test${ext}`),
        join(repoRoot, 'test', `${base}.test${ext}`),
    ];

    return candidates.find((c) => existsSync(c)) || null;
}

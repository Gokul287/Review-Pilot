import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} Context
 * @property {Map<string, string[]>} dependents   - Map of changed file → files that import it
 * @property {string[]}             relatedTests  - Test files related to changed files
 * @property {string|null}          aiContext      - Copilot-generated dependency analysis
 */

/**
 * Gathers context for a set of changed files:
 * - Finds files that import/require the changed files (dependents)
 * - Identifies related test files by naming convention
 * - Uses Copilot to analyze dependency impact
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} changedFiles
 * @param {string} repoRoot
 * @returns {Promise<Context>}
 */
export async function gatherContext(changedFiles, repoRoot) {
    const dependents = new Map();
    const relatedTests = [];

    for (const file of changedFiles) {
        if (file.type === 'deleted') continue;

        // 1. Find dependents via simple grep of import/require patterns
        const importers = findImporters(file.file, repoRoot);
        if (importers.length > 0) {
            dependents.set(file.file, importers);
        }

        // 2. Find related test files
        const tests = findRelatedTests(file.file, repoRoot);
        relatedTests.push(...tests);
    }

    // 3. Ask Copilot for deeper dependency analysis
    let aiContext = null;
    const sourceFiles = changedFiles.filter((f) => f.category === 'feature');
    if (sourceFiles.length > 0) {
        const fileList = sourceFiles.map((f) => f.file).join(', ');
        aiContext = await askCopilot(
            `Find all files that depend on or import these changed files and explain the impact: ${fileList}`,
            { timeout: 20000 }
        );
    }

    return {
        dependents,
        relatedTests: [...new Set(relatedTests)],
        aiContext,
    };
}

// --- Internals ---

/**
 * Searches for files that import/require the given file path.
 * Uses a simple line-by-line scan of .js/.ts files in common directories.
 */
function findImporters(targetFile, repoRoot) {
    const importers = [];
    const targetBase = basename(targetFile)
        .replace(/\.(js|ts|mjs|jsx|tsx)$/, '');

    const dirsToSearch = ['src', 'lib', 'app', 'components', 'pages'].map((d) =>
        join(repoRoot, d)
    );

    for (const dir of dirsToSearch) {
        if (!existsSync(dir)) continue;
        scanDirectory(dir, repoRoot, (filePath, content) => {
            if (
                content.includes(targetBase) &&
                (content.includes('import ') || content.includes('require('))
            ) {
                const relative = filePath.replace(repoRoot, '').replace(/\\/g, '/');
                const clean = relative.startsWith('/') ? relative.slice(1) : relative;
                if (clean !== targetFile && !importers.includes(clean)) {
                    importers.push(clean);
                }
            }
        });
    }

    return importers;
}

/**
 * Finds test files related to the given file by naming convention.
 */
function findRelatedTests(filePath, repoRoot) {
    const base = basename(filePath).replace(/\.(js|ts|mjs|jsx|tsx)$/, '');
    const dir = dirname(filePath);
    const tests = [];

    const candidates = [
        join(repoRoot, dir, `${base}.test.js`),
        join(repoRoot, dir, `${base}.spec.js`),
        join(repoRoot, dir, `${base}.test.ts`),
        join(repoRoot, dir, `${base}.spec.ts`),
        join(repoRoot, dir, '__tests__', `${base}.test.js`),
        join(repoRoot, dir, '__tests__', `${base}.test.ts`),
        join(repoRoot, 'tests', dir, `${base}.test.js`),
        join(repoRoot, 'test', dir, `${base}.test.js`),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            tests.push(candidate.replace(repoRoot, '').replace(/\\/g, '/').replace(/^\//, ''));
        }
    }

    return tests;
}

/**
 * Recursively scans a directory and calls callback(filePath, content) for each .js/.ts file.
 */
function scanDirectory(dir, repoRoot, callback, depth = 0) {
    if (depth > 5) return;

    try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            if (entry === 'node_modules' || entry.startsWith('.')) continue;

            const fullPath = join(dir, entry);

            let stat;
            try {
                stat = statSync(fullPath);
            } catch {
                continue;
            }

            if (stat.isDirectory()) {
                scanDirectory(fullPath, repoRoot, callback, depth + 1);
            } else if (/\.(js|ts|mjs|jsx|tsx)$/.test(entry) && stat.size < 512 * 1024) {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    callback(fullPath, content);
                } catch {
                    // Skip unreadable files
                }
            }
        }
    } catch {
        // Skip inaccessible directories
    }
}

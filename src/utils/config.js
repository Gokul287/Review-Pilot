import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getRepoRoot } from './git.js';

const DEFAULTS = {
    baseBranch: 'main',
    excludePatterns: ['*.lock', '*.min.js', '*.min.css', 'node_modules/**', 'dist/**'],
    copilotTimeout: 30000,
    outputDir: '.reviewpilot-output',
    maxFileSizeKB: 500,
    telemetry: true,
    performanceBudgets: {
        maxFileSize: 500 * 1024,        // 500KB
        maxFunctionLength: 50,           // lines
        maxCyclomaticComplexity: 10,     // McCabe
        maxImportDepth: 5,               // dependency depth
    },
    retryAttempts: 3,
    copilotConcurrency: 3,
    pluginDir: '.reviewpilot-rules',
};

/**
 * Load configuration from `.reviewpilotrc` in the repo root (if present),
 * merged with sensible defaults.
 *
 * @returns {Promise<object>} Merged config
 */
export async function loadConfig() {
    let repoRoot;
    try {
        repoRoot = await getRepoRoot();
    } catch {
        repoRoot = process.cwd();
    }

    const configPath = join(repoRoot, '.reviewpilotrc');

    if (!existsSync(configPath)) {
        return { ...DEFAULTS, repoRoot };
    }

    try {
        const raw = readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(raw);
        return { ...DEFAULTS, ...userConfig, repoRoot };
    } catch (err) {
        console.warn(`  ⚠ Failed to parse .reviewpilotrc: ${err.message}. Using defaults.`);
        return { ...DEFAULTS, repoRoot };
    }
}

/**
 * Check if a file should be excluded based on config patterns.
 * @param {string} filePath
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function shouldExclude(filePath, patterns) {
    return patterns.some((pattern) => {
        if (pattern.startsWith('*')) {
            return filePath.endsWith(pattern.slice(1));
        }
        if (pattern.endsWith('/**')) {
            return filePath.startsWith(pattern.slice(0, -3));
        }
        return filePath === pattern;
    });
}

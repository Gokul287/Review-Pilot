import { getFileContent } from '../utils/git.js';
import { askCopilot } from '../utils/copilot.js';

/**
 * @typedef {object} BreakingChange
 * @property {string} file
 * @property {string} functionName
 * @property {string} oldSignature
 * @property {string} newSignature
 * @property {'major'|'minor'|'patch'} severity
 * @property {string} description
 */

// Patterns that extract exported function/class signatures
const EXPORT_PATTERNS = [
    /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
    /export\s+(?:default\s+)?class\s+(\w+)/g,
    /export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)/g,
    /module\.exports\s*=\s*\{([^}]+)\}/g,
    /module\.exports\.(\w+)\s*=/g,
    /exports\.(\w+)\s*=\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)/g,
];

/**
 * Detects breaking changes by comparing exported function signatures
 * between the current branch and the base branch.
 *
 * @param {import('../analyzers/diff-processor.js').FileChange[]} files
 * @param {string} baseBranch
 * @returns {Promise<BreakingChange[]>}
 */
export async function detectBreakingChanges(files, baseBranch) {
    const breakingChanges = [];

    const sourceFiles = files.filter(
        (f) => f.category === 'feature' && f.type === 'modified'
    );

    for (const file of sourceFiles) {
        // Read old version from base branch
        const oldContent = await getFileContent(file.file, baseBranch);
        if (!oldContent) continue;

        // Read new version from current code in the hunk
        const newContent = file.hunks.map((h) => h.content).join('\n');
        // We also need the full new file — the hunk content is partial.
        // For a more accurate comparison, get current HEAD version
        const newFullContent = await getFileContent(file.file, 'HEAD');

        const oldExports = extractExports(oldContent);
        const newExports = extractExports(newFullContent || newContent);

        // Compare signatures
        for (const [name, oldSig] of Object.entries(oldExports)) {
            if (!(name in newExports)) {
                // Exported symbol was removed
                breakingChanges.push({
                    file: file.file,
                    functionName: name,
                    oldSignature: oldSig,
                    newSignature: '(removed)',
                    severity: 'major',
                    description: `Exported "${name}" was removed — this is a breaking change for all consumers`,
                });
            } else if (oldSig !== newExports[name]) {
                // Signature changed
                const severity = isBreakingSignatureChange(oldSig, newExports[name]) ? 'major' : 'minor';
                breakingChanges.push({
                    file: file.file,
                    functionName: name,
                    oldSignature: oldSig,
                    newSignature: newExports[name],
                    severity,
                    description: `Signature of "${name}" changed from (${oldSig}) to (${newExports[name]})`,
                });
            }
        }

        // Check for new exports (non-breaking but worth noting)
        for (const [name, newSig] of Object.entries(newExports)) {
            if (!(name in oldExports)) {
                breakingChanges.push({
                    file: file.file,
                    functionName: name,
                    oldSignature: '(new)',
                    newSignature: newSig,
                    severity: 'patch',
                    description: `New export "${name}" added`,
                });
            }
        }
    }

    // Ask Copilot for deeper analysis if there are changes
    if (breakingChanges.length > 0) {
        const summary = breakingChanges
            .filter((c) => c.severity !== 'patch')
            .map((c) => `${c.file}: ${c.functionName} — ${c.description}`)
            .join('\n');

        if (summary) {
            const aiAnalysis = await askCopilot(
                `These API changes were detected. Explain the impact on consumers and suggest migration steps:\n${summary}`,
                { timeout: 15000 }
            );

            if (aiAnalysis) {
                // Attach AI analysis to the first breaking change as extra context
                breakingChanges[0].description += `\n\nCopilot analysis: ${aiAnalysis}`;
            }
        }
    }

    return breakingChanges;
}

// --- Internals ---

function extractExports(content) {
    const exports = {};

    for (const pattern of EXPORT_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const name = match[1];
            const params = match[2] || '';
            if (name && name.length < 100) {
                exports[name.trim()] = params.trim();
            }
        }
    }

    return exports;
}

function isBreakingSignatureChange(oldSig, newSig) {
    const oldParams = oldSig.split(',').map((p) => p.trim()).filter(Boolean);
    const newParams = newSig.split(',').map((p) => p.trim()).filter(Boolean);

    // Removing a parameter or reordering is breaking
    if (newParams.length < oldParams.length) return true;

    // Changing parameter names/types of existing params is breaking
    for (let i = 0; i < oldParams.length; i++) {
        const oldName = oldParams[i].split('=')[0].split(':')[0].trim();
        const newName = newParams[i]?.split('=')[0].split(':')[0].trim();
        if (oldName !== newName) return true;
    }

    return false;
}

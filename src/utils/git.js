import simpleGit from 'simple-git';

/**
 * Creates a simple-git instance rooted at the given directory.
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {import('simple-git').SimpleGit}
 */
function createGit(cwd = process.cwd()) {
    return simpleGit({ baseDir: cwd });
}

/**
 * Returns the raw unified diff between the current branch and the base branch.
 * @param {string} baseBranch - Branch to diff against (e.g. 'main')
 * @returns {Promise<string>} Raw unified diff output
 */
export async function getDiff(baseBranch) {
    const git = createGit();
    const mergeBase = await git.raw(['merge-base', baseBranch, 'HEAD']);
    return git.diff([mergeBase.trim(), 'HEAD']);
}

/**
 * Returns the raw diff of uncommitted (staged + unstaged) changes.
 * @returns {Promise<string>}
 */
export async function getUncommittedDiff() {
    const git = createGit();
    return git.diff(['HEAD']);
}

/**
 * Returns categorized lists of changed files between current branch and base.
 * @param {string} baseBranch
 * @returns {Promise<{ added: string[], modified: string[], deleted: string[], renamed: string[] }>}
 */
export async function getChangedFiles(baseBranch) {
    const git = createGit();
    const mergeBase = await git.raw(['merge-base', baseBranch, 'HEAD']);
    const summary = await git.diffSummary([mergeBase.trim(), 'HEAD']);

    const result = { added: [], modified: [], deleted: [], renamed: [] };

    for (const f of summary.files) {
        if (f.binary) continue;
        if (f.file.includes('=>')) {
            result.renamed.push(f.file);
        } else if (summary.insertions && f.insertions > 0 && f.deletions === 0 && !f.changes) {
            result.added.push(f.file);
        } else if (f.deletions > 0 && f.insertions === 0) {
            result.deleted.push(f.file);
        } else {
            result.modified.push(f.file);
        }
    }

    return result;
}

/**
 * Returns the current branch name.
 * @returns {Promise<string>}
 */
export async function getCurrentBranch() {
    const git = createGit();
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
}

/**
 * Auto-detects the base branch ('main' or 'master').
 * @returns {Promise<string>}
 */
export async function getBaseBranch() {
    const git = createGit();
    const branches = await git.branchLocal();

    if (branches.all.includes('main')) return 'main';
    if (branches.all.includes('master')) return 'master';
    return branches.all[0] || 'main';
}

/**
 * Reads a file at a specific git ref.
 * @param {string} filePath - Relative path within repo
 * @param {string} ref - Git ref (branch, tag, commit)
 * @returns {Promise<string|null>} File content or null if not found
 */
export async function getFileContent(filePath, ref) {
    const git = createGit();
    try {
        return await git.show([`${ref}:${filePath}`]);
    } catch {
        return null;
    }
}

/**
 * Returns the repo root directory.
 * @returns {Promise<string>}
 */
export async function getRepoRoot() {
    const git = createGit();
    const root = await git.revparse(['--show-toplevel']);
    return root.trim();
}

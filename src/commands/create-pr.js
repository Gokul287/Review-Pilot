import { execFile } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../utils/config.js';
import { getCurrentBranch, getBaseBranch } from '../utils/git.js';
import * as log from '../utils/logger.js';

/**
 * Creates a GitHub PR using the generated description from a previous `reviewpilot check --save`.
 *
 * @param {object} options
 * @param {string} options.title - PR title (optional, auto-generated)
 * @param {string} options.base  - Target branch (optional, auto-detected)
 * @param {boolean} options.draft - Create as draft PR
 */
export async function createPRCommand(options) {
    try {
        const config = await loadConfig();
        const currentBranch = await getCurrentBranch();
        const baseBranch = options.base || config.baseBranch || (await getBaseBranch());
        const outputDir = join(config.repoRoot, config.outputDir);

        // Check if gh CLI is available
        log.startSpinner('Checking GitHub CLI...');
        const hasGH = await isGHAvailable();
        if (!hasGH) {
            log.failSpinner('GitHub CLI (gh) not found');
            log.error('The `gh` CLI is required to create PRs.');
            log.info('Install: https://cli.github.com/');
            log.info('Then authenticate: gh auth login');
            return;
        }
        log.succeedSpinner('GitHub CLI detected');

        // Check for saved description
        const descPath = join(outputDir, 'pr-description.md');
        let body = '';

        if (existsSync(descPath)) {
            body = readFileSync(descPath, 'utf-8');
            log.success('Loaded PR description from previous analysis');
        } else {
            log.warn('No saved PR description found. Run `reviewpilot check --save` first.');
            log.info('Creating PR with minimal description...');
            body = `## Pull Request: \`${currentBranch}\`\n\n*Created with ReviewPilot 🛩️*`;
        }

        // Append checklist if available
        const checklistPath = join(outputDir, 'checklist.md');
        if (existsSync(checklistPath)) {
            const checklist = readFileSync(checklistPath, 'utf-8');
            body += '\n\n' + checklist;
        }

        // Build PR title
        const title = options.title || `${currentBranch.replace(/[-_]/g, ' ')}`;

        // Create PR
        log.startSpinner('Creating pull request...');
        const args = [
            'pr', 'create',
            '--title', title,
            '--body', body,
            '--base', baseBranch,
        ];

        if (options.draft) {
            args.push('--draft');
        }

        const result = await runGH(args);
        log.succeedSpinner('Pull request created!');

        log.newline();
        log.success(`PR: ${result.trim()}`);
        log.newline();

    } catch (err) {
        log.failSpinner('PR creation failed');
        log.error(err.message);

        if (err.message.includes('already exists')) {
            log.info('A PR for this branch already exists. Use `gh pr view` to see it.');
        } else if (err.message.includes('authentication')) {
            log.info('Run `gh auth login` to authenticate with GitHub.');
        }

        process.exitCode = 1;
    }
}

// --- Internals ---

function isGHAvailable() {
    return new Promise((resolve) => {
        execFile('gh', ['--version'], { timeout: 5000 }, (err) => {
            resolve(!err);
        });
    });
}

function runGH(args) {
    return new Promise((resolve, reject) => {
        execFile('gh', args, { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) return reject(new Error(stderr || err.message));
            resolve(stdout);
        });
    });
}

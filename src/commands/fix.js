/**
 * `reviewpilot fix` — Auto-fix issues found during analysis.
 * Reads findings from `.reviewpilot-output/analysis.json` and applies fixes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { loadConfig } from '../utils/config.js';
import { getAvailableFixes, applyFix, generatePatch } from '../fixers/auto-fix.js';
import * as log from '../utils/logger.js';

/**
 * @param {object} options
 * @param {string} [options.issue] - Fix a specific issue by index
 * @param {boolean} [options.all] - Fix all auto-fixable issues
 * @param {boolean} [options.dryRun] - Preview without applying
 * @param {boolean} [options.interactive] - Prompt for each fix
 */
export async function fixCommand(options) {
    try {
        const config = await loadConfig();
        const outputDir = join(config.repoRoot, config.outputDir);
        const analysisPath = join(outputDir, 'analysis.json');

        // Check for previous analysis
        if (!existsSync(analysisPath)) {
            log.error('No analysis results found.');
            log.info('Run `reviewpilot check --save` first to generate analysis.');
            return;
        }

        log.info('Loading previous analysis results...');
        const analysis = JSON.parse(readFileSync(analysisPath, 'utf-8'));

        if (!analysis.findings || analysis.findings.length === 0) {
            log.success('No findings to fix — code looks clean! 🎉');
            return;
        }

        // Generate fixes
        const fixes = getAvailableFixes(analysis.findings, config.repoRoot);

        if (fixes.length === 0) {
            log.warn('No auto-fixable issues found.');
            log.info('Some findings may require manual intervention.');
            return;
        }

        log.info(`Found ${fixes.length} auto-fixable issue(s) out of ${analysis.findings.length} total finding(s).`);
        log.newline();

        // Fix specific issue
        if (options.issue !== undefined) {
            const id = parseInt(options.issue, 10);
            const fix = fixes.find((f) => f.id === id);

            if (!fix) {
                log.error(`No auto-fix available for issue #${id}.`);
                log.info(`Available fix IDs: ${fixes.map((f) => f.id).join(', ')}`);
                return;
            }

            await processOneFix(fix, options.dryRun, config.repoRoot);
            return;
        }

        // Fix all
        if (options.all) {
            let applied = 0;
            let skipped = 0;

            for (const fix of fixes) {
                if (options.dryRun) {
                    showFixPreview(fix);
                    skipped++;
                } else {
                    const result = applyFix(fix, config.repoRoot);
                    if (result.success) {
                        log.success(`Fixed: ${fix.description} (${fix.file}:${fix.line})`);
                        applied++;
                    } else {
                        log.warn(`Skipped: ${fix.description} — ${result.error}`);
                        skipped++;
                    }
                }
            }

            log.newline();
            if (options.dryRun) {
                log.info(`Dry run: ${fixes.length} fix(es) would be applied.`);
                log.info('Run without --dry-run to apply.');
            } else {
                log.success(`Applied ${applied} fix(es), skipped ${skipped}.`);
            }
            return;
        }

        // Interactive mode
        if (options.interactive) {
            await interactiveFix(fixes, config.repoRoot);
            return;
        }

        // Default: show available fixes
        log.heading('Available Auto-Fixes');
        for (const fix of fixes) {
            showFixPreview(fix);
        }

        log.newline();
        log.info('Run with --all to apply all fixes, or --issue <id> for a specific one.');
        log.info('Run with --dry-run to preview without applying.');
        log.info('Run with --interactive to choose fixes one by one.');

    } catch (err) {
        log.error(`Fix command failed: ${err.message}`);
        if (process.env.DEBUG) console.error(err);
        process.exitCode = 1;
    }
}

// ── Helpers ──────────────────────────────────────────────────

function showFixPreview(fix) {
    const patch = generatePatch(fix);
    log.bullet(`#${fix.id} [${fix.rule}] ${fix.file}:${fix.line}`);
    log.info(`  ${fix.description}`);
    log.info(`  Patch:`);
    for (const line of patch.split('\n')) {
        if (line.startsWith('-')) {
            console.log(`    \x1b[31m${line}\x1b[0m`);
        } else if (line.startsWith('+')) {
            console.log(`    \x1b[32m${line}\x1b[0m`);
        } else {
            console.log(`    ${line}`);
        }
    }
    log.newline();
}

async function processOneFix(fix, dryRun, repoRoot) {
    showFixPreview(fix);

    if (dryRun) {
        log.info('Dry run — no changes applied.');
        return;
    }

    const result = applyFix(fix, repoRoot);
    if (result.success) {
        log.success(`Fix applied: ${fix.description}`);
    } else {
        log.error(`Fix failed: ${result.error}`);
    }
}

async function interactiveFix(fixes, repoRoot) {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    let applied = 0;
    let skipped = 0;

    for (const fix of fixes) {
        showFixPreview(fix);

        const answer = await question('  Apply this fix? (y/n/q) ');
        const choice = answer.trim().toLowerCase();

        if (choice === 'q') {
            log.info('Quitting interactive mode.');
            break;
        }

        if (choice === 'y' || choice === 'yes') {
            const result = applyFix(fix, repoRoot);
            if (result.success) {
                log.success('Applied!');
                applied++;
            } else {
                log.warn(`Failed: ${result.error}`);
                skipped++;
            }
        } else {
            log.info('Skipped.');
            skipped++;
        }
        log.newline();
    }

    rl.close();
    log.newline();
    log.success(`Done: ${applied} applied, ${skipped} skipped.`);
}

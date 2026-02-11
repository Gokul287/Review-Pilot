import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../utils/config.js';
import { getDiff, getUncommittedDiff, getCurrentBranch, getBaseBranch } from '../utils/git.js';
import { isCopilotAvailable } from '../utils/copilot.js';
import { processDiff } from '../analyzers/diff-processor.js';
import { gatherContext } from '../context/context-collector.js';
import { analyze } from '../linters/smart-linter.js';
import { validateTestCoverage } from '../validators/test-checker.js';
import { detectBreakingChanges } from '../detectors/breaking-changes.js';
import { generatePRDescription } from '../generators/pr-description.js';
import { buildChecklist } from '../generators/checklist.js';
import * as log from '../utils/logger.js';

/**
 * Orchestrates the full analysis pipeline:
 *   1. Get diff → 2. Parse → 3. Context → 4. Lint → 5. Tests → 6. Breaking → 7. PR desc → 8. Checklist
 *
 * @param {object} options - CLI options
 */
export async function checkCommand(options) {
    try {
        const config = await loadConfig();
        const baseBranch = options.base || config.baseBranch || (await getBaseBranch());
        const currentBranch = await getCurrentBranch();

        log.info(`Branch: ${currentBranch} → ${baseBranch}`);
        log.newline();

        // Check Copilot availability
        if (options.copilot !== false) {
            const hasCopilot = await isCopilotAvailable();
            if (hasCopilot) {
                log.success('Copilot CLI detected — AI-enhanced analysis enabled');
            } else {
                log.warn('Copilot CLI not available — running heuristic-only mode');
            }
        } else {
            log.info('Copilot CLI skipped (--no-copilot flag)');
        }

        log.newline();

        // ── Step 1: Get diff ───────────────────────────────────
        log.startSpinner('Analyzing git diff...');
        let rawDiff;
        try {
            rawDiff = await getDiff(baseBranch);
        } catch {
            // Maybe no commits differ from base — try uncommitted changes
            rawDiff = await getUncommittedDiff();
        }

        if (!rawDiff || !rawDiff.trim()) {
            log.failSpinner('No changes detected');
            log.warn(`No diff found between ${currentBranch} and ${baseBranch}.`);
            log.info('Make sure you have uncommitted changes or commits ahead of the base branch.');
            return;
        }
        log.succeedSpinner('Git diff captured');

        // ── Step 2: Parse diff ─────────────────────────────────
        log.startSpinner('Processing diff...');
        const diffAnalysis = await processDiff(rawDiff);
        log.succeedSpinner(`Parsed ${diffAnalysis.summary.fileCount} files (+${diffAnalysis.summary.additions}/-${diffAnalysis.summary.deletions})`);

        // Display change summary
        log.heading('Changes Detected');
        for (const file of diffAnalysis.files) {
            const badge = file.type === 'added' ? '🆕' : file.type === 'deleted' ? '🗑️ ' : '✏️ ';
            log.bullet(`${badge} ${file.file}  [${file.category}]  +${file.additions}/-${file.deletions}`);
        }

        if (diffAnalysis.aiSummary) {
            log.newline();
            log.info(`AI Summary: ${diffAnalysis.aiSummary}`);
        }

        // ── Step 3: Gather context ─────────────────────────────
        log.startSpinner('Gathering context...');
        const context = await gatherContext(diffAnalysis.files, config.repoRoot);
        log.succeedSpinner(`Context gathered (${context.dependents.size} dependency chains, ${context.relatedTests.length} related tests)`);

        if (context.dependents.size > 0) {
            log.heading('Dependency Impact');
            for (const [file, importers] of context.dependents) {
                log.bullet(`${file} is imported by:`);
                for (const imp of importers) {
                    log.bullet(imp, 6);
                }
            }
        }

        // ── Step 4: Smart lint ─────────────────────────────────
        log.startSpinner('Running smart analysis...');
        const findings = await analyze(diffAnalysis.files);
        log.succeedSpinner(`Analysis complete — ${findings.length} finding(s)`);

        if (findings.length > 0) {
            log.heading('Findings');
            for (const f of findings) {
                log.finding(f.severity, f.file, f.line, f.message, f.source);
            }
        }

        // ── Step 5: Test coverage ──────────────────────────────
        log.startSpinner('Checking test coverage...');
        const testCoverage = await validateTestCoverage(diffAnalysis.files, config.repoRoot);
        log.succeedSpinner(
            testCoverage.untestedFiles.length === 0
                ? 'All changed files have tests ✅'
                : `${testCoverage.untestedFiles.length} file(s) missing tests`
        );

        if (testCoverage.untestedFiles.length > 0) {
            log.heading('Missing Test Coverage');
            for (const f of testCoverage.untestedFiles) {
                log.warn(`No test file found for: ${f}`);
            }
        }

        if (testCoverage.suggestions.length > 0) {
            log.heading('Suggested Tests');
            for (const s of testCoverage.suggestions) {
                log.bullet(`${s.file}:`);
                log.info(s.suggestion);
            }
        }

        // ── Step 6: Breaking changes ───────────────────────────
        log.startSpinner('Detecting breaking changes...');
        const breakingChanges = await detectBreakingChanges(diffAnalysis.files, baseBranch);
        const majorBreaking = breakingChanges.filter((c) => c.severity === 'major');
        log.succeedSpinner(
            majorBreaking.length === 0
                ? 'No breaking changes detected ✅'
                : `${majorBreaking.length} breaking change(s) found!`
        );

        if (majorBreaking.length > 0) {
            log.heading('⚠️  Breaking Changes');
            for (const bc of majorBreaking) {
                log.error(`${bc.file}: ${bc.functionName}`);
                log.info(`  Old: (${bc.oldSignature})`);
                log.info(`  New: (${bc.newSignature})`);
                log.bullet(bc.description, 4);
            }
        }

        // ── Step 7 & 8: Generate PR assets ─────────────────────
        log.startSpinner('Generating PR description...');
        const prDescription = await generatePRDescription({
            diffAnalysis,
            findings,
            testCoverage,
            breakingChanges,
            branchName: currentBranch,
        });
        log.succeedSpinner('PR description generated');

        log.startSpinner('Building review checklist...');
        const checklist = await buildChecklist({
            diffAnalysis,
            breakingChanges,
            findings,
        });
        log.succeedSpinner('Review checklist built');

        // ── Save results ───────────────────────────────────────
        if (options.save) {
            const outputDir = join(config.repoRoot, config.outputDir);
            mkdirSync(outputDir, { recursive: true });

            writeFileSync(join(outputDir, 'pr-description.md'), prDescription, 'utf-8');
            writeFileSync(join(outputDir, 'checklist.md'), checklist, 'utf-8');
            writeFileSync(
                join(outputDir, 'analysis.json'),
                JSON.stringify({ diffAnalysis, findings, testCoverage, breakingChanges }, null, 2),
                'utf-8'
            );

            log.newline();
            log.success(`Results saved to ${config.outputDir}/`);
        }

        // ── Summary ────────────────────────────────────────────
        log.divider();
        log.heading('ReviewPilot Summary');

        const criticalCount = findings.filter((f) => f.severity === 'critical' || f.severity === 'error').length;
        const warningCount = findings.filter((f) => f.severity === 'warning').length;

        log.bullet(`Files changed: ${diffAnalysis.summary.fileCount}`);
        log.bullet(`Issues: ${criticalCount} critical/error, ${warningCount} warnings`);
        log.bullet(`Test coverage gaps: ${testCoverage.untestedFiles.length}`);
        log.bullet(`Breaking changes: ${majorBreaking.length}`);
        log.newline();

        if (criticalCount > 0 || majorBreaking.length > 0) {
            log.error('⛔ Issues found — address critical items before requesting review.');
        } else if (warningCount > 0 || testCoverage.untestedFiles.length > 0) {
            log.warn('⚡ Some warnings — review recommended before merging.');
        } else {
            log.success('🎉 Looking good! Ready for review.');
        }

        log.newline();
        if (!options.save) {
            log.info('Tip: Run with --save to persist PR description and checklist to disk.');
        } else {
            log.info('Run `reviewpilot create-pr` to open a PR with the generated description.');
        }
        log.newline();

    } catch (err) {
        log.failSpinner('Analysis failed');
        log.error(err.message);
        if (process.env.DEBUG) {
            console.error(err);
        }
        process.exitCode = 1;
    }
}

/**
 * `reviewpilot check` — Main analysis pipeline command.
 *
 * Orchestrates an 8-step review pipeline with:
 *   - Per-step error recovery (partial results)
 *   - Performance metrics tracking
 *   - Step progress indicators
 *   - Telemetry (anonymous, opt-in)
 *   - Auto-save for `reviewpilot fix`
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../utils/config.js';
import { getDiff } from '../utils/git.js';
import { isCopilotAvailable, getCopilotStats } from '../utils/copilot.js';
import { processDiff } from '../analyzers/diff-processor.js';
import { gatherContext } from '../context/context-collector.js';
import { analyze } from '../linters/smart-linter.js';
import { checkTestCoverage } from '../validators/test-checker.js';
import { checkPerformanceBudget } from '../validators/performance-budget.js';
import { detectBreakingChanges } from '../detectors/breaking-changes.js';
import { generatePRDescription } from '../generators/pr-description.js';
import { buildChecklist } from '../generators/checklist.js';
import { PerformanceTracker } from '../utils/metrics.js';
import { trackUsage } from '../utils/telemetry.js';
import * as log from '../utils/logger.js';

const TOTAL_STEPS = 9; // Updated: added performance budget step

/**
 * @param {object} options
 * @param {string} [options.base] - Base branch override
 * @param {boolean} [options.save] - Save results for `reviewpilot fix`
 * @param {boolean} [options.noCopilot] - Skip Copilot integration
 * @param {boolean} [options.verbose] - Show performance metrics
 * @param {boolean} [options.noTelemetry] - Disable telemetry for this run
 */
export async function checkCommand(options) {
    const tracker = new PerformanceTracker();

    // Results collector — collects partial results even on step failures
    const results = {
        diffAnalysis: null,
        context: null,
        findings: [],
        testCoverage: null,
        budgetViolations: [],
        breakingChanges: [],
        prDescription: null,
        checklist: null,
        errors: [],
    };

    try {
        // ── Setup ────────────────────────────────────────────
        const config = await loadConfig();
        const baseBranch = options.base || config.baseBranch;

        log.heading('ReviewPilot Analysis');
        log.info(`Base branch: ${baseBranch}`);

        // Check Copilot
        let copilotReady = false;
        if (!options.noCopilot) {
            copilotReady = await isCopilotAvailable();
            if (copilotReady) {
                log.success('Copilot CLI detected — AI analysis enabled');
            } else {
                log.warn('Copilot CLI not found — running with heuristics only');
            }
        } else {
            log.info('Copilot disabled via --no-copilot flag');
        }

        // ──────────────────────────────────────────────────────
        // STEP 1: Get diff
        // ──────────────────────────────────────────────────────
        log.stepProgress(1, TOTAL_STEPS, 'Getting diff');
        tracker.startStep('Get Diff');

        const rawDiff = await getDiff(baseBranch);
        tracker.endStep();

        if (!rawDiff || rawDiff.trim() === '') {
            log.succeedSpinner('No changes detected');
            log.info(`No diff found between current branch and ${baseBranch}.`);
            return;
        }

        log.succeedSpinner('Diff retrieved');

        // ──────────────────────────────────────────────────────
        // STEP 2: Process diff
        // ──────────────────────────────────────────────────────
        log.stepProgress(2, TOTAL_STEPS, 'Processing diff');
        tracker.startStep('Process Diff');
        try {
            results.diffAnalysis = await processDiff(rawDiff, config);
            log.succeedSpinner(`Processed ${results.diffAnalysis.files.length} file(s)`);
        } catch (err) {
            results.errors.push({ step: 'Process Diff', error: err.message });
            log.failSpinner('Diff processing failed');
            log.partialResult('Process Diff', err.message);
        }
        tracker.endStep();

        // Exit early if diff processing failed entirely
        if (!results.diffAnalysis || results.diffAnalysis.files.length === 0) {
            log.warn('No files to analyze.');
            return;
        }

        const { files, summary, aiSummary } = results.diffAnalysis;

        // Show file summary
        log.info(`Files: ${summary.total} changed (${summary.additions} additions, ${summary.deletions} deletions)`);
        log.newline();

        // ──────────────────────────────────────────────────────
        // STEP 3: Gather context
        // ──────────────────────────────────────────────────────
        log.stepProgress(3, TOTAL_STEPS, 'Gathering context');
        tracker.startStep('Gather Context');
        try {
            results.context = await gatherContext(files);
            log.succeedSpinner('Context gathered');
        } catch (err) {
            results.errors.push({ step: 'Gather Context', error: err.message });
            log.failSpinner('Context gathering failed');
            log.partialResult('Gather Context', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 4: Smart linting (multi-dimensional analysis)
        // ──────────────────────────────────────────────────────
        log.stepProgress(4, TOTAL_STEPS, 'Smart Linting');
        tracker.startStep('Smart Linting');
        try {
            results.findings = await analyze(files, {
                repoRoot: config.repoRoot,
                useML: true,
            });
            log.succeedSpinner(`${results.findings.length} finding(s)`);
        } catch (err) {
            results.errors.push({ step: 'Smart Linting', error: err.message });
            log.failSpinner('Smart linting failed');
            log.partialResult('Smart Linting', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 5: Test coverage validation
        // ──────────────────────────────────────────────────────
        log.stepProgress(5, TOTAL_STEPS, 'Checking test coverage');
        tracker.startStep('Test Coverage');
        try {
            results.testCoverage = await checkTestCoverage(files);
            log.succeedSpinner('Test coverage checked');
        } catch (err) {
            results.errors.push({ step: 'Test Coverage', error: err.message });
            log.failSpinner('Test coverage check failed');
            log.partialResult('Test Coverage', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 6: Performance budget validation
        // ──────────────────────────────────────────────────────
        log.stepProgress(6, TOTAL_STEPS, 'Checking performance budgets');
        tracker.startStep('Performance Budgets');
        try {
            results.budgetViolations = await checkPerformanceBudget(
                files, config.repoRoot, config.performanceBudgets
            );
            log.succeedSpinner(`${results.budgetViolations.length} budget violation(s)`);
        } catch (err) {
            results.errors.push({ step: 'Performance Budgets', error: err.message });
            log.failSpinner('Performance budget check failed');
            log.partialResult('Performance Budgets', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 7: Breaking changes detection
        // ──────────────────────────────────────────────────────
        log.stepProgress(7, TOTAL_STEPS, 'Detecting breaking changes');
        tracker.startStep('Breaking Changes');
        try {
            results.breakingChanges = await detectBreakingChanges(files, baseBranch);
            log.succeedSpinner(`${results.breakingChanges.length} breaking change(s)`);
        } catch (err) {
            results.errors.push({ step: 'Breaking Changes', error: err.message });
            log.failSpinner('Breaking change detection failed');
            log.partialResult('Breaking Changes', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 8: Generate PR description
        // ──────────────────────────────────────────────────────
        log.stepProgress(8, TOTAL_STEPS, 'Generating PR description');
        tracker.startStep('PR Description');
        try {
            results.prDescription = await generatePRDescription({
                files,
                summary,
                aiSummary,
                findings: results.findings,
                testCoverage: results.testCoverage,
                breakingChanges: results.breakingChanges,
            });
            log.succeedSpinner('PR description generated');
        } catch (err) {
            results.errors.push({ step: 'PR Description', error: err.message });
            log.failSpinner('PR description generation failed');
            log.partialResult('PR Description', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // STEP 9: Build review checklist
        // ──────────────────────────────────────────────────────
        log.stepProgress(9, TOTAL_STEPS, 'Building review checklist');
        tracker.startStep('Review Checklist');
        try {
            results.checklist = await buildChecklist({
                files,
                findings: results.findings,
                breakingChanges: results.breakingChanges,
            });
            log.succeedSpinner('Review checklist built');
        } catch (err) {
            results.errors.push({ step: 'Review Checklist', error: err.message });
            log.failSpinner('Checklist generation failed');
            log.partialResult('Review Checklist', err.message);
        }
        tracker.endStep();

        // ──────────────────────────────────────────────────────
        // Output Results
        // ──────────────────────────────────────────────────────
        log.newline();
        log.divider();

        // Findings
        if (results.findings.length > 0) {
            log.heading('Findings');
            for (const f of results.findings) {
                log.finding(f);
            }
        } else {
            log.success('No issues found — looking clean! 🎉');
        }

        // Budget violations
        if (results.budgetViolations.length > 0) {
            log.newline();
            log.heading('Performance Budget Violations');
            for (const v of results.budgetViolations) {
                log.warning(`${v.file}: ${v.message}`);
            }
        }

        // Breaking changes
        if (results.breakingChanges.length > 0) {
            log.newline();
            log.heading('Breaking Changes');
            for (const bc of results.breakingChanges) {
                log.warning(`${bc.file}: ${bc.type} — ${bc.change}`);
            }
        }

        // PR description
        if (results.prDescription) {
            log.newline();
            log.heading('Generated PR Description');
            console.log(results.prDescription);
        }

        // Checklist
        if (results.checklist) {
            log.newline();
            log.heading('Review Checklist');
            console.log(results.checklist);
        }

        // Errors summary
        if (results.errors.length > 0) {
            log.newline();
            log.heading('Step Failures');
            for (const e of results.errors) {
                log.warning(`${e.step}: ${e.error}`);
            }
        }

        // Performance metrics
        if (options.verbose !== false) {
            log.newline();
            log.perfSummary(tracker.formatSummary());
        }

        // Copilot stats
        const copilotStats = getCopilotStats();
        if (copilotStats.calls > 0) {
            log.newline();
            log.info(`Copilot: ${copilotStats.calls} calls, ${copilotStats.cacheHits} cache hits, ${copilotStats.retries} retries, ${copilotStats.failures} failures`);
        }

        // ── Save results for `reviewpilot fix` ──────────────
        if (options.save) {
            const outputDir = join(config.repoRoot, config.outputDir);
            mkdirSync(outputDir, { recursive: true });

            const analysisData = {
                timestamp: new Date().toISOString(),
                findings: results.findings,
                budgetViolations: results.budgetViolations,
                breakingChanges: results.breakingChanges,
                errors: results.errors,
                metrics: tracker.getSummary(),
            };

            writeFileSync(join(outputDir, 'analysis.json'), JSON.stringify(analysisData, null, 2));

            if (results.prDescription) {
                writeFileSync(join(outputDir, 'pr-description.md'), results.prDescription);
            }

            if (results.checklist) {
                writeFileSync(join(outputDir, 'checklist.md'), results.checklist);
            }

            log.newline();
            log.success(`Results saved to ${config.outputDir}/`);
        }

        // ── Telemetry ────────────────────────────────────────
        if (!options.noTelemetry) {
            const perfSummary = tracker.getSummary();
            await trackUsage('check_completed', {
                fileCount: files.length,
                findingCount: results.findings.length,
                copilotAvailable: copilotReady,
                duration: perfSummary.totalTime,
                stepsCompleted: TOTAL_STEPS - results.errors.length,
                stepsFailed: results.errors.length,
            }, config);
        }

        // Exit code
        const hasCritical = results.findings.some((f) => f.severity === 'critical' || f.severity === 'error');
        if (hasCritical) {
            process.exitCode = 1;
        }

    } catch (err) {
        log.failSpinner('Analysis failed');
        log.error(err.message);
        if (process.env.DEBUG) console.error(err);
        process.exitCode = 1;
    }
}

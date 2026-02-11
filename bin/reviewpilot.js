#!/usr/bin/env node

import { Command } from 'commander';
import { banner } from '../src/utils/logger.js';
import { checkCommand } from '../src/commands/check.js';
import { createPRCommand } from '../src/commands/create-pr.js';
import { fixCommand } from '../src/commands/fix.js';

const program = new Command();

program
    .name('reviewpilot')
    .description('🛩️  AI-native code review companion — catches issues before human reviewers')
    .version('1.0.0');

program
    .command('check')
    .description('Analyze current changes for issues, test coverage, and breaking changes')
    .option('-b, --base <branch>', 'Base branch to diff against', '')
    .option('--no-copilot', 'Skip Copilot CLI analysis (heuristics only)')
    .option('--save', 'Save results to .reviewpilot-output/ directory')
    .option('--verbose', 'Show performance metrics and detailed output')
    .option('--no-telemetry', 'Disable anonymous telemetry for this run')
    .action(async (options) => {
        banner();
        await checkCommand(options);
    });

program
    .command('fix')
    .description('Auto-fix issues found by reviewpilot check')
    .option('--issue <id>', 'Fix a specific issue by ID')
    .option('--all', 'Fix all auto-fixable issues')
    .option('--dry-run', 'Preview fixes without applying')
    .option('-i, --interactive', 'Prompt for each fix')
    .action(async (options) => {
        banner();
        await fixCommand(options);
    });

program
    .command('create-pr')
    .description('Create a GitHub PR using generated description and checklist')
    .option('-t, --title <title>', 'PR title (auto-generated if omitted)')
    .option('-b, --base <branch>', 'Target branch for the PR', '')
    .option('--draft', 'Create as draft PR')
    .action(async (options) => {
        banner();
        await createPRCommand(options);
    });

program.parse();


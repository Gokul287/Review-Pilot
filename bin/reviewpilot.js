#!/usr/bin/env node

import { Command } from 'commander';
import { banner } from '../src/utils/logger.js';
import { checkCommand } from '../src/commands/check.js';
import { createPRCommand } from '../src/commands/create-pr.js';

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
    .action(async (options) => {
        banner();
        await checkCommand(options);
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

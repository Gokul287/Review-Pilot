/**
 * Machine learning-based false positive filter for code review findings.
 * Uses a Naive Bayes classifier to learn from user feedback and reduce noise.
 */

import Bayes from 'bayes';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CLASSIFIER_DIR = join(homedir(), '.reviewpilot');
const CLASSIFIER_PATH = join(CLASSIFIER_DIR, 'classifier.json');

/**
 * Filters false positives from findings using a Naive Bayes classifier.
 *
 * Pre-trained on common patterns that are typically false positives:
 * - console.log in debug/conditional blocks
 * - Test fixture passwords
 * - Configuration constants
 *
 * Users can train the classifier via interactive mode to improve over time.
 */
export class FalsePositiveFilter {
    constructor() {
        this.classifier = Bayes();
        this.loaded = false;
    }

    /**
     * Loads pre-trained data and any persisted user training.
     */
    async initialize() {
        // Load persisted classifier if it exists
        await this.load();

        if (!this.loaded) {
            // Pre-train with common patterns
            await this.preTrainDefaults();
        }
    }

    /**
     * Pre-trains the classifier with known true/false positive patterns.
     */
    async preTrainDefaults() {
        // True positives (real issues → should report)
        const realIssues = [
            'console.log(secretKey)',
            'console.log(password)',
            'console.log(apiToken)',
            'const password = "admin123"',
            'const apiKey = "sk-live-abc123def456"',
            'eval(userInput)',
            'eval(requestBody)',
            'innerHTML = userData',
            'debugger; // left in production',
        ];

        // False positives (not real issues → should NOT report)
        const falsePositives = [
            'console.log("Server started on port", port)',
            'console.log("Starting migration...")',
            'console.log(JSON.stringify(config, null, 2))',
            'console.log("Test passed")',
            'const password = "test_password" // test fixture',
            'const mockApiKey = "test-key-for-unit-tests"',
            'password: process.env.DB_PASSWORD',
            'apiKey: config.get("apiKey")',
            'if (DEBUG) console.log(data)',
            '// TODO: refactor this module',
            '// FIXME: known issue #123',
        ];

        for (const text of realIssues) {
            await this.classifier.learn(text, 'report');
        }

        for (const text of falsePositives) {
            await this.classifier.learn(text, 'skip');
        }
    }

    /**
     * Determines whether a finding should be reported.
     *
     * @param {object} finding - Finding object
     * @param {string} finding.message - Finding message
     * @param {string} [finding.context] - Code context
     * @returns {Promise<{ shouldReport: boolean, confidence: number }>}
     */
    async shouldReport(finding) {
        const text = this.buildFeatureText(finding);

        try {
            const category = await this.classifier.categorize(text);
            return {
                shouldReport: category === 'report',
                confidence: 0.7, // Naive Bayes doesn't give great confidence scores
            };
        } catch {
            // Default: report the finding
            return { shouldReport: true, confidence: 0.5 };
        }
    }

    /**
     * Learns from user feedback to improve filtering.
     *
     * @param {object} finding - The finding
     * @param {boolean} isRealIssue - true if user confirms it's a real issue
     */
    async learn(finding, isRealIssue) {
        const text = this.buildFeatureText(finding);
        await this.classifier.learn(text, isRealIssue ? 'report' : 'skip');
        await this.save();
    }

    /**
     * Persists classifier state to disk.
     */
    async save() {
        try {
            mkdirSync(CLASSIFIER_DIR, { recursive: true });
            const state = this.classifier.toJson();
            writeFileSync(CLASSIFIER_PATH, state, 'utf-8');
        } catch {
            // Non-critical — silently ignore
        }
    }

    /**
     * Loads persisted classifier state from disk.
     */
    async load() {
        try {
            if (existsSync(CLASSIFIER_PATH)) {
                const state = readFileSync(CLASSIFIER_PATH, 'utf-8');
                this.classifier = Bayes.fromJson(state);
                this.loaded = true;
            }
        } catch {
            // Corrupted state — start fresh
            this.classifier = Bayes();
            this.loaded = false;
        }
    }

    /**
     * Builds a feature text string from a finding for classification.
     * @param {object} finding
     * @returns {string}
     */
    buildFeatureText(finding) {
        const parts = [];
        if (finding.message) parts.push(finding.message);
        if (finding.context) parts.push(finding.context);
        if (finding.file) parts.push(finding.file);
        return parts.join(' ');
    }
}

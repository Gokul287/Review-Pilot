import { describe, it, expect } from 'vitest';
import { processDiff } from '../../src/analyzers/diff-processor.js';

// Sample unified diff for a new file
const NEW_FILE_DIFF = `diff --git a/src/auth/login.js b/src/auth/login.js
new file mode 100644
index 0000000..abcdef1
--- /dev/null
+++ b/src/auth/login.js
@@ -0,0 +1,10 @@
+export function authenticate(user, password) {
+  if (!user || !password) {
+    throw new Error('Missing credentials');
+  }
+  return { token: 'abc123', user };
+}
+
+export function logout(session) {
+  session.destroy();
+}
`;

// Sample diff for a modified README
const README_DIFF = `diff --git a/README.md b/README.md
index 1234567..abcdef2
--- a/README.md
+++ b/README.md
@@ -1,2 +1,4 @@
 # My Project
-Old line removed
+
+## Getting Started
+Run npm install to get started.
`;

// Combined diff (both files)
const COMBINED_DIFF = NEW_FILE_DIFF + README_DIFF;

const EMPTY_DIFF = '';
const WHITESPACE_DIFF = '   \n\n  ';

describe('diff-processor', () => {
    describe('processDiff', () => {
        it('should parse a valid unified diff into structured files', async () => {
            const result = await processDiff(COMBINED_DIFF);

            expect(result.files).toHaveLength(2);
            expect(result.summary.fileCount).toBe(2);
        });

        it('should categorize source files as "feature"', async () => {
            const result = await processDiff(NEW_FILE_DIFF);

            const loginFile = result.files.find((f) => f.file.includes('login.js'));
            expect(loginFile).toBeDefined();
            expect(loginFile.category).toBe('feature');
        });

        it('should categorize markdown files as "docs"', async () => {
            const result = await processDiff(README_DIFF);

            const readme = result.files[0];
            expect(readme).toBeDefined();
            expect(readme.file).toContain('README.md');
            expect(readme.category).toBe('docs');
        });

        it('should detect new files as "added"', async () => {
            const result = await processDiff(NEW_FILE_DIFF);

            const loginFile = result.files.find((f) => f.file.includes('login.js'));
            expect(loginFile.type).toBe('added');
        });

        it('should count additions and deletions correctly', async () => {
            const result = await processDiff(README_DIFF);

            expect(result.summary.additions).toBeGreaterThan(0);
            expect(result.summary.deletions).toBeGreaterThanOrEqual(1);
        });

        it('should extract hunk data with line numbers', async () => {
            const result = await processDiff(NEW_FILE_DIFF);

            const loginFile = result.files.find((f) => f.file.includes('login.js'));
            expect(loginFile.hunks).toHaveLength(1);
            expect(loginFile.hunks[0].newStart).toBe(1);
            expect(loginFile.hunks[0].content).toContain('authenticate');
        });

        it('should return empty result for blank diff', async () => {
            const result = await processDiff(EMPTY_DIFF);

            expect(result.files).toHaveLength(0);
            expect(result.summary.fileCount).toBe(0);
            expect(result.summary.additions).toBe(0);
        });

        it('should return empty result for whitespace-only diff', async () => {
            const result = await processDiff(WHITESPACE_DIFF);

            expect(result.files).toHaveLength(0);
        });

        it('should handle null input', async () => {
            const result = await processDiff(null);

            expect(result.files).toHaveLength(0);
        });

        it('should set aiSummary to null when Copilot unavailable', async () => {
            const result = await processDiff(NEW_FILE_DIFF);

            // In test env, Copilot is not available — should be null
            expect(result.aiSummary).toBeNull();
        });
    });

    describe('file categorization', () => {
        it('should categorize test files correctly', async () => {
            const testDiff = `diff --git a/src/auth/login.test.js b/src/auth/login.test.js
new file mode 100644
--- /dev/null
+++ b/src/auth/login.test.js
@@ -0,0 +1,3 @@
+test('login works', () => {
+  expect(true).toBe(true);
+});
`;
            const result = await processDiff(testDiff);
            expect(result.files[0].category).toBe('test');
        });

        it('should categorize config files correctly', async () => {
            const configDiff = `diff --git a/package.json b/package.json
index 1234..5678
--- a/package.json
+++ b/package.json
@@ -1,3 +1,4 @@
 {
   "name": "test",
+  "version": "2.0.0",
   "license": "MIT"
 }
`;
            const result = await processDiff(configDiff);
            expect(result.files[0].category).toBe('config');
        });

        it('should NOT categorize src/*.js files as config', async () => {
            const srcDiff = `diff --git a/src/service.js b/src/service.js
new file mode 100644
--- /dev/null
+++ b/src/service.js
@@ -0,0 +1,3 @@
+export function run() {
+  return true;
+}
`;
            const result = await processDiff(srcDiff);
            expect(result.files[0].category).toBe('feature');
        });
    });
});

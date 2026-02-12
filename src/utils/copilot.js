import { execFile } from 'node:child_process';
import pLimit from 'p-limit';
import { warn, info } from './logger.js';

let copilotAvailable = null; // null = unknown, true/false = tested

// ── Session cache ────────────────────────────────────────────
const sessionCache = new Map();

// ── Circuit breaker state ────────────────────────────────────
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;
let circuitOpen = false;

// ── Stats ────────────────────────────────────────────────────
const stats = { calls: 0, cacheHits: 0, failures: 0, retries: 0 };

/**
 * Returns Copilot usage statistics for the current session.
 * @returns {{ calls: number, cacheHits: number, failures: number, retries: number }}
 */
export function getCopilotStats() {
  return { ...stats };
}

/**
 * Clears the session prompt cache.
 */
export function clearCopilotCache() {
  sessionCache.clear();
}

/**
 * Asks GitHub Copilot CLI a question with retry logic, caching, and circuit breaker.
 *
 * @param {string} prompt - Natural language prompt for Copilot
 * @param {object} options
 * @param {number} options.timeout - Max wait time in ms (default 30s)
 * @param {number} options.retries - Number of retry attempts (default 3)
 * @returns {Promise<string|null>} Copilot's response or null if unavailable
 */
export async function askCopilot(prompt, { timeout = 60000, retries = 3 } = {}) {
  if (copilotAvailable === false) return null;
  if (circuitOpen) return null;

  // Check session cache
  const cacheKey = prompt.trim().slice(0, 200);
  if (sessionCache.has(cacheKey)) {
    stats.cacheHits++;
    return sessionCache.get(cacheKey);
  }

  stats.calls++;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await runCopilot(prompt, timeout);
      copilotAvailable = true;
      consecutiveFailures = 0;

      const trimmed = result.trim();
      sessionCache.set(cacheKey, trimmed);
      return trimmed;
    } catch (err) {
      if (isNotFoundError(err)) {
        if (copilotAvailable === null) {
          warn('Copilot CLI not found — running with heuristics only');
          warn('Install: gh extension install github/gh-copilot');
        }
        copilotAvailable = false;
        return null;
      }

      if (err.killed) {
        // Timeout — retry with backoff
        if (attempt < retries) {
          stats.retries++;
          const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await sleep(backoff);
          continue;
        }
        warn(`Copilot timed out after ${retries + 1} attempts — skipping AI analysis for this step.`);
        recordFailure();
        return null;
      }

      // Generic error
      if (attempt < retries) {
        stats.retries++;
        const backoff = Math.pow(2, attempt) * 1000;
        await sleep(backoff);
        continue;
      }

      warn(`Copilot error after ${retries + 1} attempts: ${err.message}`);
      recordFailure();
      return null;
    }
  }

  return null;
}

/**
 * Batch-executes multiple Copilot prompts in parallel with concurrency control.
 *
 * @param {Array<{ prompt: string, key?: string }>} requests - Prompts to execute
 * @param {object} [options={}]
 * @param {number} [options.timeout=30000] - Per-request timeout
 * @param {number} [options.concurrency=3] - Max parallel requests
 * @returns {Promise<Map<string, string|null>>} Map of key → response
 */
export async function askCopilotBatch(requests, { timeout = 30000, concurrency = 3 } = {}) {
  if (copilotAvailable === false || circuitOpen) {
    return new Map(requests.map((r) => [r.key || r.prompt, null]));
  }

  const limit = pLimit(concurrency);
  const results = new Map();

  const tasks = requests.map((req) => {
    const key = req.key || req.prompt;
    return limit(async () => {
      const response = await askCopilot(req.prompt, { timeout });
      results.set(key, response);
    });
  });

  await Promise.allSettled(tasks);
  return results;
}

/**
 * Check whether Copilot CLI is available on this machine.
 * @returns {Promise<boolean>}
 */
export async function isCopilotAvailable() {
  if (copilotAvailable !== null) return copilotAvailable;

  // Try `gh copilot` first (GitHub CLI extension), then standalone `copilot`
  try {
    await execCommand('gh', ['copilot', '--', '--version'], { timeout: 5000 });
    copilotAvailable = true;
  } catch {
    try {
      await execCommand('copilot', ['--version'], { timeout: 5000 });
      copilotAvailable = true;
    } catch {
      copilotAvailable = false;
    }
  }
  return copilotAvailable;
}

// --- internals ---

/**
 * Run a Copilot prompt via `gh copilot` (preferred) or standalone `copilot`.
 */
async function runCopilot(prompt, timeout) {
  try {
    // Try GitHub CLI extension first: `gh copilot -p "..."`
    return await execCommand('gh', ['copilot', '-p', prompt], { timeout });
  } catch (err) {
    if (isNotFoundError(err)) {
      // Fallback to standalone `copilot` binary
      return await execCommand('copilot', ['-p', prompt], { timeout });
    }
    throw err;
  }
}

function recordFailure() {
  stats.failures++;
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpen = true;
    warn(`Copilot circuit breaker opened after ${CIRCUIT_BREAKER_THRESHOLD} consecutive failures — skipping remaining AI calls.`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function execCommand(cmd, args, { timeout }) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function isNotFoundError(err) {
  return err.code === 'ENOENT' || (err.message && err.message.includes('not found'));
}

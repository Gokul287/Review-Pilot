import { execFile } from 'node:child_process';
import { warn, info } from './logger.js';

let copilotAvailable = null; // null = unknown, true/false = tested

/**
 * Asks GitHub Copilot CLI a question in programmatic mode.
 * Falls back gracefully if copilot binary is not found.
 *
 * @param {string} prompt - Natural language prompt for Copilot
 * @param {object} options
 * @param {number} options.timeout - Max wait time in ms (default 30s)
 * @returns {Promise<string|null>} Copilot's response or null if unavailable
 */
export async function askCopilot(prompt, { timeout = 30000 } = {}) {
  if (copilotAvailable === false) return null;

  try {
    const result = await execCommand('copilot', ['-p', prompt], { timeout });
    copilotAvailable = true;
    return result.trim();
  } catch (err) {
    if (isNotFoundError(err)) {
      if (copilotAvailable === null) {
        warn('Copilot CLI not found — running in heuristic-only mode.');
        warn('Install: npm install -g @github/copilot');
      }
      copilotAvailable = false;
      return null;
    }

    if (err.killed) {
      warn(`Copilot timed out after ${timeout / 1000}s — skipping AI analysis for this step.`);
      return null;
    }

    warn(`Copilot error: ${err.message}`);
    return null;
  }
}

/**
 * Check whether Copilot CLI is available on this machine.
 * @returns {Promise<boolean>}
 */
export async function isCopilotAvailable() {
  if (copilotAvailable !== null) return copilotAvailable;

  try {
    await execCommand('copilot', ['--version'], { timeout: 5000 });
    copilotAvailable = true;
  } catch {
    copilotAvailable = false;
  }
  return copilotAvailable;
}

// --- internals ---

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

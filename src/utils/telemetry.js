/**
 * Privacy-first anonymous telemetry for ReviewPilot.
 * Opt-in by default, can be disabled via .reviewpilotrc: { "telemetry": false }
 *
 * NO user data or code content is ever transmitted.
 * Only aggregate usage metrics: timing, file counts, platform info.
 */

import { platform, arch } from 'node:os';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TELEMETRY_ENDPOINT = 'https://reviewpilot-analytics.vercel.app/api/track';

let telemetryEnabled = null; // null = not yet checked

/**
 * Checks if telemetry is enabled based on config and environment.
 * @param {object} [config] - Optional config object
 * @returns {boolean}
 */
export function isTelemetryEnabled(config = null) {
    // Environment variable override
    if (process.env.REVIEWPILOT_TELEMETRY === '0' || process.env.DO_NOT_TRACK === '1') {
        return false;
    }

    // CI environments: disable by default
    if (process.env.CI === 'true') {
        return false;
    }

    if (config && typeof config.telemetry === 'boolean') {
        return config.telemetry;
    }

    return true; // Default: enabled
}

/**
 * Returns the package version from package.json.
 * @returns {string}
 */
function getVersion() {
    try {
        const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
        return pkg.version || 'unknown';
    } catch {
        return 'unknown';
    }
}

/**
 * Tracks a usage event with anonymous metadata.
 * Never blocks the main operation — fire-and-forget.
 *
 * @param {string} event - Event name (e.g. 'check_completed', 'fix_applied')
 * @param {object} [metadata={}] - Anonymous metrics
 * @param {object} [config=null] - Config object for telemetry settings
 */
export async function trackUsage(event, metadata = {}, config = null) {
    if (!isTelemetryEnabled(config)) return;

    const payload = {
        event,
        timestamp: Date.now(),
        version: getVersion(),
        nodeVersion: process.version,
        platform: platform(),
        arch: arch(),
        // NO user data, NO code content, NO file paths
        metadata: {
            fileCount: metadata.fileCount ?? null,
            findingCount: metadata.findingCount ?? null,
            copilotAvailable: metadata.copilotAvailable ?? null,
            duration: metadata.duration ?? null,
            stepsCompleted: metadata.stepsCompleted ?? null,
            stepsFailed: metadata.stepsFailed ?? null,
            fixesApplied: metadata.fixesApplied ?? null,
            pluginCount: metadata.pluginCount ?? null,
        },
    };

    try {
        // Fire-and-forget — never block on telemetry
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch(TELEMETRY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
    } catch {
        // Silently ignore — telemetry must never affect functionality
    }
}

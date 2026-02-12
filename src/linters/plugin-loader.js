/**
 * Plugin system for ReviewPilot's smart linter.
 * Supports loading external rules from `.reviewpilot-rules/` directory.
 */

import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Base class for linter plugins.
 * External rules extend this class and implement the `analyze()` method.
 *
 * @example
 *   // .reviewpilot-rules/no-moment-js.js
 *   import { LinterPlugin } from 'reviewpilot/src/linters/plugin-loader.js';
 *
 *   export default class NoMomentJS extends LinterPlugin {
 *     constructor() { super('no-moment-js', 'warning'); }
 *     async analyze(file, content) {
 *       if (content.includes("require('moment')")) {
 *         return [{ line: ..., message: '...', severity: this.severity }];
 *       }
 *       return [];
 *     }
 *   }
 */
export class LinterPlugin {
    /**
     * @param {string} name     - Plugin rule name
     * @param {'critical'|'error'|'warning'|'info'|'suggestion'} severity
     */
    constructor(name, severity = 'warning') {
        this.name = name;
        this.severity = severity;
    }

    /**
     * Analyze a file for issues. Override in subclasses.
     *
     * @param {string} file     - File path
     * @param {string} content  - File content
     * @returns {Promise<Array<{ line?: number, message: string, severity?: string }>>}
     */
    async analyze(file, content) {
        throw new Error(`Plugin "${this.name}" must implement analyze()`);
    }
}

/**
 * Loads custom linter plugins from the `.reviewpilot-rules/` directory.
 *
 * @param {string} repoRoot    - Repository root path
 * @param {string} [pluginDir='.reviewpilot-rules'] - Plugin directory name
 * @returns {Promise<LinterPlugin[]>} Array of validated plugin instances
 */
export async function loadPlugins(repoRoot, pluginDir = '.reviewpilot-rules') {
    const pluginsPath = join(repoRoot, pluginDir);

    if (!existsSync(pluginsPath)) {
        return [];
    }

    const plugins = [];

    try {
        const files = readdirSync(pluginsPath).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));

        for (const file of files) {
            try {
                const fullPath = resolve(pluginsPath, file);
                const fileUrl = pathToFileURL(fullPath).href;
                const mod = await import(fileUrl);

                const PluginSpec = mod.default || mod;
                let instance;

                if (typeof PluginSpec === 'function') {
                    // It's a class
                    instance = new PluginSpec();
                } else if (typeof PluginSpec === 'object' && PluginSpec !== null) {
                    // It's a plain object implementation
                    instance = PluginSpec;
                } else {
                    console.warn(`  ⚠ Plugin ${file}: export must be a class or object, skipping.`);
                    continue;
                }

                if (!validatePlugin(instance)) {
                    console.warn(`  ⚠ Plugin ${file}: invalid plugin interface, skipping.`);
                    continue;
                }

                plugins.push(instance);
            } catch (err) {
                console.warn(`  ⚠ Plugin ${file}: failed to load — ${err.message}`);
            }
        }
    } catch (err) {
        console.warn(`  ⚠ Unable to read plugin directory: ${err.message}`);
    }

    return plugins;
}

/**
 * Validates that a plugin instance conforms to the LinterPlugin interface.
 *
 * @param {object} plugin - Plugin instance
 * @returns {boolean}
 */
export function validatePlugin(plugin) {
    if (!plugin || typeof plugin !== 'object') return false;
    if (typeof plugin.name !== 'string' || !plugin.name) return false;
    if (typeof plugin.analyze !== 'function') return false;
    return true;
}

/**
 * Runs a loaded plugin against a file, with error isolation.
 *
 * @param {LinterPlugin} plugin - Plugin instance
 * @param {string} file         - File path
 * @param {string} content      - File content
 * @returns {Promise<Array<import('../linters/smart-linter.js').Finding>>}
 */
export async function runPlugin(plugin, file, content) {
    try {
        const results = await plugin.analyze(file, content);

        if (!Array.isArray(results)) return [];

        return results.map((r) => ({
            file,
            line: r.line || null,
            severity: r.severity || plugin.severity || 'warning',
            message: `[${plugin.name}] ${r.message}`,
            source: 'plugin',
        }));
    } catch (err) {
        console.warn(`  ⚠ Plugin "${plugin.name}" error on ${file}: ${err.message}`);
        return [];
    }
}

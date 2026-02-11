import { describe, it, expect, vi } from 'vitest';
import { LinterPlugin, validatePlugin, loadPlugins, runPlugin } from '../../src/linters/plugin-loader.js';

describe('LinterPlugin', () => {
    it('should store name and severity', () => {
        const plugin = new LinterPlugin('test-rule', 'error');
        expect(plugin.name).toBe('test-rule');
        expect(plugin.severity).toBe('error');
    });

    it('should default severity to warning', () => {
        const plugin = new LinterPlugin('test-rule');
        expect(plugin.severity).toBe('warning');
    });

    it('should throw when analyze is not implemented', async () => {
        const plugin = new LinterPlugin('test-rule');
        await expect(plugin.analyze('file.js', 'code')).rejects.toThrow('must implement analyze');
    });
});

describe('validatePlugin', () => {
    it('should accept valid plugin', () => {
        const plugin = { name: 'test', analyze: () => [] };
        expect(validatePlugin(plugin)).toBe(true);
    });

    it('should reject null', () => {
        expect(validatePlugin(null)).toBe(false);
    });

    it('should reject plugins without name', () => {
        expect(validatePlugin({ analyze: () => [] })).toBe(false);
    });

    it('should reject plugins without analyze', () => {
        expect(validatePlugin({ name: 'test' })).toBe(false);
    });

    it('should reject plugins with empty name', () => {
        expect(validatePlugin({ name: '', analyze: () => [] })).toBe(false);
    });
});

describe('runPlugin', () => {
    it('should run plugin and format findings', async () => {
        const plugin = {
            name: 'custom-rule',
            severity: 'warning',
            analyze: async () => [
                { line: 5, message: 'Bad pattern detected' },
            ],
        };

        const results = await runPlugin(plugin, 'test.js', 'code content');
        expect(results).toHaveLength(1);
        expect(results[0].message).toContain('[custom-rule]');
        expect(results[0].source).toBe('plugin');
        expect(results[0].severity).toBe('warning');
    });

    it('should handle plugin errors gracefully', async () => {
        const plugin = {
            name: 'broken-plugin',
            severity: 'error',
            analyze: async () => { throw new Error('Plugin crashed'); },
        };

        const results = await runPlugin(plugin, 'test.js', 'code');
        expect(results).toHaveLength(0);
    });

    it('should handle non-array responses', async () => {
        const plugin = {
            name: 'bad-return',
            severity: 'warning',
            analyze: async () => 'not an array',
        };

        const results = await runPlugin(plugin, 'test.js', 'code');
        expect(results).toHaveLength(0);
    });
});

describe('loadPlugins', () => {
    it('should return empty array when directory does not exist', async () => {
        const plugins = await loadPlugins('/nonexistent/path');
        expect(plugins).toEqual([]);
    });
});

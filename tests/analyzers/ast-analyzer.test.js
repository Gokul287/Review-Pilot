import { describe, it, expect } from 'vitest';
import { analyzeWithAST, canAnalyze, calculateComplexity } from '../../src/analyzers/ast-analyzer.js';

describe('canAnalyze', () => {
    it('should support .js files', () => expect(canAnalyze('app.js')).toBe(true));
    it('should support .ts files', () => expect(canAnalyze('app.ts')).toBe(true));
    it('should support .jsx files', () => expect(canAnalyze('app.jsx')).toBe(true));
    it('should support .tsx files', () => expect(canAnalyze('app.tsx')).toBe(true));
    it('should not support .py files', () => expect(canAnalyze('app.py')).toBe(false));
    it('should not support .css files', () => expect(canAnalyze('style.css')).toBe(false));
});

describe('analyzeWithAST', () => {
    it('should detect console.log outside conditionals', () => {
        const code = `
            function test() {
                console.log("hello");
            }
        `;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('Console.log'))).toBe(true);
    });

    it('should NOT flag console.log inside catch blocks', () => {
        const code = `
            try { foo(); }
            catch (err) { console.log(err); }
        `;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('Console.log'))).toBe(false);
    });

    it('should NOT flag console.log inside if blocks', () => {
        const code = `
            if (DEBUG) { console.log("debug info"); }
        `;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('Console.log'))).toBe(false);
    });

    it('should detect eval() usage', () => {
        const code = `eval(userInput);`;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('eval'))).toBe(true);
    });

    it('should detect innerHTML assignments', () => {
        const code = `document.body.innerHTML = data;`;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('innerHTML'))).toBe(true);
    });

    it('should detect empty catch blocks', () => {
        const code = `try { foo(); } catch (e) {}`;
        const findings = analyzeWithAST(code, 'test.js');
        expect(findings.some((f) => f.message.includes('Empty catch'))).toBe(true);
    });

    it('should return empty for unsupported file types', () => {
        const findings = analyzeWithAST('print("hello")', 'test.py');
        expect(findings).toHaveLength(0);
    });

    it('should gracefully handle syntax errors', () => {
        const code = `function { broken syntax ,,, `;
        const findings = analyzeWithAST(code, 'test.js');
        // Should not throw — may return findings from error-recovery mode or empty
        expect(Array.isArray(findings)).toBe(true);
    });
});

describe('calculateComplexity', () => {
    it('should return 1 for simple function', () => {
        const code = `function simple() { return 1; }`;
        expect(calculateComplexity(code, 'test.js')).toBe(1);
    });

    it('should count if statements', () => {
        const code = `function test() { if (a) { return 1; } else { return 2; } }`;
        expect(calculateComplexity(code, 'test.js')).toBeGreaterThan(1);
    });

    it('should count loops', () => {
        const code = `function test() { for (let i = 0; i < 10; i++) { while (true) { break; } } }`;
        expect(calculateComplexity(code, 'test.js')).toBeGreaterThanOrEqual(3);
    });

    it('should count logical operators', () => {
        const code = `function test() { if (a && b || c) { return 1; } }`;
        expect(calculateComplexity(code, 'test.js')).toBeGreaterThanOrEqual(3);
    });

    it('should return 0 for unsupported files', () => {
        expect(calculateComplexity('hello', 'test.py')).toBe(0);
    });
});

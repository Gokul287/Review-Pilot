import { describe, it, expect } from 'vitest';
import {
    calculateEntropy,
    isHighEntropyString,
    detectBase64Secrets,
    detectHexSecrets,
    hasSecretPrefix,
    detectSecret,
} from '../../src/utils/entropy.js';

describe('calculateEntropy', () => {
    it('should return 0 for empty string', () => {
        expect(calculateEntropy('')).toBe(0);
        expect(calculateEntropy(null)).toBe(0);
    });

    it('should return 0 for single repeated character', () => {
        expect(calculateEntropy('aaaa')).toBe(0);
    });

    it('should return higher entropy for random-looking strings', () => {
        const low = calculateEntropy('aaabbb');
        const high = calculateEntropy('a1b2c3d4e5f6g7h8');
        expect(high).toBeGreaterThan(low);
    });

    it('should return max ~4.7 for alphanumeric mix', () => {
        const entropy = calculateEntropy('abcdefghijklmnopqrstuvwxyz0123456789');
        expect(entropy).toBeGreaterThan(4.5);
    });
});

describe('isHighEntropyString', () => {
    it('should return false for short strings', () => {
        expect(isHighEntropyString('abc', 4.5, 20)).toBe(false);
    });

    it('should return false for UUIDs', () => {
        expect(isHighEntropyString('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    });

    it('should return false for URLs', () => {
        expect(isHighEntropyString('https://example.com/api/v1/users')).toBe(false);
    });

    it('should return true for high-entropy random strings', () => {
        // This string has high entropy (> 4.5) and length > 20
        expect(isHighEntropyString('x9k2mP4qR7sT1uW3yZ5aB8cD0eF6gH')).toBe(true);
    });
});

describe('detectBase64Secrets', () => {
    it('should detect base64-encoded strings', () => {
        const result = detectBase64Secrets('dXNlcjpwYXNzd29yZDEyMw==');
        expect(result.isBase64).toBe(true);
    });

    it('should reject short strings', () => {
        const result = detectBase64Secrets('abc');
        expect(result.isBase64).toBe(false);
    });

    it('should reject non-base64 strings', () => {
        const result = detectBase64Secrets('this is not base64!!!');
        expect(result.isBase64).toBe(false);
    });
});

describe('detectHexSecrets', () => {
    it('should detect long hex strings', () => {
        expect(detectHexSecrets('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6')).toBe(true);
    });

    it('should reject short hex strings', () => {
        expect(detectHexSecrets('abcd')).toBe(false);
    });

    it('should reject non-hex strings', () => {
        expect(detectHexSecrets('ghijklmnopqrstuvwxyz1234567890ab')).toBe(false);
    });
});

describe('hasSecretPrefix', () => {
    it('should detect GitHub token prefixes', () => {
        expect(hasSecretPrefix('ghp_abc123')).toBe(true);
    });

    it('should detect AWS key prefixes', () => {
        expect(hasSecretPrefix('AKIA1234567890ABCDEF')).toBe(true);
    });

    it('should detect Stripe prefixes', () => {
        expect(hasSecretPrefix('sk_live_abc123')).toBe(true);
    });

    it('should reject non-secret prefixes', () => {
        expect(hasSecretPrefix('hello_world')).toBe(false);
    });
});

describe('detectSecret', () => {
    it('should detect known prefix secrets with high confidence', () => {
        const result = detectSecret('ghp_abcdefghijklmnop');
        expect(result.isSecret).toBe(true);
        expect(result.confidence).toBe('high');
    });

    it('should detect high-entropy strings in security context', () => {
        const result = detectSecret('x9k2mP4qR7sT1uW', 'apiKey');
        expect(result.isSecret).toBe(true);
    });

    it('should not flag short strings', () => {
        const result = detectSecret('test');
        expect(result.isSecret).toBe(false);
    });

    it('should return null confidence for non-secrets', () => {
        const result = detectSecret('hello world how are you');
        expect(result.confidence).toBeNull();
    });
});

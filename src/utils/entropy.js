/**
 * Entropy-based analysis utilities for secret detection.
 * Uses Shannon entropy to identify high-randomness strings that may be secrets.
 */

// Known secret prefixes (provider-specific)
const SECRET_PREFIXES = [
    'sk-', 'pk-', 'sk_live_', 'pk_live_', 'sk_test_', 'pk_test_',
    'ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_',          // GitHub
    'AKIA', 'ABIA', 'ACCA', 'ASIA',                     // AWS
    'xoxb-', 'xoxp-', 'xoxo-', 'xapp-',                // Slack
    'eyJ',                                                // JWT
    'SG.',                                                // SendGrid
    'sq0',                                                // Square
    'sk_live', 'rk_live',                                 // Stripe
];

// Known safe patterns (to reduce false positives)
const SAFE_PATTERNS = [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^[0-9]+$/,                                                              // Pure numbers
    /^(true|false|null|undefined|none|yes|no)$/i,                           // Booleans
    /^https?:\/\//,                                                          // URLs
    /^[\w.-]+@[\w.-]+$/,                                                     // Emails
    /^\$\{.*\}$/,                                                            // Template vars
    /^<.*>$/,                                                                // Placeholder tokens
];

/**
 * Calculates Shannon entropy of a string.
 * Higher entropy = more randomness = more likely to be a secret.
 *
 * @param {string} str - Input string
 * @returns {number} Entropy value (0–8 for ASCII, higher = more random)
 */
export function calculateEntropy(str) {
    if (!str || str.length === 0) return 0;

    const freq = {};
    for (const char of str) {
        freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
        const p = count / len;
        entropy -= p * Math.log2(p);
    }

    return entropy;
}

/**
 * Checks if a string has high entropy (likely a secret).
 *
 * @param {string} str - Input string
 * @param {number} [threshold=4.5] - Entropy threshold
 * @param {number} [minLength=20] - Minimum string length to check
 * @returns {boolean}
 */
export function isHighEntropyString(str, threshold = 4.5, minLength = 20) {
    if (!str || str.length < minLength) return false;

    // Skip known safe patterns
    if (SAFE_PATTERNS.some((p) => p.test(str))) return false;

    return calculateEntropy(str) > threshold;
}

/**
 * Detects base64-encoded secrets.
 *
 * @param {string} str - Input string
 * @returns {{ isBase64: boolean, decoded: string | null, isSecret: boolean }}
 */
export function detectBase64Secrets(str) {
    if (!str || str.length < 16) return { isBase64: false, decoded: null, isSecret: false };

    // Check if it looks like base64
    const base64Regex = /^[A-Za-z0-9+/]{16,}={0,2}$/;
    if (!base64Regex.test(str.trim())) return { isBase64: false, decoded: null, isSecret: false };

    try {
        const decoded = Buffer.from(str.trim(), 'base64').toString('utf-8');

        // Check if decoded content contains printable characters
        const printableRatio = decoded.replace(/[^\x20-\x7E]/g, '').length / decoded.length;
        if (printableRatio < 0.5) return { isBase64: true, decoded: null, isSecret: false };

        // Check if decoded content looks like credentials
        const looksLikeSecret = /[:=]/.test(decoded) || isHighEntropyString(decoded, 3.5, 8);

        return { isBase64: true, decoded, isSecret: looksLikeSecret };
    } catch {
        return { isBase64: false, decoded: null, isSecret: false };
    }
}

/**
 * Detects hex-encoded strings that may be secrets.
 *
 * @param {string} str - Input string
 * @returns {boolean}
 */
export function detectHexSecrets(str) {
    if (!str || str.length < 32) return false;

    // Must be all hex characters and even length
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(str) || str.length % 2 !== 0) return false;

    // Long hex strings (32+ chars) with high entropy are likely secrets
    return calculateEntropy(str) > 3.0;
}

/**
 * Checks if a string starts with a known secret prefix.
 *
 * @param {string} str - Input string
 * @returns {boolean}
 */
export function hasSecretPrefix(str) {
    if (!str) return false;
    return SECRET_PREFIXES.some((prefix) => str.startsWith(prefix));
}

/**
 * Comprehensive secret detection combining multiple strategies.
 *
 * @param {string} str - Input string (the value, not the key)
 * @param {string} [context=''] - Variable name or key for context
 * @returns {{ isSecret: boolean, reason: string | null, confidence: 'high' | 'medium' | 'low' | null }}
 */
export function detectSecret(str, context = '') {
    if (!str || str.length < 8) return { isSecret: false, reason: null, confidence: null };

    // 1. Known prefix match (highest confidence)
    if (hasSecretPrefix(str)) {
        return { isSecret: true, reason: 'Known secret prefix detected', confidence: 'high' };
    }

    // 2. Base64 encoded secret
    const b64 = detectBase64Secrets(str);
    if (b64.isSecret) {
        return { isSecret: true, reason: 'Base64-encoded credential detected', confidence: 'high' };
    }

    // 3. Hex-encoded secret
    if (detectHexSecrets(str)) {
        return { isSecret: true, reason: 'Hex-encoded secret detected', confidence: 'medium' };
    }

    // 4. High entropy with security context
    const securityContext = /password|secret|token|key|auth|cred|api.?key/i.test(context);
    if (securityContext && isHighEntropyString(str, 3.5, 12)) {
        return { isSecret: true, reason: 'High-entropy value in security-sensitive variable', confidence: 'high' };
    }

    // 5. High entropy standalone (lower confidence)
    if (isHighEntropyString(str, 5.0, 24)) {
        return { isSecret: true, reason: 'High-entropy string (potential secret)', confidence: 'low' };
    }

    return { isSecret: false, reason: null, confidence: null };
}

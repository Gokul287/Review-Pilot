#!/bin/bash
# ────────────────────────────────────────────────────────────────
# ReviewPilot Benchmark Repo Setup
# Creates git history with a clean baseline and a feature branch
# containing 7 intentional code issues for demonstration.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#   reviewpilot check --save --verbose
# ────────────────────────────────────────────────────────────────
set -e

echo ""
echo "  🛩️  ReviewPilot Benchmark Setup"
echo "  ════════════════════════════════"
echo ""

# ── 1. Initialise Git ─────────────────────────────────────────

if [ ! -d .git ]; then
    git init
    git config user.name "Benchmark Bot"
    git config user.email "benchmark@reviewpilot.dev"
    echo "  ✔ Initialised git repository"
else
    echo "  ℹ Git repository already exists"
fi

# ── 2. Create clean baseline on main ──────────────────────────

# Ensure we're on main
git checkout -B main 2>/dev/null || true

# Clean source files (no issues)
mkdir -p src tests

cat > src/auth.js << 'BASELINE'
/**
 * Authentication module — handles user login and session management.
 */

export async function login(username, password) {
    const apiKey = process.env.API_KEY;
    const user = await validateCredentials(username, password);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    return { id: user.id, token: generateToken(user) };
}

export async function logout(sessionId) {
    await invalidateSession(sessionId);
    return { success: true };
}

function generateToken(user) {
    return Buffer.from(JSON.stringify({ id: user.id, ts: Date.now() })).toString('base64');
}

async function validateCredentials(username, password) {
    // Stub — replace with real DB call
    return { id: 1, name: username };
}

async function invalidateSession(sessionId) {
    // Stub
}
BASELINE

cat > src/payment.js << 'BASELINE'
/**
 * Payment processing module.
 */

export async function processPayment(amount, currency) {
    if (amount <= 0) throw new Error('Invalid amount');

    try {
        const result = await stripe.charge({ amount, currency });
        return { success: true, chargeId: result.id };
    } catch (error) {
        throw new Error(`Payment failed: ${error.message}`);
    }
}

export async function refund(chargeId) {
    try {
        const result = await stripe.refund(chargeId);
        return { success: true, refundId: result.id };
    } catch (error) {
        throw new Error(`Refund failed: ${error.message}`);
    }
}
BASELINE

cat > src/utils.js << 'BASELINE'
/**
 * Shared utility functions.
 */

export function formatDate(date) {
    return new Date(date).toISOString();
}

export function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function truncate(str, len = 100) {
    return str.length > len ? str.slice(0, len) + '...' : str;
}
BASELINE

cat > src/database.js << 'BASELINE'
/**
 * Database access layer.
 */

export function connect(uri) {
    return { connected: true, uri };
}

export function query(sql, params) {
    return { rows: [], sql, params };
}

export function disconnect() {
    return { disconnected: true };
}
BASELINE

cat > tests/auth.test.js << 'BASELINE'
import { describe, it, expect } from 'vitest';

describe('auth', () => {
    it('should login with valid credentials', () => {
        expect(true).toBe(true);
    });

    it('should reject invalid credentials', () => {
        expect(true).toBe(true);
    });
});
BASELINE

# Stage and commit baseline
git add -A
git commit -m "feat: initial clean implementation" --allow-empty 2>/dev/null || true

echo "  ✔ Created clean baseline on 'main'"

# ── 3. Create feature branch with 7 intentional issues ───────

git checkout -B feature/add-auth-and-payments 2>/dev/null

# ── auth.js: Issues 1, 2, 3 ──────────────────────────────────
cat > src/auth.js << 'ISSUES'
/**
 * Authentication module — handles user login and session management.
 */

export async function login(username, password) {
    // ISSUE 1: Hardcoded API key (entropy-based + heuristic detection)
    const apiKey = "EXAMPLE_KEY_a8f3Kd9Lm2Xp7Qr4Nt6Wz1Yb5Hj0Vc3Se8Ug";

    const user = await validateCredentials(username, password);

    // ISSUE 2: Console log leaking sensitive data
    console.log('User authenticated:', user);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // ISSUE 3: eval() usage — security risk
    const role = eval('user.role');

    return { id: user.id, token: generateToken(user), role };
}

export async function logout(sessionId) {
    await invalidateSession(sessionId);
    return { success: true };
}

function generateToken(user) {
    return Buffer.from(JSON.stringify({ id: user.id, ts: Date.now() })).toString('base64');
}

async function validateCredentials(username, password) {
    return { id: 1, name: username, role: 'user' };
}

async function invalidateSession(sessionId) {
    // Stub
}
ISSUES

# ── payment.js: Issues 4, 5 ──────────────────────────────────
cat > src/payment.js << 'ISSUES'
/**
 * Payment processing module.
 */

export async function processPayment(amount, currency) {
    if (amount <= 0) throw new Error('Invalid amount');

    // ISSUE 4: Hardcoded token (base64 encoded secret)
    const token = "RkFLRV9UT0tFTl9mb3JfYmVuY2htYXJrX3Rlc3Rpbmc=";

    const result = await stripe.charge({ amount, currency, token });

    // ISSUE 5: Empty catch block — errors silently swallowed
    try {
        await logTransaction(result);
    } catch () {}

    return { success: true, chargeId: result.id };
}

export async function refund(chargeId) {
    try {
        const result = await stripe.refund(chargeId);
        return { success: true, refundId: result.id };
    } catch (error) {
        throw new Error(`Refund failed: ${error.message}`);
    }
}

async function logTransaction(result) {
    // Stub
}
ISSUES

# ── utils.js: Issue 6 — function exceeding 50 lines ──────────
cat > src/utils.js << 'ISSUES'
/**
 * Shared utility functions.
 */

export function formatDate(date) {
    return new Date(date).toISOString();
}

export function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function truncate(str, len = 100) {
    return str.length > len ? str.slice(0, len) + '...' : str;
}

// ISSUE 6: Function exceeds 50-line performance budget
export function processUserData(user) {
    const result = {};
    result.id = user.id;
    result.name = user.name;
    result.email = user.email;
    result.phone = user.phone;
    result.address = user.address;
    result.city = user.city;
    result.state = user.state;
    result.zip = user.zip;
    result.country = user.country;
    result.timezone = user.timezone;
    result.locale = user.locale;
    result.currency = user.currency;
    result.avatar = user.avatar;
    result.bio = user.bio;
    result.website = user.website;
    result.company = user.company;
    result.title = user.title;
    result.department = user.department;
    result.team = user.team;
    result.manager = user.manager;
    result.hireDate = user.hireDate;
    result.role = user.role;
    result.permissions = user.permissions;
    result.lastLogin = user.lastLogin;
    result.loginCount = user.loginCount;
    result.failedLogins = user.failedLogins;
    result.mfaEnabled = user.mfaEnabled;
    result.mfaType = user.mfaType;
    result.preferences = user.preferences;
    result.notifications = user.notifications;
    result.theme = user.theme;
    result.language = user.language;
    result.accessibility = user.accessibility;
    result.billing = user.billing;
    result.subscription = user.subscription;
    result.plan = user.plan;
    result.usage = user.usage;
    result.quota = user.quota;
    result.storage = user.storage;
    result.bandwidth = user.bandwidth;
    result.apiCalls = user.apiCalls;
    result.webhooks = user.webhooks;
    result.integrations = user.integrations;
    result.oauth = user.oauth;
    result.sso = user.sso;
    result.audit = user.audit;
    result.compliance = user.compliance;
    result.gdpr = user.gdpr;
    result.dataRetention = user.dataRetention;
    result.backup = user.backup;
    result.recovery = user.recovery;
    result.status = user.status;
    result.verified = user.verified;
    result.createdAt = user.createdAt;
    result.updatedAt = user.updatedAt;
    return result;
}
ISSUES

# ── database.js: Issue 7 — removed export (breaking change) ──
cat > src/database.js << 'ISSUES'
/**
 * Database access layer.
 */

export function connect(uri) {
    return { connected: true, uri };
}

// ISSUE 7: Removed export 'query' — breaking change for consumers
function query(sql, params) {
    return { rows: [], sql, params };
}

export function disconnect() {
    return { disconnected: true };
}
ISSUES

# Stage and commit
git add -A
git commit -m "feat: add authentication and payment processing

- Add login with API key integration
- Add payment with Stripe support
- Add user data processing utility
- Refactor database module" 2>/dev/null || true

echo "  ✔ Created feature branch with 7 intentional issues"
echo ""
echo "  ┌──────────────────────────────────────────────┐"
echo "  │  🎯 Now run: reviewpilot check --save        │"
echo "  │  📊 Expected: 7 findings in <15s             │"
echo "  │  📝 Results:  .reviewpilot-output/            │"
echo "  └──────────────────────────────────────────────┘"
echo ""

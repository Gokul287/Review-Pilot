# ────────────────────────────────────────────────────────────────
# ReviewPilot Benchmark Repo Setup (PowerShell)
# Creates git history with a clean baseline and a feature branch
# containing 7 intentional code issues for demonstration.
#
# Usage:
#   .\setup.ps1
#   reviewpilot check --save --verbose
# ────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ReviewPilot Benchmark Setup" -ForegroundColor Cyan
Write-Host "  =========================="
Write-Host ""

# ── 1. Initialise Git ─────────────────────────────────────────

if (!(Test-Path ".git")) {
    git init
    git config user.name "Benchmark Bot"
    git config user.email "benchmark@reviewpilot.dev"
    Write-Host "  + Initialised git repository" -ForegroundColor Green
} else {
    Write-Host "  i Git repository already exists" -ForegroundColor Yellow
}

# ── 2. Create clean baseline on main ──────────────────────────

git checkout -B main 2>$null

New-Item -ItemType Directory -Path src, tests -Force | Out-Null

# --- Clean source files (no issues) ---

@'
/**
 * Authentication module
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
    return { id: 1, name: username };
}

async function invalidateSession(sessionId) {}
'@ | Set-Content -Path "src/auth.js" -Encoding UTF8

@'
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
'@ | Set-Content -Path "src/payment.js" -Encoding UTF8

@'
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
'@ | Set-Content -Path "src/utils.js" -Encoding UTF8

@'
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
'@ | Set-Content -Path "src/database.js" -Encoding UTF8

@'
import { describe, it, expect } from 'vitest';

describe('auth', () => {
    it('should login with valid credentials', () => {
        expect(true).toBe(true);
    });

    it('should reject invalid credentials', () => {
        expect(true).toBe(true);
    });
});
'@ | Set-Content -Path "tests/auth.test.js" -Encoding UTF8

git add -A
git commit -m "feat: initial clean implementation" --allow-empty 2>$null

Write-Host "  + Created clean baseline on 'main'" -ForegroundColor Green

# ── 3. Create feature branch with 7 intentional issues ───────

git checkout -B feature/add-auth-and-payments 2>$null

# --- auth.js: Issues 1, 2, 3 ---

@'
/**
 * Authentication module
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

async function invalidateSession(sessionId) {}
'@ | Set-Content -Path "src/auth.js" -Encoding UTF8

# --- payment.js: Issues 4, 5 ---

@'
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

async function logTransaction(result) {}
'@ | Set-Content -Path "src/payment.js" -Encoding UTF8

# --- utils.js: Issue 6 — function exceeding 50 lines ---

$utilsContent = @'
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
'@
$utilsContent | Set-Content -Path "src/utils.js" -Encoding UTF8

# --- database.js: Issue 7 — removed export (breaking change) ---

@'
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
'@ | Set-Content -Path "src/database.js" -Encoding UTF8

git add -A
git commit -m "feat: add authentication and payment processing`n`n- Add login with API key integration`n- Add payment with Stripe support`n- Add user data processing utility`n- Refactor database module" 2>$null

Write-Host "  + Created feature branch with 7 intentional issues" -ForegroundColor Green
Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |  Now run: reviewpilot check --save           |" -ForegroundColor Cyan
Write-Host "  |  Expected: 7 findings                       |" -ForegroundColor Cyan
Write-Host "  |  Results:  .reviewpilot-output/              |" -ForegroundColor Cyan
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

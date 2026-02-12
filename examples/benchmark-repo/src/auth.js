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

    // ISSUE 3: eval() usage â€” security risk
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

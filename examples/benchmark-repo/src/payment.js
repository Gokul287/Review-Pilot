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

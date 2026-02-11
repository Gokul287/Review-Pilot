export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data = req.body;

        // Basic validation
        if (!data.event || !data.timestamp) {
            return res.status(400).json({ error: 'Missing required fields: event, timestamp' });
        }

        // Log to Vercel logs (automatic storage, no external DB needed)
        console.log(JSON.stringify({
            event: data.event,
            version: data.version || 'unknown',
            platform: data.platform || 'unknown',
            nodeVersion: data.nodeVersion || 'unknown',
            arch: data.arch || 'unknown',
            metadata: data.metadata || {},
            timestamp: data.timestamp,
            receivedAt: Date.now(),
        }));

        return res.status(200).json({
            received: true,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('Telemetry error:', error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

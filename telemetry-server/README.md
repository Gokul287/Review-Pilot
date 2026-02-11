# ReviewPilot Telemetry Server

Privacy-first anonymous usage telemetry. No user data, no code content, no file paths.

## Deploy to Vercel

```bash
cd telemetry-server
npm install -g vercel
vercel login
vercel --prod
```

## Test Endpoint

```bash
curl -X POST https://reviewpilot-analytics.vercel.app/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "event": "check_completed",
    "timestamp": 1234567890,
    "version": "1.0.0",
    "platform": "darwin",
    "metadata": {
      "fileCount": 10,
      "duration": 15000
    }
  }'

# Expected: {"received":true,"timestamp":...}
```

## What's Collected

| Field | Example | Purpose |
|-------|---------|---------|
| `event` | `check_completed` | What happened |
| `version` | `1.0.0` | Which version |
| `platform` | `darwin` | OS type |
| `nodeVersion` | `v18.19.0` | Runtime |
| `metadata.fileCount` | `10` | Scale of usage |
| `metadata.duration` | `15000` | Performance tracking |

**Never collected:** file names, code content, user identity, IP addresses.

## User Opt-Out

Users can disable telemetry in 3 ways:

```bash
# Environment variable
export REVIEWPILOT_TELEMETRY=0

# Universal standard
export DO_NOT_TRACK=1
```

```json
// .reviewpilotrc
{ "telemetry": false }
```

CI environments (`CI=true`) disable telemetry automatically.

## Architecture

```
ReviewPilot CLI → POST /api/track → Vercel Serverless → Vercel Logs
                     ↑                                       ↓
              Fire-and-forget              Accessible via Vercel Dashboard
              (3s timeout)                 (no external DB needed)
```

If the endpoint is unavailable, ReviewPilot continues normally — telemetry never affects functionality.

 # Heartbeat pinger

This small script sends a periodic HTTP request to keep services awake.

## Usage

Environment variables:

- `HEARTBEAT_URL`: target URL (default: `https://httpbin.org/status/200`)
- `HEARTBEAT_METHOD`: `GET` or `POST` (default: `GET`)
- `HEARTBEAT_INTERVAL`: seconds between pings (default: `30`)
- `HEARTBEAT_RETRIES`: retries for one-shot test (default: `3`)
- `HEARTBEAT_BACKOFF`: base backoff seconds (default: `2`)

Run once (test):

```bash
python backend/scripts/heartbeat.py --once --url "https://your-service/keepalive" --method GET
```

Run continuously:

```bash
HEARTBEAT_URL="https://your-service/keepalive" HEARTBEAT_METHOD=GET HEARTBEAT_INTERVAL=30 python backend/scripts/heartbeat.py
```

## Systemd unit (example)

Create `/etc/systemd/system/heartbeat.service` with the following content and enable it to run on boot:

```ini
[Unit]
Description=Heartbeat Pinger
After=network.target

[Service]
Type=simple
User=www-data
ExecStart=/usr/bin/env python3 /path/to/repo/backend/scripts/heartbeat.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Notes

- Use a secure URL (https) where possible.
- Make sure you respect the target service rate limits.

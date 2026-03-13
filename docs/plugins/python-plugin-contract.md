# Python Plugin Contract

This document defines the HTTP contract that Python sidecar plugins must implement to integrate with the LMS plugin runtime.

## Overview

Python plugins run as sidecar processes managed by the Java learning-service. The runtime handles:
- ZIP extraction and virtualenv setup
- Process lifecycle (start, stop, restart)
- HTTP proxying from `/api/plugins/{pluginId}/**` to the sidecar
- Health monitoring and auto-restart on boot

## ZIP Package Structure

```
my-plugin.zip
├── plugin.json          # Required: plugin manifest
├── main.py              # Required: FastAPI entry point
├── requirements.txt     # Optional: pip dependencies
└── ...                  # Additional Python modules
```

## plugin.json (Manifest)

```json
{
  "id": "com.example.analytics-dashboard",
  "name": "Analytics Dashboard",
  "version": "1.0.0",
  "description": "Custom analytics dashboard for course data",
  "author": "Example Corp",
  "minLmsVersion": "1.0.0",
  "runtime": "python",
  "type": "ANALYTICS",
  "permissions": [
    "courses.read",
    "grades.read",
    "users.read"
  ],
  "dependencies": [],
  "entryPoints": null
}
```

**Key fields:**
- `runtime` — Must be `"python"` for Python plugins
- `entryPoints` — Should be `null` (not used for Python plugins)
- `permissions` — Declares which LMS data the plugin needs access to

## Required HTTP Endpoints

Your FastAPI application **must** implement these endpoints:

### GET /health

Health check endpoint polled by the runtime during startup and periodically.

**Response:**
```json
{"status": "ok"}
```

The runtime waits up to 30 seconds (configurable) for this endpoint to respond after process start.

### POST /lifecycle/{event}

Called by the runtime during plugin lifecycle transitions.

| Event       | When Called                                    |
|-------------|------------------------------------------------|
| `install`   | First time the plugin is installed             |
| `enable`    | Plugin is activated (including after restart)  |
| `disable`   | Plugin is deactivated by admin                 |
| `uninstall` | Plugin is permanently removed                  |

**Response:** 200 OK (body ignored)

Lifecycle endpoints should be idempotent. If the plugin has no setup/teardown logic for an event, return 200 immediately.

## Environment Variables

The runtime provides these environment variables to the Python process:

| Variable             | Description                                           | Example                          |
|----------------------|-------------------------------------------------------|----------------------------------|
| `PLUGIN_ID`          | Unique plugin identifier                              | `com.example.analytics-dashboard`|
| `PLUGIN_PORT`        | Port the plugin must listen on                        | `9101`                           |
| `PLUGIN_SCHEMA`      | PostgreSQL schema name for plugin-owned tables        | `plugin_com_example_analytics_dashboard` |
| `PLUGIN_PERMISSIONS` | Comma-separated list of granted permission scopes     | `courses.read,grades.read`       |
| `PLUGIN_CONFIG`      | JSON string of admin-configured key-value settings    | `{"apiKey":"...","threshold":"5"}`|
| `LMS_DB_HOST`        | Database hostname (from learning-service datasource)  | `localhost`                      |
| `LMS_DB_PORT`        | Database port                                         | `5432`                           |
| `LMS_DB_NAME`        | Database name                                         | `lms_db`                         |
| `LMS_DB_USER`        | Database username                                     | `lms_user`                       |
| `LMS_DB_PASSWORD`    | Database password                                     | `...`                            |

## Database Access

### Own Schema (Full Access)

Your plugin has full DDL/DML access to its own schema (`PLUGIN_SCHEMA`). Create tables, indexes, and store data freely:

```python
import psycopg2
import os

conn = psycopg2.connect(
    host=os.environ["LMS_DB_HOST"],
    port=os.environ["LMS_DB_PORT"],
    dbname=os.environ["LMS_DB_NAME"],
    user=os.environ["LMS_DB_USER"],
    password=os.environ["LMS_DB_PASSWORD"],
    options=f"-c search_path={os.environ['PLUGIN_SCHEMA']}"
)
```

### Core LMS Tables (Read-Only by Convention)

Plugins with appropriate permissions may read core LMS tables in the `public` schema. Access is controlled by convention based on declared `permissions`:

| Permission          | Accessible Tables                    |
|---------------------|--------------------------------------|
| `courses.read`      | `courses`, `modules`, `resources`    |
| `users.read`        | `users`, `enrollments`               |
| `grades.read`       | `gradebook_entries`, `gradebook_categories` |
| `submissions.read`  | `submissions`, `submission_files`    |

> **Note:** PostgreSQL role-based enforcement may be added in a future version. Currently, access is trust-based.

## Example main.py

```python
import os
import uvicorn
from fastapi import FastAPI

app = FastAPI()

PLUGIN_ID = os.environ.get("PLUGIN_ID", "unknown")
PLUGIN_PORT = int(os.environ.get("PLUGIN_PORT", "9100"))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/lifecycle/{event}")
async def lifecycle(event: str):
    if event == "install":
        # One-time setup: create tables, seed data, etc.
        pass
    elif event == "enable":
        # Activation: start background tasks, warm caches
        pass
    elif event == "disable":
        # Deactivation: stop background tasks
        pass
    elif event == "uninstall":
        # Cleanup: drop tables, remove data
        pass
    return {"status": "ok"}


# Custom endpoints — accessible via /api/plugins/{PLUGIN_ID}/...
@app.get("/report")
async def get_report():
    return {"data": "example report data"}


@app.post("/analyze")
async def analyze(payload: dict):
    return {"result": "analysis complete", "input": payload}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PLUGIN_PORT)
```

## Example requirements.txt

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
psycopg2-binary>=2.9.0
```

## Reserved Paths

The following sub-paths are reserved by the LMS plugin management API and **must not** be used by your plugin's custom endpoints:

- `/enable` — Used by `POST /api/plugins/{id}/enable`
- `/disable` — Used by `POST /api/plugins/{id}/disable`
- `/config` — Used by `GET/PUT /api/plugins/{id}/config`
- `/logs` — Used by `GET /api/plugins/{id}/logs`

These paths are registered with more specific patterns and take priority over the plugin proxy catch-all route.

## Installation

1. Package your plugin as a ZIP file
2. Upload via the admin API:
   ```bash
   curl -X POST http://localhost:8080/api/learning/api/plugins/install \
     -H "Authorization: Bearer <admin-token>" \
     -F "file=@my-plugin.zip"
   ```
3. The runtime will:
   - Extract to `/data/plugins/python/{pluginId}/`
   - Create a virtualenv and install `requirements.txt`
   - Start the process on an allocated port (9100-9200)
   - Wait for `/health` to respond
   - Call `/lifecycle/install` then `/lifecycle/enable`
   - Register a proxy route

## Troubleshooting

- **Plugin fails health check**: Check that `main.py` starts a web server on `PLUGIN_PORT`
- **Import errors**: Ensure all dependencies are in `requirements.txt`
- **Database connection fails**: Verify `LMS_DB_*` environment variables are being read
- **Endpoint not reachable**: Make sure your endpoint path doesn't conflict with reserved paths
- **Process crashes on start**: Check plugin logs via `GET /api/plugins/{id}/logs`

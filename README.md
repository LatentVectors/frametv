# FrameTV v4

Monorepo for FrameTV image management and TV synchronization.

## Project Structure

- `apps/web` - Next.js frontend (port 3000)
- `apps/sync-service` - FastAPI service for TV synchronization (port 8000)
- `apps/database-service` - FastAPI service for data persistence (port 8001)

## Prerequisites

- Node.js 18+
- Python 3.12+
- npm or yarn

## Setup

### 1. Install root dependencies

```bash
npm install
```

### 2. Setup Python services

For each Python service (`sync-service`, `database-service`):

```bash
cd apps/<service-name>
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
```

### 3. Start all services

From the root directory:

```bash
npm run dev
```

This will start all three services concurrently:
1. Database service (port 8001) - starts first
2. Sync service (port 8000) - waits for database service health check
3. Web frontend (port 3000) - starts independently

### Individual service commands

```bash
# Start all services
npm run dev

# Start individual services
npm run dev:database  # Database service only
npm run dev:sync      # Sync service only
npm run dev:web       # Web frontend only
```

## Development

This project uses Turborepo for monorepo management. Each app has its own `package.json` and can be run independently or together via the root `dev` command.

## Notes

- Python virtual environments should be activated before running `npm run dev`, or ensure Python dependencies are installed globally
- Database service must be healthy before sync service starts (handled automatically via wait-on)
- All services use environment variables for configuration (see individual service READMEs)


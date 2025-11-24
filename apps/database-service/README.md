# Database Service

FastAPI microservice providing REST API for FrameTV data persistence.

## Overview

- **Port:** 8001 (configurable via `DATABASE_SERVICE_PORT` environment variable)
- **Database:** SQLite (`data/frametv.db`)
- **ORM:** SQLModel
- **Migrations:** Alembic

## Development

```bash
# Install dependencies
pip install -e .

# Run development server
python src/main.py

# Or via Turborepo
npm run dev --filter=database-service
```

## Environment Variables

- `DATABASE_SERVICE_PORT` - Service port (default: 8001)
- `DATABASE_URL` - SQLite connection string (default: `sqlite:///../../data/frametv.db`)
- `ALBUMS_PATH` - Path to albums directory (default: `../../data/albums`)
- `DATA_PATH` - Base data directory path (default: `../../data`)

## API Endpoints

- `GET /health` - Health check
- `GET /openapi.json` - OpenAPI specification
- `GET /` - Root endpoint


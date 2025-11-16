# Frame TV Sync Service

A FastAPI service for syncing images to Samsung Frame TV.

## Overview

This service handles the communication with Samsung Frame TVs to:

- Connect and authorize with the TV
- Upload images to Art Mode

## Prerequisites

- Python 3.12 or higher
- Samsung Frame TV (2016+) on the same network
- TV IP address accessible from the computer running this service

## Installation

1. Navigate to the sync service directory:

```bash
cd apps/sync-service
```

2. Create and activate a virtual environment (recommended):

```bash
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install fastapi uvicorn[standard] samsungtvws[async,encrypted] pydantic
```

Alternatively, dependencies are specified in `pyproject.toml` for reference.

## Running the Service

### Option 1: Using Python directly

```bash
python src/main.py
```

### Option 2: Using uvicorn directly

```bash
uvicorn src.main:app --port 8000
```

### Option 3: From project root

```bash
cd apps/sync-service && python src/main.py
# or
uvicorn apps.sync-service.src.main:app --port 8000
```

## Configuration

### Port Configuration

The service runs on port 8000 by default. You can change this by setting the `SYNC_SERVICE_PORT` environment variable:

```bash
SYNC_SERVICE_PORT=8001 python src/main.py
```

## TV Pairing

Before you can sync images to your Samsung Frame TV, you need to pair the sync service with your TV.

### Prerequisites

- Your TV must be on and connected to the same network as your sync service
- You need to know your TV's IP address (find it in TV Settings > General > Network > Network Status)

### Pairing Steps

1. Make sure your TV settings are saved in the web app (Settings page)

2. Run the pairing CLI tool:

   ```bash
   cd apps/sync-service
   python src/pair_tv.py
   ```

   Or specify the IP address directly:

   ```bash
   python src/pair_tv.py --ip 192.168.1.100
   ```

3. Check your TV screen - a PIN will be displayed

4. Enter the PIN in the terminal when prompted

5. If successful, the authentication token will be saved and you can start syncing images

### Troubleshooting

- **"Connection refused"**: Make sure your TV is on and connected to the network
- **"Invalid PIN"**: Run the command again and carefully enter the PIN displayed on your TV
- **TV doesn't show PIN**: Make sure your TV supports the Frame TV features and is connected properly

## API Endpoints

### `GET /`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "service": "Frame TV Sync Service"
}
```

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy"
}
```

### `POST /sync`

Sync images to TV.

**Request Body:**

```json
{
  "image_paths": ["/path/to/image1.jpg", "/path/to/image2.jpg"],
  "ip_address": "192.168.1.100",
  "port": 8002
}
```

**Response:**

```json
{
  "success": true,
  "synced": ["image1.jpg", "image2.jpg"],
  "failed": [],
  "total": 2,
  "successful": 2
}
```

## Token Management

The pairing CLI tool saves the TV authentication token to `../../data/tv_token.txt` (relative to the sync service directory, which resolves to `./data/tv_token.txt` at the project root).

After the first successful pairing, you won't need to enter the PIN again unless the token expires or is deleted. The sync service will automatically use the saved token for all sync operations.

## Error Handling

The service includes comprehensive error handling:

- Connection failures return appropriate error messages
- Failed image uploads are tracked and reported
- Partial sync success is handled gracefully

## Troubleshooting

### Service won't start

- Check that Python 3.12+ is installed
- Verify virtual environment is activated and dependencies are installed
- Check if port 8000 is already in use
- Ensure you're running from the correct directory or using the correct module path (`src.main`)

### Can't connect to TV

- Ensure TV and computer are on the same Wi-Fi network
- Verify TV IP address is correct
- Check TV is powered on and in Art Mode capable state
- Ensure firewall isn't blocking connections

### Pairing fails

- Make sure PIN is entered correctly
- Check that TV is displaying the PIN prompt
- Try deleting `../../data/tv_token.txt` and running the pairing CLI tool again

### Images fail to upload

- Verify image files exist and are readable
- Check image format is supported (JPEG or PNG)
- Ensure TV has sufficient storage space
- Check network connectivity during upload

## Development

### Project Structure

```
sync-service/
├── pyproject.toml      # Python 3.12 requirement and dependencies
├── README.md
├── .venv/              # Virtual environment (gitignored)
└── src/
    ├── main.py         # FastAPI application
    ├── models.py       # Pydantic models
    ├── tv_sync.py      # TV synchronization logic
    └── pair_tv.py      # CLI tool for TV pairing
```

### Dependencies

The service uses:

- **FastAPI** for the web framework
- **samsungtvws** for TV communication
- **Pydantic** for data validation
- **uvicorn** as the ASGI server
- **typer** for CLI interface (pairing tool)

All dependencies are specified in `pyproject.toml` with Python 3.12 requirement.

## Notes

- The service must run on the same machine as the Next.js app (localhost communication)
- Token file is stored at `./data/tv_token.txt` relative to project root
- Both Next.js app and sync service access the shared `./data/` directory

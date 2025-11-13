# Frame TV Sync Service

A FastAPI service for syncing images to Samsung Frame TV.

## Overview

This service handles the communication with Samsung Frame TVs to:
- Connect and authorize with the TV
- Upload images to Art Mode
- Configure slideshow settings

## Prerequisites

- Python 3.12 or higher
- Samsung Frame TV (2016+) on the same network
- TV IP address accessible from the computer running this service

## Installation

1. Navigate to the sync service directory:
```bash
cd apps/sync-service
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Service

### Option 1: Using Python directly
```bash
python main.py
```

### Option 2: Using uvicorn directly
```bash
uvicorn main:app --port 8000
```

### Option 3: From project root
```bash
cd apps/sync-service && python main.py
# or
uvicorn apps.sync-service.main:app --port 8000
```

## Configuration

### Port Configuration

The service runs on port 8000 by default. You can change this by setting the `SYNC_SERVICE_PORT` environment variable:

```bash
SYNC_SERVICE_PORT=8001 python main.py
```

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

### `POST /connect`
Initiate TV connection and check if PIN is required.

**Request Body:**
```json
{
  "ip_address": "192.168.1.100",
  "port": 8002
}
```

**Response:**
```json
{
  "success": true,
  "requires_pin": true,
  "message": "Please enter the PIN displayed on your TV"
}
```

### `POST /authorize`
Complete TV authorization with PIN and save token.

**Request Body:**
```json
{
  "ip_address": "192.168.1.100",
  "port": 8002,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "token_saved": true,
  "message": "Successfully authorized with Frame TV"
}
```

### `POST /sync`
Sync images to TV with specified slideshow timer.

**Request Body:**
```json
{
  "image_paths": [
    "/path/to/image1.jpg",
    "/path/to/image2.jpg"
  ],
  "timer": "15m",
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

The service automatically saves the TV authentication token to `../../data/tv_token.txt` (relative to the sync service directory, which resolves to `./data/tv_token.txt` at the project root).

After the first successful authorization, you won't need to enter the PIN again unless the token expires or is deleted.

### PIN Authorization Note

The `samsungtvws` library handles PIN authorization automatically when the token file doesn't exist. However, the library may require interactive PIN entry via console for the initial authorization. If the `/authorize` endpoint doesn't work programmatically, you may need to:

1. Run a one-time authorization script interactively to generate the token file
2. Once the token file exists, the service will use it automatically for all subsequent connections

The token file will be created automatically after successful authorization and can be reused for future connections.

## Error Handling

The service includes comprehensive error handling:
- Connection failures return appropriate error messages
- Failed image uploads are tracked and reported
- Partial sync success is handled gracefully

## Troubleshooting

### Service won't start
- Check that Python 3.12+ is installed
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use

### Can't connect to TV
- Ensure TV and computer are on the same Wi-Fi network
- Verify TV IP address is correct
- Check TV is powered on and in Art Mode capable state
- Ensure firewall isn't blocking connections

### Authorization fails
- Make sure PIN is entered correctly
- Check that TV is displaying the PIN prompt
- Try deleting `../../data/tv_token.txt` and re-authorizing

### Images fail to upload
- Verify image files exist and are readable
- Check image format is supported (JPEG or PNG)
- Ensure TV has sufficient storage space
- Check network connectivity during upload

## Development

The service uses:
- **FastAPI** for the web framework
- **samsungtvws** for TV communication
- **Pydantic** for data validation
- **uvicorn** as the ASGI server

## Notes

- The service must run on the same machine as the Next.js app (localhost communication)
- Token file is stored at `./data/tv_token.txt` relative to project root
- Both Next.js app and sync service access the shared `./data/` directory


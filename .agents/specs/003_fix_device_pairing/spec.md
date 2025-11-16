We need to fix the pairing process with the device using a CLI tool approach. This is much simpler than managing state over stateless API calls.

# Overview

This sprint replaces the web-based TV pairing workflow with a CLI-based pairing tool. The current implementation attempts to handle pairing through stateless API endpoints, which is problematic because the pairing session needs to remain open between starting the pairing process and entering the PIN. By moving to a CLI tool, we can maintain the session state naturally while the user enters the PIN.

# User Stories

## Story 1: Pair TV Using CLI

**As a** Frame TV user  
**I want to** run a simple CLI command to pair my TV  
**So that** I can authenticate the sync service with my TV without complex web UI interactions

**Acceptance Criteria:**

- User can run `python src/pair_tv.py` from the sync-service directory
- CLI automatically uses TV IP/port from saved settings if available
- User can override IP/port with command-line flags
- TV displays PIN on screen after pairing starts
- User enters PIN in terminal and receives confirmation when successful
- Token is saved to file for future sync operations

## Story 2: View Pairing Status in Web UI

**As a** Frame TV user  
**I want to** see whether my TV is paired on the settings page  
**So that** I know if I need to run the pairing CLI tool

**Acceptance Criteria:**

- Settings page shows "Paired" or "Not Paired" status
- Settings page displays CLI command to run for pairing
- User can still save IP address and port in settings
- No confusing buttons or PIN inputs in the web UI

## Story 3: Simplified Sync Service

**As a** developer  
**I want** the sync service to have a simpler API surface  
**So that** the codebase is easier to maintain and understand

**Acceptance Criteria:**

- `/connect` and `/authorize` endpoints are removed
- Related request/response models are removed
- Unused functions in `tv_sync.py` are removed
- `/sync` endpoint continues to work with saved token

# Implementation Approach

## Library and Architecture

- Create a standalone CLI tool using Typer that uses `SamsungTVEncryptedWSAsyncAuthenticator` for pairing
- The CLI tool runs interactively, keeping the authenticator session open
- Store token only (not session_id) in `../../data/tv_token.txt`
- Use port 8080 for encrypted pairing flow
- Once token is saved, sync service uses port 8002 for standard operations with `SamsungTVWS`
- The `samsungtvws` library already supports the encrypted authenticator (no version updates needed)
- Add `typer` dependency to `pyproject.toml`

## CLI Pairing Tool

Create a new CLI script using Typer that handles the complete pairing workflow:

**CLI Tool: `pair_tv.py`**

- Location: `/apps/sync-service/src/pair_tv.py`
- Uses Typer for CLI interface with proper help text and type validation
- Reads TV settings from `../../data/tv-settings.json` to get IP address and port
- If settings file exists, uses saved `ipAddress` and `port` values
- If settings file doesn't exist or values are missing, prompts user to input them
- Optional `--ip` flag to override saved IP address
- Optional `--port` flag to override saved port (default: 8080)
- Initiates pairing with TV using `SamsungTVEncryptedWSAsyncAuthenticator` on port 8080
- PIN is displayed on TV screen
- User enters PIN into the console (gets one attempt)
- Tool validates PIN and saves token to `../../data/tv_token.txt`
- **Error Handling**: User gets one attempt per pairing session. If PIN is incorrect, the tool exits with error message and user must run it again
- **Mock TV Support**: Skip implementing mock support for the CLI tool (test manually with real TV)

**Settings File Integration:**

- Check if `../../data/tv-settings.json` exists
- If exists, read `ipAddress` and `port` from the JSON file
- Use these values unless overridden by command-line flags
- If file doesn't exist or values are missing, prompt user with Typer's interactive prompts

**Usage Examples:**

```bash
cd apps/sync-service
python src/pair_tv.py  # Uses saved settings or prompts for input
python src/pair_tv.py --ip 192.168.1.100  # Override IP
python src/pair_tv.py --ip 192.168.1.100 --port 8080  # Override both
python src/pair_tv.py --help  # Show help
```

## Sync Service Changes

### Endpoints to Remove

- Remove `/connect` endpoint and related code in `main.py` (no longer needed)
- Remove `/authorize` endpoint and related code in `main.py` (no longer needed)
- Remove `ConnectRequest`, `ConnectResponse`, `AuthorizeRequest`, `AuthorizeResponse` from `models.py`

### Endpoints to Keep

- Keep `/sync` endpoint unchanged (uses existing token with `SamsungTVWS`)
- Keep `/` and `/health` health check endpoints

### Functions to Remove from `tv_sync.py`

- Remove `initiate_connection()` function (replaced by CLI tool)
- Remove `authorize_with_pin()` function (replaced by CLI tool)

### Functions to Keep in `tv_sync.py`

- Keep `get_token_file_path()` (used by CLI tool and sync operations)
- Keep `create_tv_connection()` (used by sync operations)
- Keep `sync_images_to_tv()` (unchanged)

### New Dependency

- Add `typer` to `pyproject.toml` dependencies

### README Updates

- Add section on TV pairing with CLI tool instructions
- Include usage examples and troubleshooting tips

## Web App Changes

### Settings Page UI Updates (`/apps/web/app/settings/page.tsx`)

- Remove "Connect & Authorize" button
- Remove PIN input UI elements (state, input field, authorize button)
- Add informational section showing:
  - Whether TV is paired (token exists)
  - CLI pairing instructions
  - Command to run: `python src/pair_tv.py`
- Keep IP address and port input fields (for saving settings to `tv-settings.json`)
- Keep "Save Settings" button

### Settings API Enhancement (`/apps/web/app/api/settings/route.ts`)

- Update GET endpoint response to include:
  - `isPaired`: boolean (whether token file exists)
  - `pairingInstructions`: string with CLI command
  - `ipAddress`: string (if configured)
  - `port`: number (if configured)

### Routes to Remove

- Remove `/apps/web/app/api/settings/connect/route.ts` (no longer needed)
- Remove `/apps/web/app/api/settings/authorize/route.ts` (no longer needed)

### Routes to Keep

- Keep `/apps/web/app/api/settings/route.ts` (GET and POST endpoints)
- Keep `/apps/web/app/api/settings/check/route.ts` (for checking token status)

# Detailed Implementation

## CLI Tool Implementation (`pair_tv.py`)

The CLI tool should be structured as follows:

### Main Function

```python
import typer
import asyncio
import aiohttp
from pathlib import Path
import json
from typing import Optional
from samsungtvws.encrypted.authenticator import SamsungTVEncryptedWSAsyncAuthenticator

app = typer.Typer()

@app.command()
def main(
    ip: Optional[str] = typer.Option(None, "--ip", "-i", help="TV IP address"),
    port: int = typer.Option(8080, "--port", "-p", help="TV port for pairing")
):
    """Pair with Samsung Frame TV and save authentication token."""
    # Implementation details in example below
```

### Workflow Steps

1. **Load Settings**: Check for `../../data/tv-settings.json`

   - If file exists, parse JSON and read `ipAddress` and `port`
   - If command-line flags provided, they override file values
   - If no IP available, prompt user with `typer.prompt()`

2. **Display Info**: Show user what IP and port will be used

3. **Start Pairing**: Run async pairing function

   - Create `aiohttp.ClientSession`
   - Create `SamsungTVEncryptedWSAsyncAuthenticator` instance
   - Call `await authenticator.start_pairing()`
   - Display success message: "Check your TV screen for the PIN"

4. **Get PIN**: Prompt user to enter PIN from TV

   - Use standard `input()` for PIN entry (one attempt only)

5. **Validate PIN**: Call `await authenticator.try_pin(pin)`

   - If returns token, proceed to save
   - If returns None, raise error and exit

6. **Save Token**: Write token to `../../data/tv_token.txt`

   - Create data directory if it doesn't exist
   - Write token as plain text
   - Display success message with token file path

7. **Cleanup**: Call `await authenticator.get_session_id_and_close()`

### Error Handling

- Catch connection errors (TV not reachable) and display helpful message
- Catch invalid PIN (token is None) and display message: "Invalid PIN. Please run the command again."
- Catch file write errors and display message with path issues
- Use try/except blocks with clear error messages for each failure point

## Data Models

### TV Settings JSON (`data/tv-settings.json`)

```json
{
  "ipAddress": "192.168.1.100",
  "port": 8002,
  "isConfigured": true
}
```

### Token File (`data/tv_token.txt`)

Plain text file containing only the authentication token:

```
<token_string_here>
```

### Enhanced Settings API Response

```typescript
interface TVSettings {
  ipAddress?: string;
  port?: number;
  isConfigured: boolean;
  isPaired: boolean; // New: whether token exists
  pairingInstructions?: string; // New: CLI command to run
}
```

## Files to Create

1. `/apps/sync-service/src/pair_tv.py` - New CLI tool for TV pairing

## Files to Modify

1. `/apps/sync-service/pyproject.toml` - Add `typer` dependency
2. `/apps/sync-service/README.md` - Add pairing instructions
3. `/apps/sync-service/src/main.py` - Remove `/connect` and `/authorize` endpoints
4. `/apps/sync-service/src/models.py` - Remove unused request/response models
5. `/apps/sync-service/src/tv_sync.py` - Remove `initiate_connection()` and `authorize_with_pin()` functions
6. `/apps/web/app/settings/page.tsx` - Update UI to show pairing instructions instead of buttons
7. `/apps/web/app/api/settings/route.ts` - Enhance GET response with `isPaired` and instructions

## Files to Delete

1. `/apps/web/app/api/settings/connect/route.ts` - No longer needed
2. `/apps/web/app/api/settings/authorize/route.ts` - No longer needed

## README Content for Sync Service

Add the following section to `/apps/sync-service/README.md`:

### TV Pairing

Before you can sync images to your Samsung Frame TV, you need to pair the sync service with your TV.

#### Prerequisites

- Your TV must be on and connected to the same network as your sync service
- You need to know your TV's IP address (find it in TV Settings > General > Network > Network Status)

#### Pairing Steps

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

#### Troubleshooting

- **"Connection refused"**: Make sure your TV is on and connected to the network
- **"Invalid PIN"**: Run the command again and carefully enter the PIN displayed on your TV
- **TV doesn't show PIN**: Make sure your TV supports the Frame TV features and is connected properly

# Testing Strategy

DO NOT TEST.

## E2E Test Updates

The existing e2e test (`tv-authorization.spec.ts`) should be removed:

# Technical Details

## Async Pattern in CLI Tool

The CLI tool needs to bridge synchronous Typer commands with async Samsung TV library:

```python
def main(ip: Optional[str] = None, port: int = 8080):
    """Synchronous entry point."""
    asyncio.run(async_main(ip, port))

async def async_main(ip: Optional[str], port: int):
    """Async implementation."""
    # All async TV communication happens here
```

## Settings File Location

The CLI tool runs from `/apps/sync-service/src/` directory, so relative paths:

- Settings: `../../data/tv-settings.json`
- Token: `../../data/tv_token.txt`

The tool should use `Path(__file__).parent.parent.parent / "data"` to ensure correct path resolution.

## Error Messages

The CLI should provide clear, actionable error messages:

- Connection failed: "Could not connect to TV at {ip}:{port}. Please verify the TV is on and connected to the network."
- Invalid PIN: "Invalid PIN. Please run 'python src/pair_tv.py' again to restart the pairing process."
- File write error: "Could not save token to {path}. Please check permissions."

# Rationale and Context

## Why CLI Instead of Web UI

1. **Session State**: The encrypted authenticator requires maintaining a session between `start_pairing()` and `try_pin()`. This is awkward over stateless HTTP APIs.

2. **Simplicity**: A CLI tool is much simpler - no need to manage session storage, no complex state management, no additional API endpoints.

3. **MVP Approach**: For an MVP, a CLI tool is sufficient. Most users setting up a Frame TV sync service are technical enough to run a Python script.

4. **Future Enhancement**: If needed, we can later add a web-based flow using WebSocket connections or session storage, but the CLI will always be the simpler fallback.

## Port Usage

- Port 8080: Used for encrypted pairing (encrypted authenticator)
- Port 8002: Used for standard operations after pairing (regular SamsungTVWS)

The encrypted authenticator uses a different protocol that requires port 8080, while normal art mode operations use port 8002.

# Dependencies and Risks

## Dependencies

- `samsungtvws` library must support `SamsungTVEncryptedWSAsyncAuthenticator` (already confirmed)
- `typer` library for CLI interface (new dependency)
- `aiohttp` library (likely already included via samsungtvws)

## Risks

1. **TV Compatibility**: Not all Samsung TVs may support encrypted pairing. Mitigation: Clear error messages and documentation.

2. **Network Issues**: TVs on different subnets won't be reachable. Mitigation: Include network troubleshooting in README.

3. **Testing Limitation**: No mock support means manual testing required. Mitigation: Clear test cases and acceptance criteria.

## Assumptions

1. Users running the sync service have command-line access to the server
2. Users are comfortable running Python scripts
3. The TV and sync service are on the same network or have network connectivity
4. The `samsungtvws` library's encrypted authenticator works reliably

# Example of Pairing with the Device

```python
import asyncio
import logging
from typing import Optional

import aiohttp

from samsungtvws.encrypted.authenticator import (
    SamsungTVEncryptedWSAsyncAuthenticator,
)

logging.basicConfig(level=logging.DEBUG)

HOST = "1.2.3.4"
PORT = 8080  # Warning: this can be different from the remote port


async def _get_token(
    host: str, web_session: aiohttp.ClientSession, port: int
) -> str:
    authenticator = SamsungTVEncryptedWSAsyncAuthenticator(
        host, web_session=web_session, port=port
    )
    await authenticator.start_pairing()
    token: Optional[str] = None

    # User gets one attempt per pairing session
    pin = input("Please enter pin from tv: ")
    token = await authenticator.try_pin(pin)

    if not token:
        raise Exception("Invalid PIN entered")

    await authenticator.get_session_id_and_close()

    return token


async def main() -> None:
    """Get token."""
    async with aiohttp.ClientSession() as web_session:
        token = await _get_token(HOST, web_session, PORT)
        print(f"Token: '{token}'")
        # Save token to file
        # token_file_path = get_token_file_path()
        # Path(token_file_path).write_text(token)


loop = asyncio.get_event_loop()
loop.run_until_complete(main())
```

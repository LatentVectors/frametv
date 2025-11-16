"""
CLI tool for pairing with Samsung Frame TV.

This tool handles the complete pairing workflow:
1. Loads TV settings from data/tv-settings.json
2. Initiates pairing with TV using encrypted authenticator
3. Prompts user for PIN displayed on TV
4. Validates PIN and saves token to data/tv_token.txt
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Optional

import aiohttp
import typer
from samsungtvws.encrypted.authenticator import SamsungTVEncryptedWSAsyncAuthenticator

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = typer.Typer()


def get_settings_file_path() -> Path:
    """Get path to TV settings file (../../data/tv-settings.json)."""
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent.parent.parent
    return project_root / "data" / "tv-settings.json"


def get_token_file_path() -> Path:
    """Get path to TV token file (../../data/tv_token.txt)."""
    script_dir = Path(__file__).parent.absolute()
    project_root = script_dir.parent.parent.parent
    return project_root / "data" / "tv_token.txt"


def load_settings() -> Optional[dict]:
    """Load TV settings from JSON file."""
    settings_path = get_settings_file_path()
    if not settings_path.exists():
        return None

    try:
        with open(settings_path, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load settings file: {e}")
        return None


async def async_main(ip: Optional[str], port: int):
    """Async implementation of pairing workflow."""
    # Load settings from file
    settings = load_settings()

    # Determine IP address
    tv_ip = ip
    if not tv_ip and settings:
        tv_ip = settings.get("ipAddress")

    # Prompt for IP if still not available
    if not tv_ip:
        tv_ip = typer.prompt("Enter TV IP address")

    # Ensure we have an IP address (type narrowing)
    if not tv_ip:
        typer.echo(
            typer.style("IP address is required", fg=typer.colors.RED),
            err=True,
        )
        raise typer.Exit(code=1)

    # Type assertion: tv_ip is guaranteed to be str at this point
    tv_ip_str: str = tv_ip

    # Use port from CLI (default 8080 for encrypted pairing)
    # Note: Settings file port (8002) is for regular operations, not pairing
    tv_port = port

    # Display info
    typer.echo(f"Pairing with TV at {tv_ip_str}:{tv_port}")

    # Create aiohttp session
    async with aiohttp.ClientSession() as web_session:
        try:
            # Create authenticator
            authenticator = SamsungTVEncryptedWSAsyncAuthenticator(
                tv_ip_str, web_session=web_session, port=tv_port
            )

            # Start pairing
            typer.echo("Starting pairing process...")
            await authenticator.start_pairing()
            typer.echo("✓ Pairing started. Check your TV screen for the PIN.")

            # Get PIN from user
            pin = typer.prompt("Enter PIN displayed on TV", type=str)

            # Validate PIN
            token = await authenticator.try_pin(pin)

            if not token:
                typer.echo(
                    typer.style(
                        "✗ Invalid PIN. Please run 'python src/pair_tv.py' again to restart the pairing process.",
                        fg=typer.colors.RED,
                    ),
                    err=True,
                )
                raise typer.Exit(code=1)

            # Save token
            token_path = get_token_file_path()
            token_path.parent.mkdir(parents=True, exist_ok=True)
            token_path.write_text(token)

            typer.echo(
                typer.style(
                    f"✓ Pairing successful! Token saved to {token_path}",
                    fg=typer.colors.GREEN,
                )
            )

            # Cleanup
            await authenticator.get_session_id_and_close()

        except aiohttp.ClientError as e:
            typer.echo(
                typer.style(
                    f"✗ Could not connect to TV at {tv_ip_str}:{tv_port}. "
                    "Please verify the TV is on and connected to the network.",
                    fg=typer.colors.RED,
                ),
                err=True,
            )
            logger.error(f"Connection error: {e}")
            raise typer.Exit(code=1)
        except Exception as e:
            typer.echo(
                typer.style(
                    f"✗ Error during pairing: {str(e)}",
                    fg=typer.colors.RED,
                ),
                err=True,
            )
            logger.error(f"Pairing error: {e}")
            raise typer.Exit(code=1)


@app.command()
def main(
    ip: Optional[str] = typer.Option(None, "--ip", "-i", help="TV IP address"),
    port: int = typer.Option(
        8080, "--port", "-p", help="TV port for pairing (default: 8080)"
    ),
):
    """Pair with Samsung Frame TV and save authentication token."""
    asyncio.run(async_main(ip, port))


if __name__ == "__main__":
    app()

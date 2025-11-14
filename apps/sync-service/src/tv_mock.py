"""
Mock TV responses for testing without a physical TV.

This module provides mock implementations of SamsungTVWS to prevent
accidental connections to real TVs during testing.
"""

import os
import logging
from typing import Optional, Dict, Any
from unittest.mock import Mock, MagicMock

logger = logging.getLogger(__name__)

# Mock scenarios
MOCK_SCENARIO = os.getenv("MOCK_TV_SCENARIO", "success_with_pin")

# Class-level tracker for PIN error state (shared across instances)
_pin_error_raised_global = False
# Track when authorize_with_pin is running so we can allow the next connection
# attempt to succeed without re-triggering PIN flow.
_authorization_in_progress = False


class MockSamsungTVWS:
    """
    Mock implementation of SamsungTVWS for testing.

    Supports multiple scenarios:
    - success_no_pin: Connection succeeds without PIN requirement
    - success_with_pin: Connection requires PIN, then succeeds
    - pin_required: Connection requires PIN
    - auth_failure: Authorization fails
    - connection_error: Connection fails
    """

    def __init__(self, host: str, port: int = 8002, token_file: Optional[str] = None):
        """Initialize mock TV connection."""
        global _pin_error_raised_global

        self.host = host
        self.port = port
        self.token_file = token_file
        self._scenario = MOCK_SCENARIO
        self._token_saved = False

        # Don't reset PIN error state here - it's managed in rest_device_info()
        # Resetting here breaks the authorization flow when authorize_with_pin
        # removes the token file before creating a new instance

        # Create mock art object
        self._art_mock = MagicMock()
        self._art_mock.set_artmode = Mock(return_value=None)
        self._art_mock.upload = Mock(return_value=None)

        logger.info(f"Mock TV initialized: {host}:{port} (scenario: {self._scenario})")

    def rest_device_info(self) -> Dict[str, Any]:
        """
        Mock device info response.

        Behavior depends on scenario:
        - success_no_pin: Returns device info immediately
        - success_with_pin: First call raises PIN error, subsequent calls succeed
        - pin_required: Always raises PIN error
        - auth_failure: Raises authorization error
        - connection_error: Raises connection error
        """
        if self._scenario == "success_no_pin":
            # Check if token file exists - if not, create it
            if self.token_file and not self._token_saved:
                self._simulate_token_save()
            return {
                "device": {
                    "name": "Mock Samsung Frame TV",
                    "model": "Mock Model",
                }
            }

        elif self._scenario == "success_with_pin":
            global _pin_error_raised_global, _authorization_in_progress

            if _authorization_in_progress:
                # Authorization flow is running - simulate token save and succeed
                self._simulate_token_save()
                _authorization_in_progress = False
                _pin_error_raised_global = False
                return {
                    "device": {
                        "name": "Mock Samsung Frame TV",
                        "model": "Mock Model",
                    }
                }

            # Check if token file exists
            if self.token_file:
                from pathlib import Path

                token_path = Path(self.token_file)

                if token_path.exists():
                    # Token exists, authorization already succeeded
                    self._token_saved = True
                elif _pin_error_raised_global:
                    # PIN error was raised before (from initiate_connection),
                    # now simulate successful authorization
                    # This happens when authorize_with_pin calls rest_device_info() after PIN provided
                    # Note: authorize_with_pin removes the token file first, so we check the global flag
                    self._simulate_token_save()
                    _pin_error_raised_global = False  # Reset for next test
                else:
                    # First call, no token - require PIN
                    _pin_error_raised_global = True
                    raise Exception("PIN authorization required")
            else:
                if not _pin_error_raised_global:
                    _pin_error_raised_global = True
                    raise Exception("PIN authorization required")
                # If PIN error was raised and no token_file, still succeed (for testing)
                self._token_saved = True
                _pin_error_raised_global = False  # Reset

            # Connection succeeds
            return {
                "device": {
                    "name": "Mock Samsung Frame TV",
                    "model": "Mock Model",
                }
            }

        elif self._scenario == "pin_required":
            raise Exception("PIN authorization required")

        elif self._scenario == "auth_failure":
            raise Exception("Authorization failed: Invalid PIN")

        elif self._scenario == "connection_error":
            raise ConnectionError("Connection refused")

        else:
            # Default: require PIN
            raise Exception("PIN authorization required")

    def art(self):
        """Return mock art object."""
        return self._art_mock

    def _simulate_token_save(self):
        """Simulate saving token file after successful authorization."""
        if self.token_file:
            # Create directory if it doesn't exist
            from pathlib import Path

            token_path = Path(self.token_file)
            token_path.parent.mkdir(parents=True, exist_ok=True)

            # Write mock token
            token_path.write_text("mock_token_data")
            self._token_saved = True
            logger.info(f"Mock token saved to {self.token_file}")

    def __enter__(self):
        """Context manager support."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager support."""
        pass


def setup_tv_mock():
    """
    Set up TV mocking by patching SamsungTVWS.

    This function should be called at module import time when MOCK_TV=true.
    """
    mock_tv_enabled = os.getenv("MOCK_TV", "").lower() == "true"

    if not mock_tv_enabled:
        # Safety check: if we're in a test environment but MOCK_TV is not set,
        # raise an error to prevent accidental real TV connections
        if os.getenv("PLAYWRIGHT_TEST", "").lower() == "true":
            raise RuntimeError(
                "MOCK_TV=true must be set in test environment to prevent "
                "accidental real TV connections. This is a safety requirement."
            )
        return False

    try:
        import samsungtvws

        # Patch the SamsungTVWS class with our mock
        samsungtvws.SamsungTVWS = MockSamsungTVWS
        logger.info("TV mocking enabled: SamsungTVWS patched with MockSamsungTVWS")
        return True
    except ImportError:
        logger.warning("Could not import samsungtvws - mocking not applied")
        return False


def set_mock_scenario(scenario: str):
    """
    Set the mock scenario for testing.

    Args:
        scenario: One of: success_no_pin, success_with_pin, pin_required,
                  auth_failure, connection_error
    """
    global MOCK_SCENARIO, _pin_error_raised_global
    MOCK_SCENARIO = scenario
    _pin_error_raised_global = False  # Reset PIN error state
    logger.info(f"Mock scenario set to: {scenario}")


def reset_mock_state():
    """Reset mock state between tests."""
    global _pin_error_raised_global, _authorization_in_progress
    _pin_error_raised_global = False
    _authorization_in_progress = False


def start_authorization_flow():
    """Flag that authorize_with_pin is in progress."""
    global _authorization_in_progress
    _authorization_in_progress = True

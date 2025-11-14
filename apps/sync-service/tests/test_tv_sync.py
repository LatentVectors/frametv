"""
Comprehensive unit tests for TV synchronization functions.
All network requests are mocked to prevent actual TV communication.
"""

from unittest.mock import Mock, patch
from pathlib import Path
import tempfile
import os

from src.tv_sync import (
    get_token_file_path,
    create_tv_connection,
    sync_images_to_tv,
    initiate_connection,
    authorize_with_pin,
)


class TestInitiateConnection:
    """Test suite for initiate_connection function."""

    @patch("src.tv_sync.create_tv_connection")
    def test_successful_connection_no_pin_required(self, mock_create_tv):
        """Test successful connection when PIN is not required."""
        # Setup mock TV instance
        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Samsung Frame TV"}}
        mock_create_tv.return_value = mock_tv

        # Execute
        success, requires_pin, message = initiate_connection("192.168.1.100")

        # Assert
        assert success is True
        assert requires_pin is False
        assert "Samsung Frame TV" in message
        mock_create_tv.assert_called_once_with("192.168.1.100", 8002)
        mock_tv.rest_device_info.assert_called_once()

    @patch("src.tv_sync.create_tv_connection")
    def test_successful_connection_custom_port(self, mock_create_tv):
        """Test successful connection with custom port."""
        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "My TV"}}
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100", port=9000)

        assert success is True
        assert requires_pin is False
        mock_create_tv.assert_called_once_with("192.168.1.100", 9000)

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_requires_pin_error_message(self, mock_create_tv):
        """Test that PIN requirement is detected from error message containing 'pin'."""
        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception(
            "PIN required for authentication"
        )
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is True
        assert requires_pin is True
        assert "PIN" in message or "pin" in message.lower()

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_requires_pin_authorization_error(self, mock_create_tv):
        """Test that PIN requirement is detected from authorization error."""
        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Authorization failed")
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is True
        assert requires_pin is True

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_requires_pin_token_error(self, mock_create_tv):
        """Test that PIN requirement is detected from token error."""
        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Invalid token")
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is True
        assert requires_pin is True

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_failure_non_pin_error(self, mock_create_tv):
        """Test connection failure with non-PIN related error."""
        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Network timeout")
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is False
        assert requires_pin is False
        assert "Failed to connect" in message
        assert "Network timeout" in message

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_failure_connection_refused(self, mock_create_tv):
        """Test connection failure when TV refuses connection."""
        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = ConnectionError("Connection refused")
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is False
        assert requires_pin is False
        assert "Failed to connect" in message

    @patch("src.tv_sync.create_tv_connection")
    def test_connection_failure_tv_creation_error(self, mock_create_tv):
        """Test failure when TV connection cannot be created."""
        mock_create_tv.side_effect = Exception("Cannot resolve host")

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is False
        assert requires_pin is False
        assert "Connection error" in message
        assert "Cannot resolve host" in message

    @patch("src.tv_sync.create_tv_connection")
    def test_device_info_missing_name(self, mock_create_tv):
        """Test handling when device info doesn't contain name."""
        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {}}
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is True
        assert requires_pin is False
        assert "Unknown" in message or "Connected" in message

    @patch("src.tv_sync.create_tv_connection")
    def test_device_info_empty_response(self, mock_create_tv):
        """Test handling when device info returns empty dict."""
        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {}
        mock_create_tv.return_value = mock_tv

        success, requires_pin, message = initiate_connection("192.168.1.100")

        assert success is True
        assert requires_pin is False


class TestAuthorizeWithPin:
    """Test suite for authorize_with_pin function."""

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_successful_authorization_token_saved(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test successful authorization when token is saved."""
        # Setup mocks
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = (
            False  # Token file doesn't exist initially
        )
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Samsung Frame TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        # Token file exists after authorization
        mock_os_exists.return_value = True

        # Execute
        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        # Assert
        assert success is True
        assert token_saved is True
        assert "Samsung Frame TV" in message or "authorized" in message.lower()
        mock_samsungtvws_class.assert_called_once()
        mock_tv.rest_device_info.assert_called_once()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_successful_authorization_existing_token_removed(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test authorization removes existing token file before re-authorization."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = True  # Token file exists
        mock_token_path.unlink = Mock()
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "My TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        mock_os_exists.return_value = True

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "5678"
        )

        assert success is True
        assert token_saved is True
        mock_token_path.unlink.assert_called_once()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_success_but_token_not_saved(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test connection succeeds but token file is not created."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Test TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        # Token file doesn't exist after connection
        mock_os_exists.return_value = False

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is True
        assert token_saved is False
        assert "token not saved" in message.lower() or "not saved" in message.lower()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_pin_error_detected(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test PIN authorization error is properly detected."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("PIN authorization required")
        mock_samsungtvws_class.return_value = mock_tv

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "PIN" in message or "pin" in message.lower()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_authorization_error(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test authorization error detection."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Authorization failed")
        mock_samsungtvws_class.return_value = mock_tv

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "authorization" in message.lower() or "PIN" in message

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_token_error(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test token error detection."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Invalid token")
        mock_samsungtvws_class.return_value = mock_tv

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "PIN" in message or "authorization" in message.lower()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_non_pin_error(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test non-PIN related error handling."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = Exception("Network error")
        mock_samsungtvws_class.return_value = mock_tv

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "Authorization failed" in message
        assert "Network error" in message

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_connection_error(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test error when SamsungTVWS cannot be instantiated."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_samsungtvws_class.side_effect = Exception("Connection refused")

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "Authorization error" in message
        assert "Connection refused" in message

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_custom_port(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test authorization with custom port."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Custom TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        mock_os_exists.return_value = True

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 9000, "1234"
        )

        assert success is True
        assert token_saved is True
        # Verify port was passed correctly
        call_args = mock_samsungtvws_class.call_args
        assert call_args[1]["port"] == 9000 or call_args[0][1] == 9000

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_token_file_directory_creation(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test that token file directory is created if it doesn't exist."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent = Mock()
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Test TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        mock_os_exists.return_value = True

        authorize_with_pin("192.168.1.100", 8002, "1234")

        mock_token_path.parent.mkdir.assert_called_once_with(
            parents=True, exist_ok=True
        )

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_empty_pin(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test authorization with empty PIN string."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {"name": "Test TV"}}
        mock_samsungtvws_class.return_value = mock_tv

        mock_os_exists.return_value = True

        success, token_saved, message = authorize_with_pin("192.168.1.100", 8002, "")

        # Function should still attempt authorization
        assert mock_samsungtvws_class.called
        mock_tv.rest_device_info.assert_called_once()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_device_info_missing_name(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test authorization when device info doesn't contain name."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.return_value = {"device": {}}
        mock_samsungtvws_class.return_value = mock_tv

        mock_os_exists.return_value = True

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is True
        assert token_saved is True
        assert "Unknown" in message or "authorized" in message.lower()

    @patch("src.tv_sync.os.path.exists")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.Path")
    @patch("src.tv_sync.SamsungTVWS")
    def test_authorization_timeout_error(
        self,
        mock_samsungtvws_class,
        mock_path_class,
        mock_get_token_file_path,
        mock_os_exists,
    ):
        """Test handling of timeout errors during authorization."""
        mock_get_token_file_path.return_value = "/fake/path/tv_token.txt"

        mock_token_path = Mock(spec=Path)
        mock_token_path.exists.return_value = False
        mock_token_path.parent.mkdir = Mock()
        mock_path_class.return_value = mock_token_path

        mock_tv = Mock()
        mock_tv.rest_device_info.side_effect = TimeoutError("Request timed out")
        mock_samsungtvws_class.return_value = mock_tv

        success, token_saved, message = authorize_with_pin(
            "192.168.1.100", 8002, "1234"
        )

        assert success is False
        assert token_saved is False
        assert "Authorization failed" in message or "timed out" in message.lower()


class TestGetTokenFilePath:
    """Test suite for get_token_file_path function."""

    @patch("src.tv_sync.Path")
    def test_token_file_path_resolution(self, mock_path_class):
        """Test that token file path is correctly resolved relative to script location."""
        # Setup mock Path
        mock_script_path = Mock()
        mock_script_path.parent = Mock()
        mock_script_path.parent.absolute.return_value = Path(
            "/fake/apps/sync-service/src"
        )
        mock_script_path.parent.parent.parent = Path("/fake/data")

        # Create a real Path mock that chains properly
        mock_script_dir = Mock()
        mock_script_dir.parent.parent = Mock()
        mock_project_root = Mock()
        mock_project_root.__truediv__ = Mock(
            return_value=Mock(__truediv__=Mock(return_value="/fake/data/tv_token.txt"))
        )

        # Simulate the path chain
        def path_side_effect(*args, **kwargs):
            if args[0] == "__file__":
                result = Mock()
                result.parent.absolute.return_value = Path(
                    "/fake/apps/sync-service/src"
                )
                return result
            return Path(*args, **kwargs)

        mock_path_class.side_effect = path_side_effect

        # Execute
        result = get_token_file_path()

        # Assert - should resolve to project_root/data/tv_token.txt
        assert isinstance(result, str)
        assert "tv_token.txt" in result or "data" in result

    def test_token_file_path_actual_resolution(self):
        """Test actual path resolution using real Path objects."""
        # This test uses real Path resolution to verify the logic
        result = get_token_file_path()

        # Should be a string
        assert isinstance(result, str)

        # Should contain tv_token.txt
        assert result.endswith("tv_token.txt")

        # Should contain data directory
        assert "data" in result


class TestCreateTvConnection:
    """Test suite for create_tv_connection function."""

    @patch("src.tv_sync.SamsungTVWS")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.logger")
    def test_create_connection_default_port(
        self, mock_logger, mock_get_token_path, mock_samsungtvws
    ):
        """Test creating TV connection with default port."""
        # Setup
        mock_get_token_path.return_value = "/fake/data/tv_token.txt"
        mock_tv = Mock()
        mock_samsungtvws.return_value = mock_tv

        # Execute
        result = create_tv_connection("192.168.1.100")

        # Assert
        assert result == mock_tv
        mock_samsungtvws.assert_called_once_with(
            host="192.168.1.100", port=8002, token_file="/fake/data/tv_token.txt"
        )
        mock_get_token_path.assert_called_once()
        mock_logger.info.assert_called_once()

    @patch("src.tv_sync.SamsungTVWS")
    @patch("src.tv_sync.get_token_file_path")
    @patch("src.tv_sync.logger")
    def test_create_connection_custom_port(
        self, mock_logger, mock_get_token_path, mock_samsungtvws
    ):
        """Test creating TV connection with custom port."""
        # Setup
        mock_get_token_path.return_value = "/fake/data/tv_token.txt"
        mock_tv = Mock()
        mock_samsungtvws.return_value = mock_tv

        # Execute
        result = create_tv_connection("192.168.1.100", port=9000)

        # Assert
        assert result == mock_tv
        mock_samsungtvws.assert_called_once_with(
            host="192.168.1.100", port=9000, token_file="/fake/data/tv_token.txt"
        )

    @patch("src.tv_sync.SamsungTVWS")
    @patch("src.tv_sync.get_token_file_path")
    def test_create_connection_uses_token_file_path(
        self, mock_get_token_path, mock_samsungtvws
    ):
        """Test that create_tv_connection uses get_token_file_path."""
        # Setup
        mock_get_token_path.return_value = "/custom/path/token.txt"
        mock_tv = Mock()
        mock_samsungtvws.return_value = mock_tv

        # Execute
        create_tv_connection("10.0.0.1")

        # Assert
        mock_get_token_path.assert_called_once()
        call_kwargs = mock_samsungtvws.call_args[1]
        assert call_kwargs["token_file"] == "/custom/path/token.txt"


class TestSyncImagesToTv:
    """Test suite for sync_images_to_tv function."""

    @patch("src.tv_sync.create_tv_connection")
    def test_successful_sync_single_image_jpeg(self, mock_create_tv):
        """Test successful sync of a single JPEG image."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is True
            assert len(synced) == 1
            assert synced[0] == os.path.basename(tmp_path)
            assert len(failed) == 0
            assert total == 1
            assert successful_count == 1

            mock_create_tv.assert_called_once_with("192.168.1.100", 8002)
            mock_tv.art.assert_called()
            mock_art.set_artmode.assert_called_once_with(True)
            mock_art.upload.assert_called_once()

            # Verify upload was called with correct parameters
            upload_call = mock_art.upload.call_args
            assert upload_call[1]["file_type"] == "JPEG"
            assert upload_call[1]["matte"] == "none"
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_successful_sync_single_image_png(self, mock_create_tv):
        """Test successful sync of a single PNG image."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
            tmp_file.write(b"fake png data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is True
            assert len(synced) == 1
            assert synced[0] == os.path.basename(tmp_path)
            assert len(failed) == 0
            assert total == 1
            assert successful_count == 1

            # Verify upload was called with PNG file type
            upload_call = mock_art.upload.call_args
            assert upload_call[1]["file_type"] == "PNG"
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_successful_sync_multiple_images(self, mock_create_tv):
        """Test successful sync of multiple images."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image files
        tmp_paths = []
        try:
            for i in range(3):
                with tempfile.NamedTemporaryFile(
                    suffix=".jpg", delete=False
                ) as tmp_file:
                    tmp_file.write(b"fake jpeg data")
                    tmp_paths.append(tmp_file.name)

            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                tmp_paths, "192.168.1.100"
            )

            # Assert
            assert success is True
            assert len(synced) == 3
            assert len(failed) == 0
            assert total == 3
            assert successful_count == 3

            # Verify upload was called 3 times
            assert mock_art.upload.call_count == 3
        finally:
            for tmp_path in tmp_paths:
                os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_file_not_found(self, mock_create_tv):
        """Test handling of file not found error."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Execute with non-existent file
        success, synced, failed, total, successful_count = sync_images_to_tv(
            ["/nonexistent/path/image.jpg"], "192.168.1.100"
        )

        # Assert
        assert success is False
        assert len(synced) == 0
        assert len(failed) == 1
        assert failed[0]["filename"] == "image.jpg"
        assert "not found" in failed[0]["error"].lower()
        assert total == 1
        assert successful_count == 0

        # Upload should not be called
        mock_art.upload.assert_not_called()

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_unsupported_file_type(self, mock_create_tv):
        """Test handling of unsupported file type."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary file with unsupported extension
        with tempfile.NamedTemporaryFile(suffix=".gif", delete=False) as tmp_file:
            tmp_file.write(b"fake gif data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is False
            assert len(synced) == 0
            assert len(failed) == 1
            assert failed[0]["filename"] == os.path.basename(tmp_path)
            assert "unsupported" in failed[0]["error"].lower()
            assert total == 1
            assert successful_count == 0

            # Upload should not be called
            mock_art.upload.assert_not_called()
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_upload_error(self, mock_create_tv):
        """Test handling of upload error."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_art.upload.side_effect = Exception("Upload failed")
        mock_create_tv.return_value = mock_tv

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is False
            assert len(synced) == 0
            assert len(failed) == 1
            assert failed[0]["filename"] == os.path.basename(tmp_path)
            assert "Upload failed" in failed[0]["error"]
            assert total == 1
            assert successful_count == 0
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_partial_success(self, mock_create_tv):
        """Test sync with partial success (some images succeed, some fail)."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art

        # Track call count
        call_count = [0]

        # First upload succeeds, second fails
        def upload_side_effect(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return None  # Success
            else:
                raise Exception("Upload failed")

        mock_art.upload.side_effect = upload_side_effect
        mock_create_tv.return_value = mock_tv

        # Create temporary image files
        tmp_paths = []
        try:
            for i in range(2):
                with tempfile.NamedTemporaryFile(
                    suffix=".jpg", delete=False
                ) as tmp_file:
                    tmp_file.write(b"fake jpeg data")
                    tmp_paths.append(tmp_file.name)

            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                tmp_paths, "192.168.1.100"
            )

            # Assert - should be successful overall since at least one image succeeded
            assert success is True
            assert len(synced) == 1
            assert len(failed) == 1
            assert total == 2
            assert successful_count == 1
        finally:
            for tmp_path in tmp_paths:
                os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_art_mode_error_does_not_fail(self, mock_create_tv):
        """Test that Art Mode error doesn't fail the entire operation."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_art.set_artmode.side_effect = Exception("Art Mode error")
        mock_create_tv.return_value = mock_tv

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert - should still succeed despite Art Mode error
            assert success is True
            assert len(synced) == 1
            assert len(failed) == 0
            # Upload should still be called
            mock_art.upload.assert_called_once()
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_no_images_synced(self, mock_create_tv):
        """Test that no images are synced when file doesn't exist."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Execute with non-existent file
        success, synced, failed, total, successful_count = sync_images_to_tv(
            ["/nonexistent/image.jpg"], "192.168.1.100"
        )

        # Assert
        assert success is False
        assert len(synced) == 0

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_connection_error(self, mock_create_tv):
        """Test handling of connection creation error."""
        # Setup mocks
        mock_create_tv.side_effect = Exception("Connection failed")

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is False
            assert len(synced) == 0
            assert len(failed) == 1
            assert failed[0]["filename"] == os.path.basename(tmp_path)
            assert "Connection failed" in failed[0]["error"]
            assert total == 1
            assert successful_count == 0
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_custom_port(self, mock_create_tv):
        """Test sync with custom port."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100", port=9000
            )

            # Assert
            assert success is True
            mock_create_tv.assert_called_once_with("192.168.1.100", 9000)
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_jpeg_case_insensitive(self, mock_create_tv):
        """Test that JPEG extension is recognized case-insensitively."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file with uppercase extension
        with tempfile.NamedTemporaryFile(suffix=".JPG", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is True
            assert len(synced) == 1
            assert len(failed) == 0

            # Verify upload was called with JPEG file type
            upload_call = mock_art.upload.call_args
            assert upload_call[1]["file_type"] == "JPEG"
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_jpeg_extension_variant(self, mock_create_tv):
        """Test that .jpeg extension (not just .jpg) is recognized."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file with .jpeg extension
        with tempfile.NamedTemporaryFile(suffix=".jpeg", delete=False) as tmp_file:
            tmp_file.write(b"fake jpeg data")
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is True
            assert len(synced) == 1
            assert len(failed) == 0

            # Verify upload was called with JPEG file type
            upload_call = mock_art.upload.call_args
            assert upload_call[1]["file_type"] == "JPEG"
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_reads_image_data(self, mock_create_tv):
        """Test that image data is correctly read from file."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Create temporary image file with specific content
        test_data = b"test image data content"
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
            tmp_file.write(test_data)
            tmp_path = tmp_file.name

        try:
            # Execute
            success, synced, failed, total, successful_count = sync_images_to_tv(
                [tmp_path], "192.168.1.100"
            )

            # Assert
            assert success is True
            # Verify upload was called with the image data
            upload_call = mock_art.upload.call_args
            assert upload_call[0][0] == test_data  # First positional arg is image_data
        finally:
            os.unlink(tmp_path)

    @patch("src.tv_sync.create_tv_connection")
    def test_sync_empty_image_list(self, mock_create_tv):
        """Test sync with empty image list."""
        # Setup mocks
        mock_tv = Mock()
        mock_art = Mock()
        mock_tv.art.return_value = mock_art
        mock_create_tv.return_value = mock_tv

        # Execute
        success, synced, failed, total, successful_count = sync_images_to_tv(
            [], "192.168.1.100"
        )

        # Assert
        assert success is False
        assert len(synced) == 0
        assert len(failed) == 0
        assert total == 0
        assert successful_count == 0

        # Art mode should still be set
        mock_art.set_artmode.assert_called_once()
        # But no uploads
        mock_art.upload.assert_not_called()

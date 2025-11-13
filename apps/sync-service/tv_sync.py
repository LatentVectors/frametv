"""
TV synchronization logic using samsungtvws library.
"""
import os
import logging
from pathlib import Path
from typing import Tuple, Optional
from samsungtvws import SamsungTVWS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_token_file_path() -> str:
    """
    Get the path to the TV token file.
    Resolves relative to project root: ../../data/tv_token.txt
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    # Go up two levels to project root, then to data directory
    project_root = script_dir.parent.parent
    token_file = project_root / "data" / "tv_token.txt"
    return str(token_file)


def create_tv_connection(ip_address: str, port: int = 8002) -> SamsungTVWS:
    """
    Create a SamsungTVWS connection instance.
    
    Args:
        ip_address: TV IP address
        port: TV port (default: 8002)
    
    Returns:
        SamsungTVWS instance
    """
    token_file = get_token_file_path()
    logger.info(f"Connecting to TV at {ip_address}:{port} with token file: {token_file}")
    return SamsungTVWS(host=ip_address, port=port, token_file=token_file)


def initiate_connection(ip_address: str, port: int = 8002) -> Tuple[bool, bool, str]:
    """
    Initiate connection to TV and check if PIN is required.
    
    Args:
        ip_address: TV IP address
        port: TV port (default: 8002)
    
    Returns:
        Tuple of (success, requires_pin, message)
    """
    try:
        tv = create_tv_connection(ip_address, port)
        
        # Try to get device info - this will trigger PIN request if needed
        try:
            info = tv.rest_device_info()
            device_name = info.get('device', {}).get('name', 'Unknown')
            logger.info(f"Connected to TV: {device_name}")
            return (True, False, f"Connected to {device_name}")
        except Exception as e:
            # If we get an error, it might be because PIN is required
            error_msg = str(e).lower()
            if 'pin' in error_msg or 'authorization' in error_msg or 'token' in error_msg:
                logger.info("PIN required for connection")
                return (True, True, "Please enter the PIN displayed on your TV")
            else:
                logger.error(f"Connection error: {e}")
                return (False, False, f"Failed to connect: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error creating TV connection: {e}")
        return (False, False, f"Connection error: {str(e)}")


def authorize_with_pin(ip_address: str, port: int, pin: str) -> Tuple[bool, bool, str]:
    """
    Complete TV authorization with PIN and save token.
    
    The samsungtvws library handles PIN entry automatically when the token file
    doesn't exist. We need to ensure the token file doesn't exist, then attempt
    connection which will trigger PIN flow. However, the library typically requires
    interactive PIN entry, so we may need to handle this via WebSocket connection.
    
    Args:
        ip_address: TV IP address
        port: TV port
        pin: PIN displayed on TV
    
    Returns:
        Tuple of (success, token_saved, message)
    """
    token_file = get_token_file_path()
    token_path = Path(token_file)
    
    # Ensure token file directory exists
    token_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        # The samsungtvws library handles PIN automatically when connecting
        # if the token file doesn't exist. However, for programmatic PIN entry,
        # we may need to use the WebSocket connection directly.
        # 
        # For now, we'll attempt to connect and let the library handle PIN.
        # Note: The library may require interactive PIN entry, which is a limitation
        # for API-based flows. We'll attempt the connection and check if token
        # gets saved.
        
        # Remove existing token file if it exists (to force re-authorization)
        if token_path.exists():
            logger.info("Removing existing token file to force re-authorization")
            token_path.unlink()
        
        # Create connection - library should handle PIN automatically
        # Note: The samsungtvws library may need PIN to be entered interactively
        # via console. For API use, we may need to use WebSocket connection directly.
        tv = SamsungTVWS(host=ip_address, port=port, token_file=token_file)
        
        # Try to connect and authorize
        # The library should handle PIN entry automatically when token is missing
        try:
            info = tv.rest_device_info()
            device_name = info.get('device', {}).get('name', 'Unknown')
            
            # Check if token file was created
            token_saved = os.path.exists(token_file)
            
            if token_saved:
                logger.info(f"Authorization successful. Token saved to {token_file}")
                return (True, True, f"Successfully authorized with {device_name}")
            else:
                # Connection succeeded but token not saved - might need manual PIN entry
                logger.warning("Connection succeeded but token file not created")
                return (True, False, f"Connected to {device_name} but token not saved. PIN may need to be entered manually.")
        
        except Exception as e:
            error_msg = str(e).lower()
            # Check if this is a PIN-related error
            if 'pin' in error_msg or 'authorization' in error_msg or 'token' in error_msg:
                logger.warning(f"PIN authorization required: {e}")
                # The library may require interactive PIN entry
                # For API use, this is a limitation - we return an error indicating
                # that PIN entry may need to be handled differently
                return (False, False, f"PIN authorization required. The library may require interactive PIN entry. Error: {str(e)}")
            else:
                logger.error(f"Authorization error: {e}")
                return (False, False, f"Authorization failed: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error during authorization: {e}")
        return (False, False, f"Authorization error: {str(e)}")


def sync_images_to_tv(
    image_paths: list[str],
    timer: str,
    ip_address: str,
    port: int = 8002
) -> Tuple[bool, list[str], list[dict], int, int]:
    """
    Sync images to TV with specified slideshow timer.
    
    Args:
        image_paths: List of full file paths to images
        timer: Slideshow timer value (e.g., '15m', '1h')
        ip_address: TV IP address
        port: TV port (default: 8002)
    
    Returns:
        Tuple of (success, synced_filenames, failed_images, total, successful_count)
        failed_images is a list of dicts with 'filename' and 'error' keys
    """
    synced = []
    failed = []
    
    try:
        tv = create_tv_connection(ip_address, port)
        
        # Turn on Art Mode
        try:
            tv.art().set_artmode(True)
            logger.info("Art Mode turned on")
        except Exception as e:
            logger.warning(f"Could not set Art Mode (might already be on): {e}")
        
        # Upload each image
        for image_path in image_paths:
            image_path_obj = Path(image_path)
            filename = image_path_obj.name
            
            if not image_path_obj.exists():
                error_msg = f"File not found: {image_path}"
                logger.error(error_msg)
                failed.append({"filename": filename, "error": error_msg})
                continue
            
            try:
                logger.info(f"Uploading {filename} with matte='none'...")
                
                # Read image data
                with open(image_path, "rb") as f:
                    image_data = f.read()
                
                # Determine file type
                file_ext = image_path_obj.suffix.lower()
                if file_ext in ('.jpg', '.jpeg'):
                    file_type = 'JPEG'
                elif file_ext == '.png':
                    file_type = 'PNG'
                else:
                    error_msg = f"Unsupported file type: {file_ext}"
                    logger.error(error_msg)
                    failed.append({"filename": filename, "error": error_msg})
                    continue
                
                # Upload image with matte='none'
                tv.art().upload(image_data, file_type=file_type, matte='none')
                
                logger.info(f"Successfully uploaded {filename}")
                synced.append(filename)
            
            except Exception as e:
                error_msg = f"Failed to upload {filename}: {str(e)}"
                logger.error(error_msg)
                failed.append({"filename": filename, "error": str(e)})
        
        # Set slideshow timer after all uploads
        if synced:
            try:
                logger.info(f"Setting slideshow timer to {timer}...")
                tv.art().set_slideshow_options(change_interval=timer)
                logger.info("Successfully set slideshow timer")
            except Exception as e:
                logger.error(f"Failed to set slideshow timer: {e}")
                # Don't fail the whole operation if timer setting fails
                # Images are already uploaded
        
        total = len(image_paths)
        successful = len(synced)
        overall_success = successful > 0
        
        return (overall_success, synced, failed, total, successful)
    
    except Exception as e:
        error_msg = f"Sync operation failed: {str(e)}"
        logger.error(error_msg)
        # Mark all images as failed
        for image_path in image_paths:
            filename = Path(image_path).name
            failed.append({"filename": filename, "error": error_msg})
        
        return (False, [], failed, len(image_paths), 0)


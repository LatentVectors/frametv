import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { ensureDataDirectories, getAlbumsDirectory } from "@/lib/dataUtils";

// Supported image file extensions (case-insensitive)
// Includes common variations (e.g., .jpg/.jpeg, .tif/.tiff)
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
  ".heic",
  ".heif",
];

// Check if file has valid image extension (case-insensitive)
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

// Generate thumbnail using sharp
async function generateThumbnail(filePath: string): Promise<string> {
  try {
    const buffer = await sharp(filePath)
      .rotate() // Auto-orient based on EXIF
      .resize(300, null, {
        // 300px width for retina displays
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Convert to base64 data URL
    const base64 = buffer.toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error(`Failed to generate thumbnail for ${filePath}:`, error);
    throw error;
  }
}

// Get file stats
async function getFileInfo(filePath: string) {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    modifiedDate: stats.mtime.toISOString(),
  };
}

// Get image date from EXIF metadata with fallback to file modification date
async function getImageDate(filePath: string): Promise<Date> {
  try {
    const metadata = await sharp(filePath).metadata();
    
    // Try to get EXIF date (DateTimeOriginal is the actual capture date)
    if (metadata.exif) {
      // Sharp provides EXIF data as a Buffer, we need to parse it
      // The exif property contains the raw EXIF buffer
      const exifBuffer = metadata.exif;
      
      // Look for DateTimeOriginal in the EXIF data
      // EXIF dates are typically in format: "YYYY:MM:DD HH:MM:SS"
      const exifString = exifBuffer.toString('latin1');
      
      // Search for DateTimeOriginal tag (more reliable than CreateDate)
      // Pattern: YYYY:MM:DD HH:MM:SS
      const datePattern = /(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/;
      const match = exifString.match(datePattern);
      
      if (match) {
        // Convert EXIF date format to ISO format
        const [, year, month, day, hour, minute, second] = match;
        const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        const exifDate = new Date(dateStr);
        
        // Validate the date is reasonable (not in the future, not before 1990)
        const now = new Date();
        const minDate = new Date('1990-01-01');
        if (exifDate <= now && exifDate >= minDate) {
          return exifDate;
        }
      }
    }
  } catch (error) {
    // Silently fall through to use file modification date
    // This is expected for non-image files or corrupted images
  }
  
  // Fallback to file modification date
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure albums directory exists
    ensureDataDirectories();

    const body = await request.json();
    const { albumName, page = 1, limit = 50, sortOrder = "desc" } = body;

    // Validate inputs
    if (!albumName || typeof albumName !== "string") {
      return NextResponse.json(
        { success: false, error: "Album name is required" },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    if (sortOrder !== "desc" && sortOrder !== "asc") {
      return NextResponse.json(
        { success: false, error: "Invalid sort order. Must be 'desc' or 'asc'" },
        { status: 400 }
      );
    }

    const albumsDir = getAlbumsDirectory();
    const albumPath = path.join(albumsDir, albumName);

    // Validate album name doesn't contain path traversal
    if (albumName.includes("..") || path.isAbsolute(albumName)) {
      return NextResponse.json(
        { success: false, error: "Invalid album name" },
        { status: 400 }
      );
    }

    // Check if album directory exists and is accessible
    try {
      const stats = await fs.stat(albumPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { success: false, error: `Album '${albumName}' not found` },
          { status: 404 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Album '${albumName}' not found`,
        },
        { status: 404 }
      );
    }

    // Read directory contents (only root level files, ignore subdirectories)
    const entries = await fs.readdir(albumPath, { withFileTypes: true });
    const imageFiles = entries
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => entry.name);

    // Get dates for all images and sort by date
    const imageFilesWithDates = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = path.join(albumPath, filename);
        const date = await getImageDate(filePath);
        return { filename, date };
      })
    );

    // Sort by date (desc = newest first, asc = oldest first)
    if (sortOrder === "desc") {
      imageFilesWithDates.sort((a, b) => b.date.getTime() - a.date.getTime());
    } else {
      imageFilesWithDates.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    // Extract sorted filenames
    const sortedFiles = imageFilesWithDates.map((item) => item.filename);

    // Calculate pagination
    const total = sortedFiles.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = sortedFiles.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    // Generate image data with thumbnails
    const images = await Promise.all(
      paginatedFiles.map(async (filename) => {
        const filePath = path.join(albumPath, filename);

        try {
          const fileInfo = await getFileInfo(filePath);
          const thumbnailDataUrl = await generateThumbnail(filePath);

          return {
            filename,
            path: filePath, // Full absolute path
            size: fileInfo.size,
            modifiedDate: fileInfo.modifiedDate,
            thumbnailDataUrl,
          };
        } catch (error) {
          console.error(`Error processing image ${filename}:`, error);
          // Return image info without thumbnail on error
          return {
            filename,
            path: filePath,
            size: 0,
            modifiedDate: new Date().toISOString(),
            thumbnailDataUrl: "", // Empty string indicates failed thumbnail
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      albumName,
      images,
      page,
      limit,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("Error browsing album:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to browse album",
      },
      { status: 500 }
    );
  }
}

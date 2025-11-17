import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { ensureDataDirectories, getAlbumsDirectory } from "@/lib/dataUtils";

// File extensions to filter for
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// Check if file has valid image extension
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

export async function POST(request: NextRequest) {
  try {
    // Ensure albums directory exists
    ensureDataDirectories();

    const body = await request.json();
    const { albumName, page = 1, limit = 50 } = body;

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

    // Sort alphabetically (case-insensitive)
    imageFiles.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Calculate pagination
    const total = imageFiles.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = imageFiles.slice(startIndex, endIndex);
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

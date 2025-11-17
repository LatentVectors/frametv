import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

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
    const body = await request.json();
    const { directoryPath, page = 1, limit = 50 } = body;

    // Validate inputs
    if (!directoryPath || typeof directoryPath !== "string") {
      return NextResponse.json(
        { success: false, error: "Directory path is required" },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Check if directory exists and is accessible
    try {
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { success: false, error: "Path is not a directory" },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected directory is no longer accessible",
        },
        { status: 404 }
      );
    }

    // Read directory contents
    const allFiles = await fs.readdir(directoryPath);

    // Filter for image files only
    const imageFiles = allFiles.filter(isImageFile);

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
        const filePath = path.join(directoryPath, filename);

        try {
          const fileInfo = await getFileInfo(filePath);
          const thumbnailDataUrl = await generateThumbnail(filePath);

          return {
            filename,
            path: filePath,
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
      directory: directoryPath,
      images,
      page,
      limit,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("Error browsing directory:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to browse directory",
      },
      { status: 500 }
    );
  }
}

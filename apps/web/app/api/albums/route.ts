import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ensureDataDirectories, getAlbumsDirectory } from "@/lib/dataUtils";

// File extensions to filter for
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// Check if file has valid image extension
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

// Count images in a directory (only root level)
async function countImagesInDirectory(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && isImageFile(entry.name))
      .length;
  } catch (error) {
    console.error(`Error counting images in ${dirPath}:`, error);
    return 0;
  }
}

export async function GET() {
  try {
    // Ensure albums directory exists
    ensureDataDirectories();

    const albumsDir = getAlbumsDirectory();

    // Check if albums directory exists
    try {
      const stats = await fs.stat(albumsDir);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { success: false, error: "Albums directory is not a directory" },
          { status: 500 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Failed to access albums directory" },
        { status: 500 }
      );
    }

    // Read all entries in albums directory
    const entries = await fs.readdir(albumsDir, { withFileTypes: true });

    // Filter for directories only (albums are folders)
    const albumDirs = entries.filter((entry) => entry.isDirectory());

    // Get album info (name and image count)
    const albums = await Promise.all(
      albumDirs.map(async (dir) => {
        const albumPath = path.join(albumsDir, dir.name);
        const imageCount = await countImagesInDirectory(albumPath);
        return {
          name: dir.name,
          imageCount,
        };
      })
    );

    // Sort albums alphabetically by name
    albums.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      albums,
    });
  } catch (error) {
    console.error("Error listing albums:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list albums",
      },
      { status: 500 }
    );
  }
}

import fs from "fs";
import path from "path";
import { getSavedImagesDirectory } from "./dataUtils";

export interface GalleryImage {
  filename: string;
  filepath: string;
  createdAt: string; // ISO timestamp
  size: number; // File size in bytes
}

/**
 * List images in the saved-images directory with pagination
 */
export function listImages(
  page: number = 1,
  limit: number = 50
): { images: GalleryImage[]; total: number; hasMore: boolean } {
  const savedImagesDir = getSavedImagesDirectory();

  // Check if directory exists
  if (!fs.existsSync(savedImagesDir)) {
    return { images: [], total: 0, hasMore: false };
  }

  // Read directory and filter for image files
  const files = fs.readdirSync(savedImagesDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".jpg", ".jpeg", ".png"].includes(ext);
  });

  // Get file stats and create image metadata
  const images: GalleryImage[] = files
    .map((filename) => {
      const filepath = path.join(savedImagesDir, filename);
      try {
        const stats = fs.statSync(filepath);
        return {
          filename,
          filepath,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        };
      } catch (error) {
        // Skip files that can't be accessed
        return null;
      }
    })
    .filter((img): img is GalleryImage => img !== null)
    .sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const total = images.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedImages = images.slice(startIndex, endIndex);
  const hasMore = endIndex < total;

  return {
    images: paginatedImages,
    total,
    hasMore,
  };
}


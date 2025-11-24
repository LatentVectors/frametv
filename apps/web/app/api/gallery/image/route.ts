import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getAlbumsDirectory, getSavedImagesDirectory } from "@/lib/dataUtils";

function isPathInsideDirectory(directory: string, targetPath: string): boolean {
  const relativePath = path.relative(directory, targetPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename");
    const directPath = searchParams.get("path");

    if (!filename && !directPath) {
      return NextResponse.json(
        { error: "Filename or path required" },
        { status: 400 }
      );
    }

    const savedImagesDir = getSavedImagesDirectory();
    const albumsDir = getAlbumsDirectory();

    let filepath: string;

    if (filename) {
      // Security: prevent directory traversal via filename parameter
      const safeFilename = path.basename(filename);
      filepath = path.join(savedImagesDir, safeFilename);
    } else {
      // directPath is validated to exist because of earlier guard
      const resolvedPath = path.resolve(directPath!);
      const isAllowedPath =
        isPathInsideDirectory(savedImagesDir, resolvedPath) ||
        isPathInsideDirectory(albumsDir, resolvedPath);

      if (!isAllowedPath) {
        return NextResponse.json(
          { error: "Invalid image path" },
          { status: 400 }
        );
      }

      filepath = resolvedPath;
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Process image with Sharp to apply EXIF orientation
    const ext = path.extname(filepath).toLowerCase();
    const isJpeg = ext === ".jpg" || ext === ".jpeg";
    const isPng = ext === ".png";

    // Use Sharp to auto-orient the image based on EXIF data
    const sharpInstance = sharp(filepath).rotate(); // Auto-orient based on EXIF

    let processedBuffer: Buffer;
    let contentType: string;

    if (isJpeg) {
      // For JPEG, maintain high quality
      processedBuffer = await sharpInstance.jpeg({ quality: 95 }).toBuffer();
      contentType = "image/jpeg";
    } else if (isPng) {
      // For PNG, keep as PNG
      processedBuffer = await sharpInstance.png().toBuffer();
      contentType = "image/png";
    } else {
      // For other formats, convert to JPEG
      processedBuffer = await sharpInstance.jpeg({ quality: 95 }).toBuffer();
      contentType = "image/jpeg";
    }

    return new NextResponse(processedBuffer as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving gallery image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}

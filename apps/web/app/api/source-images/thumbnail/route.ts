import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getDataDirectory } from "@/lib/dataUtils";
import { sourceImagesApi } from "@/lib/api/database";

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_QUALITY = 85;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Source image ID required" },
        { status: 400 }
      );
    }

    const sourceImageId = parseInt(id, 10);
    if (isNaN(sourceImageId)) {
      return NextResponse.json(
        { error: "Invalid source image ID" },
        { status: 400 }
      );
    }

    // Fetch source image record from database to get filepath
    let sourceImage: { filepath: string };
    try {
      sourceImage = await sourceImagesApi.get(sourceImageId) as { filepath: string };
    } catch (error) {
      console.error("Error fetching source image:", error);
      return NextResponse.json(
        { error: "Source image not found" },
        { status: 404 }
      );
    }

    if (!sourceImage || !sourceImage.filepath) {
      return NextResponse.json(
        { error: "Source image not found" },
        { status: 404 }
      );
    }

    // Resolve full filesystem path from relative filepath
    // Source image filepath is relative to the data directory (e.g., "albums/MyAlbum/photo.jpg")
    const dataDir = getDataDirectory();
    const fullPath = path.join(dataDir, sourceImage.filepath);

    // Security check: ensure path is within data directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedDataDir = path.resolve(dataDir);
    if (!resolvedPath.startsWith(resolvedDataDir)) {
      console.error("Security: Path traversal attempt detected");
      return NextResponse.json(
        { error: "Invalid image path" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Source image file not found: ${resolvedPath}`);
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    // Generate thumbnail using Sharp
    // Auto-orient from EXIF, resize to 300px width, convert to JPEG
    const thumbnailBuffer = await sharp(resolvedPath)
      .rotate() // Auto-orient based on EXIF
      .resize(THUMBNAIL_WIDTH, null, {
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    return new NextResponse(thumbnailBuffer as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    );
  }
}


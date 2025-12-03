import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDataDirectory } from "@/lib/dataUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID required" },
        { status: 400 }
      );
    }

    // The contentId may come with .jpg extension (e.g., "MY_F0010.jpg")
    // We'll use it as-is since the files are stored with .jpg extension
    const filename = contentId.endsWith(".jpg") ? contentId : `${contentId}.jpg`;

    // Get the path to the TV thumbnails directory
    const dataDir = getDataDirectory();
    const thumbnailsDir = path.join(dataDir, "tv-thumbnails");
    const thumbnailPath = path.join(thumbnailsDir, filename);

    // Security check: ensure path is within thumbnails directory
    const resolvedPath = path.resolve(thumbnailPath);
    const resolvedThumbnailsDir = path.resolve(thumbnailsDir);
    if (!resolvedPath.startsWith(resolvedThumbnailsDir)) {
      console.error("Security: Path traversal attempt detected");
      return NextResponse.json(
        { error: "Invalid thumbnail path" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`TV thumbnail not found: ${resolvedPath}`);
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    // Read and return the thumbnail
    const thumbnailBuffer = fs.readFileSync(resolvedPath);

    return new NextResponse(thumbnailBuffer as BodyInit, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error serving TV thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to serve thumbnail" },
      { status: 500 }
    );
  }
}


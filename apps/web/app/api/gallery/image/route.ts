import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSavedImagesDirectory } from "@/lib/dataUtils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Security: prevent directory traversal
    const safeFilename = path.basename(filename);
    const savedImagesDir = getSavedImagesDirectory();
    const filepath = path.join(savedImagesDir, safeFilename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filepath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving gallery image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}


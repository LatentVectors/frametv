import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ensureDataDirectories, getSavedImagesDirectory } from "@/lib/dataUtils";
import { generateExportFilename } from "@/lib/imageUtils";

export async function POST(request: NextRequest) {
  try {
    // Ensure data directories exist
    ensureDataDirectories();

    const body = await request.json();
    const { imageData } = body;

    if (!imageData || typeof imageData !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid image data" },
        { status: 400 }
      );
    }

    // Extract base64 data (remove data:image/jpeg;base64, prefix if present)
    const base64Data = imageData.includes(",")
      ? imageData.split(",")[1]
      : imageData;

    // Generate filename
    const filename = body.filename || generateExportFilename();

    // Get saved images directory
    const savedImagesDir = getSavedImagesDirectory();
    const filepath = path.join(savedImagesDir, filename);

    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filepath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      filepath,
    });
  } catch (error) {
    console.error("Error saving image:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save image" },
      { status: 500 }
    );
  }
}


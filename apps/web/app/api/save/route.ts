import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ensureDataDirectories, getSavedImagesDirectory } from "@/lib/dataUtils";
import { generateExportFilename } from "@/lib/imageUtils";
import { galleryImagesApi } from "@/lib/api/database";

interface SlotData {
  slot_number: number;
  source_image_id: number | null;
  transform_data: Record<string, unknown> | null;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure data directories exist
    ensureDataDirectories();

    const body = await request.json();
    const { imageData, templateId, slots } = body;

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

    // Create database record for the gallery image with slots
    // Store relative path (from data directory) in database
    const relativeFilepath = `saved-images/${filename}`;
    
    // Prepare the slots data - only include source_image_id and transform_data if they have values
    const preparedSlots = (slots as SlotData[] || []).map((slot: SlotData) => {
      const preparedSlot: { slot_number: number; source_image_id?: number; transform_data?: Record<string, unknown> } = {
        slot_number: slot.slot_number,
      };
      // Only include source_image_id if it's a valid number
      if (typeof slot.source_image_id === 'number') {
        preparedSlot.source_image_id = slot.source_image_id;
      }
      // Only include transform_data if it exists
      if (slot.transform_data) {
        preparedSlot.transform_data = slot.transform_data;
      }
      return preparedSlot;
    });
    
    const galleryImagePayload = {
      filename,
      filepath: relativeFilepath,
      template_id: templateId || "single",
      slots: preparedSlots,
    };
    
    console.log("[Save API] Creating gallery image with payload:", JSON.stringify(galleryImagePayload, null, 2));
    
    try {
      const result = await galleryImagesApi.create(galleryImagePayload);
      console.log("[Save API] Gallery image created successfully:", result);
    } catch (dbError) {
      console.error("[Save API] Error creating database record:", dbError);
      // File was saved, but database record failed
      // We could delete the file here, but for now just log the error
      // and return success (file is saved, just not tracked in DB)
    }

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


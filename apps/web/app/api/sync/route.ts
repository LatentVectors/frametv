import { NextRequest, NextResponse } from "next/server";
import { settingsApi } from "@/lib/api/database";
import path from "path";
import { getSavedImagesDirectory } from "@/lib/dataUtils";

const SYNC_SERVICE_URL =
  process.env.SYNC_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePaths } = body;

    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return NextResponse.json(
        { success: false, synced: [], failed: [], error: "No images selected" },
        { status: 400 }
      );
    }

    // Read TV settings from database
    const dbSettings = await settingsApi.getAll() as { settings?: Record<string, any> };
    const tvIpAddress = dbSettings.settings?.tv_ip_address;
    const tvPort = dbSettings.settings?.tv_port;
    
    if (!tvIpAddress) {
      return NextResponse.json(
        {
          success: false,
          synced: [],
          failed: [],
          error: "TV settings not configured. Please configure settings first.",
        },
        { status: 400 }
      );
    }

    // Convert relative image paths to full file paths
    const savedImagesDir = getSavedImagesDirectory();
    const fullImagePaths = imagePaths.map((imagePath: string) => {
      // If it's already a full path, use it; otherwise resolve relative to saved-images directory
      if (path.isAbsolute(imagePath)) {
        return imagePath;
      }
      // Extract filename from path (handle both forward and backward slashes)
      const filename = imagePath.split(/[/\\]/).pop() || imagePath;
      return path.join(savedImagesDir, filename);
    });

    // Proxy request to sync service
    const response = await fetch(`${SYNC_SERVICE_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_paths: fullImagePaths,
        ip_address: tvIpAddress,
        port: tvPort || 8002,
      }),
    });

    if (!response.ok) {
      // Handle sync service errors
      if (response.status === 503 || response.status === 0) {
        return NextResponse.json(
          {
            success: false,
            synced: [],
            failed: imagePaths.map((p: string) => ({
              filename: p.split(/[/\\]/).pop() || p,
              error: "Sync service is not running",
            })),
            error:
              "Sync service is not running. Please start the sync service and try again.",
          },
          { status: 503 }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          synced: [],
          failed: imagePaths.map((p: string) => ({
            filename: p.split(/[/\\]/).pop() || p,
            error: errorData.message || "Sync failed",
          })),
          error: errorData.message || "Failed to sync images",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: data.success,
      synced: data.synced || [],
      failed: data.failed || [],
      total: data.total || 0,
      successful: data.successful || 0,
    });
  } catch (error) {
    // Handle network errors (sync service not running)
    // Note: We can't read request body again here, so we'll use a generic error
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          success: false,
          synced: [],
          failed: [],
          error:
            "Sync service is not running. Please start the sync service and try again.",
        },
        { status: 503 }
      );
    }

    console.error("Error proxying sync request:", error);
    return NextResponse.json(
      {
        success: false,
        synced: [],
        failed: [],
        error: error instanceof Error ? error.message : "Failed to sync images",
      },
      { status: 500 }
    );
  }
}

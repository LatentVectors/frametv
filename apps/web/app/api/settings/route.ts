import { NextRequest, NextResponse } from "next/server";
import { settingsApi } from "@/lib/api/database";
import fs from "fs";
import path from "path";
import { getDataDirectory } from "@/lib/dataUtils";

function checkTokenExists(): boolean {
  try {
    const dataDir = getDataDirectory();
    const tokenPath = path.join(dataDir, "tv_token.txt");
    return fs.existsSync(tokenPath);
  } catch (error) {
    console.error("Error checking token file:", error);
    return false;
  }
}

export async function GET() {
  try {
    // Get settings from database
    const dbSettings = await settingsApi.getAll() as { settings?: Record<string, any> };
    const tvIpAddress = dbSettings.settings?.tv_ip_address;
    const tvPort = dbSettings.settings?.tv_port;
    const isConfigured = !!tvIpAddress;
    const isPaired = checkTokenExists();

    return NextResponse.json({
      ipAddress: tvIpAddress,
      port: tvPort,
      isConfigured,
      isPaired,
      pairingInstructions:
        "Run 'python src/pair_tv.py' from the sync-service directory",
    });
  } catch (error) {
    console.error("Error reading settings:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipAddress, port } = body;

    // Validate input
    if (!ipAddress || typeof ipAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "IP address is required" },
        { status: 400 }
      );
    }

    if (!port || typeof port !== "number" || port < 1 || port > 65535) {
      return NextResponse.json(
        { success: false, error: "Valid port number is required (1-65535)" },
        { status: 400 }
      );
    }

    // Basic IP address validation (simple check)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid IP address format" },
        { status: 400 }
      );
    }

    // Save settings to database
    await settingsApi.set("tv_ip_address", ipAddress);
    await settingsApi.set("tv_port", port);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

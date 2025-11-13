import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, isConfigured } from "@/lib/settingsUtils";

export async function GET() {
  try {
    const settings = readSettings();
    const configured = isConfigured();

    return NextResponse.json({
      ipAddress: settings?.ipAddress,
      port: settings?.port,
      isConfigured: configured,
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

    // Write settings
    writeSettings({ ipAddress, port });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error writing settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}


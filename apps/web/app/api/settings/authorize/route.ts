import { NextRequest, NextResponse } from "next/server";

const SYNC_SERVICE_URL = process.env.SYNC_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ipAddress, port, pin } = body;

    if (!ipAddress || !pin) {
      return NextResponse.json(
        { success: false, tokenSaved: false, message: "IP address and PIN are required" },
        { status: 400 }
      );
    }

    // Proxy request to sync service
    const response = await fetch(`${SYNC_SERVICE_URL}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ip_address: ipAddress,
        port: port || 8002,
        pin: pin,
      }),
    });

    if (!response.ok) {
      // Handle sync service errors
      if (response.status === 503 || response.status === 0) {
        return NextResponse.json(
          {
            success: false,
            tokenSaved: false,
            message: "Sync service is not running. Please start the sync service and try again.",
          },
          { status: 503 }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          tokenSaved: false,
          message: errorData.message || "Failed to authorize TV connection",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: data.success,
      tokenSaved: data.token_saved,
      message: data.message,
    });
  } catch (error) {
    // Handle network errors (sync service not running)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          success: false,
          tokenSaved: false,
          message: "Sync service is not running. Please start the sync service and try again.",
        },
        { status: 503 }
      );
    }

    console.error("Error proxying authorize request:", error);
    return NextResponse.json(
      {
        success: false,
        tokenSaved: false,
        message: error instanceof Error ? error.message : "Failed to authorize TV connection",
      },
      { status: 500 }
    );
  }
}


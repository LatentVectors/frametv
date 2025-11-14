import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDataDirectory } from "@/lib/dataUtils";

export async function GET() {
  try {
    const dataDir = getDataDirectory();

    // Use test-specific token path when MOCK_TV is enabled
    // This prevents tests from interfering with real user data
    const isTestMode = process.env.MOCK_TV === "true";
    const tokenDir = isTestMode ? path.join(dataDir, ".test") : dataDir;

    const tokenPath = path.join(tokenDir, "tv_token.txt");
    const tokenExists = fs.existsSync(tokenPath);

    return NextResponse.json({
      isConfigured: tokenExists,
    });
  } catch (error) {
    console.error("Error checking TV configuration:", error);
    return NextResponse.json(
      { isConfigured: false, error: "Failed to check TV configuration" },
      { status: 500 }
    );
  }
}

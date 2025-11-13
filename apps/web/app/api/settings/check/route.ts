import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDataDirectory } from "@/lib/dataUtils";

export async function GET() {
  try {
    const dataDir = getDataDirectory();
    const tokenPath = path.join(dataDir, "tv_token.txt");
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


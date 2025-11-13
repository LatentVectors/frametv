import { NextRequest, NextResponse } from "next/server";
import { listImages } from "@/lib/galleryUtils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const result = listImages(page, limit);

    return NextResponse.json({
      images: result.images,
      total: result.total,
      page,
      limit,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Error listing gallery images:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}


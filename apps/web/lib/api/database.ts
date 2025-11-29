/**
 * Type-safe API client for Database Service.
 * Types are auto-generated from OpenAPI spec.
 */

import { Tag } from "@/types";

const DATABASE_SERVICE_URL =
  process.env.NEXT_PUBLIC_DATABASE_SERVICE_URL || "http://localhost:8001";

/**
 * Generic API fetch wrapper with error handling.
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${DATABASE_SERVICE_URL}${endpoint}`;
  
  console.log("[Database API] Request:", {
    url,
    method: options?.method || "GET",
  });
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("[Database API] Error response:", {
        url,
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(error.detail || `API error: ${response.statusText}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();
    console.log("[Database API] Success:", {
      url,
      status: response.status,
    });
    return data;
  } catch (error) {
    // Log network errors (fetch failures)
    if (error instanceof TypeError) {
      console.error("[Database API] Network error:", {
        url,
        error: error.message,
      });
    }
    throw error;
  }
}

/**
 * Source image response type
 */
export interface SourceImageResponse {
  id: number;
  filename: string;
  filepath: string;
  date_taken: string | null;
  is_deleted: boolean;
  usage_count: number;
  is_used: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated source images response
 */
export interface PaginatedSourceImages {
  items: SourceImageResponse[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Source Images API
 */
export const sourceImagesApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    album?: string;
    sortOrder?: "asc" | "desc";
    sortBy?: "date_taken" | "filename" | "created_at";
    used?: boolean;
    tags?: string;
  } = {}): Promise<PaginatedSourceImages> => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(params.page ?? 1));
    searchParams.set("limit", String(params.limit ?? 50));
    if (params.album) searchParams.set("album", params.album);
    if (params.sortOrder) searchParams.set("sort_order", params.sortOrder);
    if (params.sortBy) searchParams.set("sort_by", params.sortBy);
    if (params.used !== undefined) searchParams.set("used", String(params.used));
    if (params.tags) searchParams.set("tags", params.tags);
    return apiFetch<PaginatedSourceImages>(`/source-images?${searchParams.toString()}`);
  },
  get: async (id: number): Promise<SourceImageResponse> => {
    return apiFetch<SourceImageResponse>(`/source-images/${id}`);
  },
  create: async (data: any) => {
    return apiFetch(`/source-images`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch(`/source-images/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  scan: async () => {
    return apiFetch(`/source-images/scan`, {
      method: "POST",
    });
  },
  recalculateUsageCounts: async () => {
    return apiFetch<{ success: boolean; total_images: number; updated_count: number; negative_counts_corrected: number }>(
      `/source-images/recalculate-usage`,
      { method: "POST" }
    );
  },
  // Tag methods
  getTags: async (id: number): Promise<Tag[]> => {
    return apiFetch(`/source-images/${id}/tags`);
  },
  addTag: async (id: number, tagName: string, tagColor?: string): Promise<Tag> => {
    return apiFetch(`/source-images/${id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_name: tagName, tag_color: tagColor }),
    });
  },
  removeTag: async (id: number, tagId: number): Promise<void> => {
    return apiFetch(`/source-images/${id}/tags/${tagId}`, {
      method: "DELETE",
    });
  },
  // Thumbnail URL helper
  getThumbnailUrl: (id: number): string => {
    return `/api/source-images/thumbnail?id=${id}`;
  },
};

/**
 * Gallery Images API
 */
export const galleryImagesApi = {
  list: async (page: number = 1, limit: number = 50, options?: { tags?: string }) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (options?.tags) params.set("tags", options.tags);
    return apiFetch(`/gallery-images?${params.toString()}`);
  },
  get: async (id: number) => {
    return apiFetch(`/gallery-images/${id}`);
  },
  create: async (data: any) => {
    return apiFetch(`/gallery-images`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch(`/gallery-images/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch(`/gallery-images/${id}`, {
      method: "DELETE",
    });
  },
  // Tag methods
  getTags: async (id: number): Promise<Tag[]> => {
    return apiFetch(`/gallery-images/${id}/tags`);
  },
  addTag: async (id: number, tagName: string, tagColor?: string): Promise<Tag> => {
    return apiFetch(`/gallery-images/${id}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag_name: tagName, tag_color: tagColor }),
    });
  },
  removeTag: async (id: number, tagId: number): Promise<void> => {
    return apiFetch(`/gallery-images/${id}/tags/${tagId}`, {
      method: "DELETE",
    });
  },
};

/**
 * TV Content API
 */
export const tvContentApi = {
  list: async (page: number = 1, limit: number = 100) => {
    return apiFetch(`/tv-content?page=${page}&limit=${limit}`);
  },
  get: async (id: number) => {
    return apiFetch(`/tv-content/${id}`);
  },
  getByTvId: async (tvContentId: string) => {
    return apiFetch(`/tv-content/by-tv-id/${tvContentId}`);
  },
  getByGalleryImageId: async (galleryImageId: number) => {
    return apiFetch(`/tv-content/by-gallery-image/${galleryImageId}`);
  },
  create: async (data: any) => {
    return apiFetch(`/tv-content`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch(`/tv-content/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch(`/tv-content/${id}`, {
      method: "DELETE",
    });
  },
  deleteByTvId: async (tvContentId: string) => {
    return apiFetch(`/tv-content/by-tv-id/${tvContentId}`, {
      method: "DELETE",
    });
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  getAll: async () => {
    return apiFetch(`/settings`);
  },
  get: async (key: string) => {
    return apiFetch(`/settings/${key}`);
  },
  set: async (key: string, value: any) => {
    return apiFetch(`/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  },
};

/**
 * Tags API
 */
export const tagsApi = {
  list: async (search?: string): Promise<Tag[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch(`/tags${params}`);
  },
  get: async (id: number): Promise<Tag> => {
    return apiFetch(`/tags/${id}`);
  },
  create: async (name: string, color?: string): Promise<Tag> => {
    return apiFetch(`/tags`, {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  },
  update: async (id: number, data: { name?: string; color?: string }): Promise<Tag> => {
    return apiFetch(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};


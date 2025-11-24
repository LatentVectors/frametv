/**
 * Type-safe API client for Sync Service.
 */

const SYNC_SERVICE_URL =
  process.env.NEXT_PUBLIC_SYNC_SERVICE_URL || "http://localhost:8000";

export interface SyncRequest {
  image_paths: string[];
  ip_address: string;
  port?: number;
  mode?: "add" | "reset";
  gallery_image_ids?: number[];
}

export interface FailedImage {
  filename: string;
  error: string;
}

export interface SyncResponse {
  success: boolean;
  synced: string[];
  failed: FailedImage[];
  total: number;
  successful: number;
}

export interface RefreshTVStateResponse {
  removed: number;
  added: number;
  updated: number;
  total_on_tv: number;
  synced_via_app: number;
  manual_uploads: number;
}

/**
 * Generic API fetch wrapper with error handling.
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${SYNC_SERVICE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Sync Service API
 */
export const syncApi = {
  sync: async (request: SyncRequest): Promise<SyncResponse> => {
    return apiFetch(`/sync`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
  refreshTVState: async (): Promise<RefreshTVStateResponse> => {
    return apiFetch(`/tv-content/refresh`, {
      method: "POST",
    });
  },
};


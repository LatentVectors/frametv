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

export interface FailedDelete {
  tv_content_id: string;
  error: string;
}

export interface DeleteTVContentResponse {
  deleted: string[];
  failed: FailedDelete[];
}

export interface SyncProgressEvent {
  type: "progress";
  current: number;
  total: number;
  filename: string;
  stage: "connecting" | "uploading" | "deleting";
}

export interface SyncCompleteEvent {
  type: "complete";
  success: boolean;
  synced: string[];
  failed: { filename: string; error: string }[];
  total: number;
  successful: number;
  error?: string;
}

export type SyncStreamEvent = SyncProgressEvent | SyncCompleteEvent;

/**
 * Generic API fetch wrapper with error handling.
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${SYNC_SERVICE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
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

  /**
   * Sync with streaming progress updates via Server-Sent Events.
   * Calls onProgress for each progress event, returns final SyncResponse.
   */
  syncStream: async (
    request: SyncRequest,
    onProgress: (
      current: number,
      total: number,
      filename: string,
      stage: string
    ) => void
  ): Promise<SyncResponse> => {
    const url = `${SYNC_SERVICE_URL}/sync-stream`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let finalResponse: SyncResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr) as SyncStreamEvent;
            if (event.type === "progress") {
              onProgress(
                event.current,
                event.total,
                event.filename,
                event.stage
              );
            } else if (event.type === "complete") {
              finalResponse = {
                success: event.success,
                synced: event.synced,
                failed: event.failed,
                total: event.total,
                successful: event.successful,
              };
            }
          } catch (e) {
            console.error("Failed to parse SSE event:", jsonStr, e);
          }
        }
      }
    }

    if (!finalResponse) {
      throw new Error("Stream ended without completion event");
    }

    return finalResponse;
  },

  refreshTVState: async (): Promise<RefreshTVStateResponse> => {
    return apiFetch(`/tv-content/refresh`, {
      method: "POST",
    });
  },
  deleteTVContent: async (
    tvContentIds: string[]
  ): Promise<DeleteTVContentResponse> => {
    return apiFetch(`/tv-content/delete`, {
      method: "POST",
      body: JSON.stringify({ tv_content_ids: tvContentIds }),
    });
  },
};

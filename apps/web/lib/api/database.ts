/**
 * Type-safe API client for Database Service.
 * Types are auto-generated from OpenAPI spec.
 */

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
 * Source Images API
 */
export const sourceImagesApi = {
  list: async (page: number = 1, limit: number = 50) => {
    return apiFetch(`/source-images?page=${page}&limit=${limit}`);
  },
  get: async (id: number) => {
    return apiFetch(`/source-images/${id}`);
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
};

/**
 * Gallery Images API
 */
export const galleryImagesApi = {
  list: async (page: number = 1, limit: number = 50) => {
    return apiFetch(`/gallery-images?page=${page}&limit=${limit}`);
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


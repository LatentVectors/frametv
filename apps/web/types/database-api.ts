/**
 * This file is auto-generated from the Database Service OpenAPI spec.
 * Run `npm run generate-types` to regenerate.
 * 
 * For now, this is a placeholder. Types will be generated when the database service is running.
 */

// Placeholder types - will be replaced by openapi-typescript generation
export interface SourceImage {
  id?: number;
  filename: string;
  filepath: string;
  date_taken?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id?: number;
  filename: string;
  filepath: string;
  template_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ImageSlot {
  id?: number;
  gallery_image_id: number;
  slot_number: number;
  source_image_id?: number;
  transform_data?: SlotTransform;
  created_at: string;
  updated_at: string;
}

export interface SlotTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  tint: number;
}

export interface TVContentMapping {
  id?: number;
  gallery_image_id?: number;
  tv_content_id: string;
  uploaded_at: string;
  last_verified_at?: string;
  sync_status: "synced" | "pending" | "failed" | "manual";
}

export interface Settings {
  id?: number;
  key: string;
  value: Record<string, any>;
  updated_at: string;
}


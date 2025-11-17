import fs from "fs";
import path from "path";

/**
 * Gets the project root directory.
 * Assumes we're running from apps/web/ and goes up two levels.
 * Falls back to process.cwd() if that doesn't work.
 */
function getProjectRoot(): string {
  const cwd = process.cwd();

  // If we're in apps/web/, go up two levels
  if (cwd.endsWith("apps/web") || cwd.endsWith("apps/web/")) {
    return path.resolve(cwd, "../..");
  }

  // If we're already at project root (has apps/ directory), use it
  if (fs.existsSync(path.join(cwd, "apps"))) {
    return cwd;
  }

  // Fallback: assume we're in apps/web/ and go up two levels
  return path.resolve(cwd, "../..");
}

/**
 * Ensures the data directory structure exists.
 * Creates directories if they don't exist.
 *
 * Paths are resolved relative to the project root (../../data/ from apps/web/)
 */
export function ensureDataDirectories(): void {
  const projectRoot = getProjectRoot();
  const dataDir = path.join(projectRoot, "data");
  const savedImagesDir = path.join(dataDir, "saved-images");
  const albumsDir = path.join(dataDir, "albums");

  // Create directories if they don't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(savedImagesDir)) {
    fs.mkdirSync(savedImagesDir, { recursive: true });
  }

  if (!fs.existsSync(albumsDir)) {
    fs.mkdirSync(albumsDir, { recursive: true });
  }
}

/**
 * Gets the path to the data directory (relative to project root).
 * Returns absolute path resolved from project root.
 */
export function getDataDirectory(): string {
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, "data");
}

/**
 * Gets the path to the saved-images directory.
 */
export function getSavedImagesDirectory(): string {
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, "data", "saved-images");
}

/**
 * Gets the path to the albums directory.
 */
export function getAlbumsDirectory(): string {
  const projectRoot = getProjectRoot();
  return path.join(projectRoot, "data", "albums");
}

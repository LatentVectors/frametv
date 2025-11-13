import fs from "fs";
import path from "path";
import { getDataDirectory } from "./dataUtils";

export interface TVSettings {
  ipAddress: string;
  port: number;
}

const SETTINGS_FILE_NAME = "tv-settings.json";

/**
 * Get the path to the TV settings file
 */
function getSettingsFilePath(): string {
  const dataDir = getDataDirectory();
  return path.join(dataDir, SETTINGS_FILE_NAME);
}

/**
 * Read TV settings from file
 */
export function readSettings(): TVSettings | null {
  const settingsPath = getSettingsFilePath();
  
  if (!fs.existsSync(settingsPath)) {
    return null;
  }

  try {
    const fileContent = fs.readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(fileContent) as TVSettings;
    return settings;
  } catch (error) {
    console.error("Error reading settings:", error);
    return null;
  }
}

/**
 * Write TV settings to file
 */
export function writeSettings(settings: TVSettings): void {
  const dataDir = getDataDirectory();
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const settingsPath = getSettingsFilePath();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Check if settings are configured
 */
export function isConfigured(): boolean {
  const settingsPath = getSettingsFilePath();
  return fs.existsSync(settingsPath);
}


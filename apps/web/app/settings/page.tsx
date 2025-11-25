"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { settingsApi, sourceImagesApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TVSettings {
  ipAddress?: string;
  port?: number;
  isConfigured: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TVSettings>({ isConfigured: false });
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState(8002);
  const [slideshowEnabled, setSlideshowEnabled] = useState(true);
  const [slideshowDuration, setSlideshowDuration] = useState(15);
  const [slideshowType, setSlideshowType] = useState<
    "slideshow" | "shuffleslideshow"
  >("shuffleslideshow");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load TV settings from API
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data: TVSettings = await response.json();
        setSettings(data);
        if (data.ipAddress) {
          setIpAddress(data.ipAddress);
        }
        if (data.port) {
          setPort(data.port);
        }
      }

      // Load slideshow settings from database
      try {
        const dbSettings = (await settingsApi.getAll()) as {
          settings?: {
            slideshow_enabled?: boolean;
            slideshow_duration?: number;
            slideshow_type?: string;
          };
        };
        const slideshowEnabledValue =
          dbSettings.settings?.slideshow_enabled ?? true;
        const slideshowDurationValue =
          dbSettings.settings?.slideshow_duration ?? 15;
        const slideshowTypeValue =
          dbSettings.settings?.slideshow_type ?? "shuffleslideshow";

        // Validate duration is one of the preset values, default to 15 if not
        const presetDurations = [1, 3, 5, 10, 15, 30, 60];
        const validDuration = presetDurations.includes(slideshowDurationValue)
          ? slideshowDurationValue
          : 15;

        setSlideshowEnabled(slideshowEnabledValue);
        setSlideshowDuration(validDuration);
        setSlideshowType(
          slideshowTypeValue as "slideshow" | "shuffleslideshow"
        );
      } catch (error) {
        console.error("Failed to load slideshow settings:", error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Save TV connection settings
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipAddress, port }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save settings");
      }

      // Save slideshow settings to database
      try {
        await settingsApi.set("slideshow_enabled", slideshowEnabled);
        await settingsApi.set("slideshow_duration", slideshowDuration);
        await settingsApi.set("slideshow_type", slideshowType);
      } catch (error) {
        console.error("Failed to save slideshow settings:", error);
        toast({
          title: "Warning",
          description:
            "TV connection settings saved, but slideshow settings failed to save",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Settings saved",
        description: "All settings saved successfully",
      });
      await loadSettings();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const presetDurations = [1, 3, 5, 10, 15, 30, 60];

  const handleRecalculateUsageCounts = async () => {
    try {
      setRecalculating(true);
      await sourceImagesApi.recalculateUsageCounts();
      toast({
        title: "Success",
        description: "Usage counts have been recalculated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to recalculate usage counts",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with navigation */}
      <Navigation>
        <ThemeToggle />
      </Navigation>

      {/* Settings content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* TV Connection Settings */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Frame TV Connection
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure your Samsung Frame TV connection settings. Token
              exchange happens automatically in the background.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ipAddress"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  TV IP Address
                </label>
                <input
                  id="ipAddress"
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                />
              </div>

              <div>
                <label
                  htmlFor="port"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Port
                </label>
                <input
                  id="port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 8002)}
                  min="1"
                  max="65535"
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Default: 8002
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Slideshow Settings */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Slideshow Settings
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Configure automatic slideshow behavior for images on your TV.
            </p>

            <div className="space-y-4">
              {/* Enable Slideshow Toggle */}
              <div className="flex items-center justify-between p-4 border border-border rounded-md bg-card">
                <div>
                  <label
                    htmlFor="slideshowEnabled"
                    className="text-sm font-medium text-foreground"
                  >
                    Enable Slideshow
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically rotate through images on TV
                  </p>
                </div>
                <input
                  id="slideshowEnabled"
                  type="checkbox"
                  checked={slideshowEnabled}
                  onChange={(e) => setSlideshowEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-input"
                />
              </div>

              {/* Duration Input */}
              {slideshowEnabled && (
                <>
                  <div>
                    <label
                      htmlFor="slideshowDuration"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Duration (minutes)
                    </label>
                    <Select
                      value={slideshowDuration.toString()}
                      onValueChange={(value) =>
                        setSlideshowDuration(parseInt(value))
                      }
                    >
                      <SelectTrigger id="slideshowDuration" className="w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {presetDurations.map((duration) => (
                          <SelectItem
                            key={duration}
                            value={duration.toString()}
                          >
                            {duration} {duration === 1 ? "minute" : "minutes"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Slideshow Type
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="slideshowType"
                          value="shuffleslideshow"
                          checked={slideshowType === "shuffleslideshow"}
                          onChange={(e) =>
                            setSlideshowType(
                              e.target.value as "slideshow" | "shuffleslideshow"
                            )
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">Shuffle</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="slideshowType"
                          value="slideshow"
                          checked={slideshowType === "slideshow"}
                          onChange={(e) =>
                            setSlideshowType(
                              e.target.value as "slideshow" | "shuffleslideshow"
                            )
                          }
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-foreground">
                          Sequential
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Database Maintenance */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Database Maintenance
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tools for maintaining database integrity and fixing inconsistencies.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-md bg-card">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Recalculate Usage Counts
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recalculates how many times each source image is used in galleries
                  </p>
                </div>
                <Button
                  onClick={handleRecalculateUsageCounts}
                  disabled={recalculating}
                  variant="outline"
                  size="sm"
                >
                  {recalculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalculate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              variant="default"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

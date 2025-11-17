"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";

interface TVSettings {
  ipAddress?: string;
  port?: number;
  isConfigured: boolean;
  isPaired?: boolean;
  pairingInstructions?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TVSettings>({ isConfigured: false });
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState(8002);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipAddress, port }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settings saved",
          description: "TV connection settings saved successfully",
        });
        await loadSettings();
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar with navigation */}
      <Navigation />

      {/* Settings content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Frame TV Connection</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure your Samsung Frame TV connection settings. Pair your TV
              using the CLI tool before syncing images.
            </p>

            {/* Pairing Status */}
            <div className="mb-6 p-4 border border-gray-300 rounded-md bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  Pairing Status
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    settings.isPaired
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {settings.isPaired ? "Paired" : "Not Paired"}
                </span>
              </div>
              {!settings.isPaired && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    To pair your TV, run the following command from the
                    sync-service directory:
                  </p>
                  <code className="block p-2 bg-white border border-gray-300 rounded text-sm font-mono">
                    python src/pair_tv.py
                  </code>
                  {settings.pairingInstructions && (
                    <p className="mt-2 text-xs text-gray-500">
                      {settings.pairingInstructions}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ipAddress"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  TV IP Address
                </label>
                <input
                  id="ipAddress"
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="port"
                  className="block text-sm font-medium text-gray-700 mb-2"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">Default: 8002</p>
              </div>

              <div>
                <Button onClick={handleSaveSettings} variant="outline">
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

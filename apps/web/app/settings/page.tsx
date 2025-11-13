"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TVSettings {
  ipAddress?: string;
  port?: number;
  isConfigured: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TVSettings>({ isConfigured: false });
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState(8002);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
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
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setConnectionStatus(null);
      setShowPinInput(false);

      // Save settings first
      await handleSaveSettings();

      // Initiate connection (this will be proxied to sync service)
      const response = await fetch("/api/settings/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipAddress, port }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.requiresPin) {
          setShowPinInput(true);
          setConnectionStatus("Please enter the PIN displayed on your TV");
        } else {
          setConnectionStatus("Connected successfully");
          toast({
            title: "Connected",
            description: "TV connection established successfully",
          });
        }
      } else {
        throw new Error(result.message || "Failed to connect");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to TV";
      setConnectionStatus(`Error: ${errorMessage}`);
      toast({
        title: "Connection error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleAuthorize = async () => {
    if (!pin || pin.length === 0) {
      toast({
        title: "PIN required",
        description: "Please enter the PIN displayed on your TV",
        variant: "destructive",
      });
      return;
    }

    try {
      setAuthorizing(true);
      setConnectionStatus(null);

      const response = await fetch("/api/settings/authorize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ipAddress, port, pin }),
      });

      const result = await response.json();

      if (result.success && result.tokenSaved) {
        setConnectionStatus("Authorized successfully");
        setShowPinInput(false);
        setPin("");
        toast({
          title: "Authorization successful",
          description: "TV connection authorized and token saved",
        });
      } else {
        throw new Error(result.message || "Authorization failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to authorize";
      setConnectionStatus(`Error: ${errorMessage}`);
      toast({
        title: "Authorization error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAuthorizing(false);
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="flex items-center gap-4">
          <Link href="/gallery">
            <Button variant="outline">Gallery</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Editor</Button>
          </Link>
        </div>
      </div>

      {/* Settings content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Frame TV Connection</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure your Samsung Frame TV connection settings. You'll need to authorize the connection the first time.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 mb-2">
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
                <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
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

              {connectionStatus && (
                <div className={`p-3 rounded-md ${
                  connectionStatus.startsWith("Error")
                    ? "bg-red-50 text-red-700"
                    : "bg-blue-50 text-blue-700"
                }`}>
                  {connectionStatus}
                </div>
              )}

              {showPinInput && (
                <div className="p-4 border border-gray-300 rounded-md bg-gray-50">
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter PIN (displayed on TV)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="pin"
                      type="text"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="0000"
                      maxLength={4}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleAuthorize}
                      disabled={authorizing || !pin}
                    >
                      {authorizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Authorizing...
                        </>
                      ) : (
                        "Authorize"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveSettings}
                  variant="outline"
                >
                  Save Settings
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={connecting || !ipAddress}
                >
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect & Authorize"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


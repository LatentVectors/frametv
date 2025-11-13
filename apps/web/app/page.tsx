"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PREVIEW_MIN_WIDTH,
  PREVIEW_MIN_HEIGHT,
  PREVIEW_MAX_WIDTH_PERCENT,
} from "@/lib/config";
import { Template } from "@/types";
import { getDefaultTemplate } from "@/lib/templates";
import TemplateSelector from "@/components/TemplateSelector";
import ExportButton from "@/components/ExportButton";
import SaveButton from "@/components/SaveButton";
import type { CanvasEditorHandle } from "@/components/CanvasEditor";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Dynamically import CanvasEditor to avoid SSR issues with Konva
const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
});

export default function Home() {
  const canvasEditorHandleRef = useRef<CanvasEditorHandle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    getDefaultTemplate()
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleTemplateChange = (template: Template) => {
    setSelectedTemplate(template);
    // Clear image assignments when template changes (will be implemented in later tasks)
  };

  const handleExportReady = (handle: CanvasEditorHandle) => {
    canvasEditorHandleRef.current = handle;
    setIsExporting(handle.isExporting);
  };

  const handleExport = async () => {
    if (!canvasEditorHandleRef.current || isExporting) return;

    setIsExporting(true);
    try {
      await canvasEditorHandleRef.current.exportCanvas();
    } finally {
      // Update exporting state from handle
      if (canvasEditorHandleRef.current) {
        setIsExporting(canvasEditorHandleRef.current.isExporting);
      }
    }
  };

  const handleSave = async () => {
    if (!canvasEditorHandleRef.current || isSaving || isExporting) return;

    setIsSaving(true);
    try {
      // Get canvas data URL
      const dataUrl = await canvasEditorHandleRef.current.getCanvasDataUrl();

      // Send to save API
      const response = await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: dataUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Image saved successfully",
          description: `Saved as ${result.filename}`,
        });
      } else {
        throw new Error(result.error || "Failed to save image");
      }
    } catch (error) {
      toast({
        title: "Save error",
        description: error instanceof Error ? error.message : "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Sync exporting state from handle
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasEditorHandleRef.current) {
        setIsExporting(canvasEditorHandleRef.current.isExporting);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Top bar with Template Selector (left) and Export Button (right) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateChange={handleTemplateChange}
          />
          <div className="flex items-center gap-2 ml-4">
            <Link href="/gallery">
              <Button variant="ghost" className="text-sm">Gallery</Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" className="text-sm">Settings</Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          <ExportButton onExport={handleExport} disabled={isExporting || isSaving} />
          <SaveButton onSave={handleSave} disabled={isSaving || isExporting} />
        </div>
      </div>

      {/* Canvas area - centered and responsive */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* Canvas container with 16:9 aspect ratio */}
        <div
          className="relative bg-white border border-gray-200 shadow-sm"
          style={{
            width: "100%",
            maxWidth: `${PREVIEW_MAX_WIDTH_PERCENT}vw`,
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            minWidth: `${PREVIEW_MIN_WIDTH}px`,
            minHeight: `${PREVIEW_MIN_HEIGHT}px`,
          }}
        >
          {/* Canvas container div for react-konva Stage */}
          <div id="canvas-container" className="w-full h-full">
            <CanvasEditor 
              template={selectedTemplate} 
              onExportReady={handleExportReady}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

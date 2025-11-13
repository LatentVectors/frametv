"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import type { CanvasEditorHandle } from "@/components/CanvasEditor";

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
        <div className="flex items-center">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateChange={handleTemplateChange}
          />
        </div>
        <div className="flex items-center">
          <ExportButton onExport={handleExport} disabled={isExporting} />
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

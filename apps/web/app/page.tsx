"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "@/lib/config";
import { Template, ImageAssignment } from "@/types";
import { getDefaultTemplate } from "@/lib/templates";
import TemplateSelector from "@/components/TemplateSelector";
import SaveButton from "@/components/SaveButton";
import type { CanvasEditorHandle } from "@/components/CanvasEditor";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Navigation } from "@/components/Navigation";
import { ImageSidebar } from "@/components/ImageSidebar";
import { useResizableSidebar } from "@/hooks/useResizableSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

// Dynamically import CanvasEditor to avoid SSR issues with Konva
const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
});

function HomeContent() {
  const canvasEditorHandleRef = useRef<CanvasEditorHandle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    getDefaultTemplate()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [imageAssignments, setImageAssignments] = useState<
    Map<string, ImageAssignment>
  >(new Map());
  const { toast } = useToast();

  // Sidebar state from context
  const { sidebarWidth, setSidebarWidth } = useSidebar();

  // Resizable sidebar hook
  const { width, isResizing, handleMouseDown } = useResizableSidebar({
    defaultWidth: sidebarWidth,
    minWidth: 200,
    maxWidth: 800,
    onWidthChange: setSidebarWidth,
  });

  const handleTemplateChange = (template: Template) => {
    setSelectedTemplate(template);
    // Clear image assignments when template changes
    setImageAssignments(new Map());
    // Reset dirty flag since canvas is now empty
    setIsDirty(false);
  };

  const handleExportReady = useCallback((handle: CanvasEditorHandle) => {
    canvasEditorHandleRef.current = handle;
  }, []);

  // Track changes to imageAssignments to mark canvas as dirty
  useEffect(() => {
    // Mark as dirty if there are any image assignments
    if (imageAssignments.size > 0) {
      setIsDirty(true);
    }
  }, [imageAssignments]);

  const handleSave = async () => {
    if (!canvasEditorHandleRef.current || isSaving) return;

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
        // Clear dirty flag after successful save
        setIsDirty(false);
      } else {
        throw new Error(result.error || "Failed to save image");
      }
    } catch (error) {
      toast({
        title: "Save error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate if all slots are filled
  const allSlotsFilled =
    imageAssignments.size === selectedTemplate.slots.length &&
    imageAssignments.size > 0;

  return (
    <main className="flex h-screen flex-col bg-background">
      {/* Top bar - full width */}
      <Navigation>
        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onTemplateChange={handleTemplateChange}
        />
        <SaveButton
          onSave={handleSave}
          disabled={isSaving || !allSlotsFilled || !isDirty}
          isSaving={isSaving}
        />
        <ThemeToggle />
      </Navigation>

      {/* Main content area - flexbox horizontal layout */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left sidebar */}
        <ImageSidebar
          width={width}
          isResizing={isResizing}
          onResizeStart={handleMouseDown}
        />

        {/* Canvas area - centered and responsive */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-background">
          {/* Canvas container with 16:9 aspect ratio */}
          <div
            className="relative bg-card border border-border shadow-sm"
            style={{
              width: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            }}
          >
            {/* Canvas container div for react-konva Stage */}
            <div id="canvas-container" className="w-full h-full">
              <CanvasEditor
                template={selectedTemplate}
                onExportReady={handleExportReady}
                imageAssignments={imageAssignments}
                setImageAssignments={setImageAssignments}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <SidebarProvider>
      <HomeContent />
    </SidebarProvider>
  );
}

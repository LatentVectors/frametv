"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Stage, Layer, Group, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PREVIEW_MIN_WIDTH,
  PREVIEW_MIN_HEIGHT,
  CANVAS_BACKGROUND_COLOR,
} from "@/lib/config";
import { Template, ImageAssignment } from "@/types";
import {
  isValidImageFile,
  createImageUrl,
  loadImageFromUrl,
} from "@/lib/imageUtils";
import { useToast } from "@/hooks/use-toast";
import Slot from "./Slot";
import ImageLayer from "./ImageLayer";
import { ImageEditButton } from "./ImageEditButton";

interface CanvasEditorProps {
  template: Template;
  onExportReady?: (handle: CanvasEditorHandle) => void;
  imageAssignments: Map<string, ImageAssignment>;
  setImageAssignments: React.Dispatch<
    React.SetStateAction<Map<string, ImageAssignment>>
  >;
}

export interface CanvasEditorHandle {
  getCanvasDataUrl: () => Promise<string>;
}

const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  ({ template, onExportReady, imageAssignments, setImageAssignments }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const { toast } = useToast();
    const [canvasSize, setCanvasSize] = useState({
      width: PREVIEW_MIN_WIDTH,
      height: PREVIEW_MIN_HEIGHT,
    });
    const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [activeEditSlotId, setActiveEditSlotId] = useState<string | null>(null);
    const [hoveringEditButtonSlotId, setHoveringEditButtonSlotId] = useState<string | null>(null);

    const hoverClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoveringEditButtonSlotIdRef = useRef<string | null>(null);
    const activeEditSlotIdRef = useRef<string | null>(null);

    useEffect(() => {
      hoveringEditButtonSlotIdRef.current = hoveringEditButtonSlotId;
    }, [hoveringEditButtonSlotId]);

    useEffect(() => {
      activeEditSlotIdRef.current = activeEditSlotId;
    }, [activeEditSlotId]);

    useEffect(() => {
      return () => {
        if (hoverClearTimeoutRef.current) {
          clearTimeout(hoverClearTimeoutRef.current);
        }
      };
    }, []);

    const clearHoverTimeout = useCallback(() => {
      if (hoverClearTimeoutRef.current) {
        clearTimeout(hoverClearTimeoutRef.current);
        hoverClearTimeoutRef.current = null;
      }
    }, []);

    useEffect(() => {
      const updateCanvasSize = () => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate canvas size based on available container space
        // Maintain 16:9 aspect ratio and fit within container
        const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        
        let width = containerWidth;
        let height = width / aspectRatio;

        // If height exceeds container, constrain by height instead
        if (height > containerHeight) {
          height = containerHeight;
          width = height * aspectRatio;
        }

        setCanvasSize({ width, height });
      };

      // Use ResizeObserver to detect container size changes
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });

      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      // Initial size calculation
      updateCanvasSize();

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Reset hovered slot and selected slot when template changes
    useEffect(() => {
      setHoveredSlotId(null);
      setSelectedSlotId(null);
    }, [template.id]);

    // Calculate scale factor to convert from canvas internal coordinates (3840×2160) to preview size
    const scaleX = useMemo(
      () => canvasSize.width / CANVAS_WIDTH,
      [canvasSize.width]
    );
    const scaleY = useMemo(
      () => canvasSize.height / CANVAS_HEIGHT,
      [canvasSize.height]
    );

    /**
     * Find which slot contains the given canvas coordinates
     * @param canvasX - X coordinate in canvas space (0 to CANVAS_WIDTH)
     * @param canvasY - Y coordinate in canvas space (0 to CANVAS_HEIGHT)
     * @returns Slot ID if found, null otherwise
     */
    const findSlotAtCanvasCoordinates = useCallback(
      (canvasX: number, canvasY: number): string | null => {
        // Convert canvas coordinates to percentage
        const percentX = (canvasX / CANVAS_WIDTH) * 100;
        const percentY = (canvasY / CANVAS_HEIGHT) * 100;

        // Find slot that contains these percentage coordinates
        for (const slot of template.slots) {
          if (
            percentX >= slot.x &&
            percentX <= slot.x + slot.width &&
            percentY >= slot.y &&
            percentY <= slot.y + slot.height
          ) {
            return slot.id;
          }
        }

        return null;
      },
      [template]
    );

    /**
     * Handle drag over event - prevent default to allow drop
     */
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    /**
     * Calculate initial transform for image to center and fill slot
     * @param image - Loaded image element
     * @param slot - Slot to fit image into
     * @returns Initial transform values (x, y, scaleX, scaleY) relative to slot
     */
    const calculateInitialTransform = (
      image: HTMLImageElement,
      slot: { width: number; height: number }
    ): { x: number; y: number; scaleX: number; scaleY: number } => {
      // Convert slot percentage dimensions to canvas pixel dimensions
      const slotWidth = (slot.width / 100) * CANVAS_WIDTH;
      const slotHeight = (slot.height / 100) * CANVAS_HEIGHT;

      // Calculate scale to fill slot while maintaining aspect ratio
      const scaleX = slotWidth / image.width;
      const scaleY = slotHeight / image.height;

      // Use the larger scale to ensure the image fills the slot (crops excess)
      const scale = Math.max(scaleX, scaleY);

      // Calculate scaled image dimensions
      const scaledWidth = image.width * scale;
      const scaledHeight = image.height * scale;

      // Center the image within the slot
      const x = (slotWidth - scaledWidth) / 2;
      const y = (slotHeight - scaledHeight) / 2;

      return {
        x,
        y,
        scaleX: scale,
        scaleY: scale,
      };
    };

    /**
     * Handle filesystem file drop
     */
    const handleFileSystemDrop = useCallback(
      async (
        file: File,
        slotId: string,
        slot: { width: number; height: number }
      ) => {
        try {
          // Create object URL for the image
          const imageUrl = createImageUrl(file);

          // Load the image from the URL
          const image = await loadImageFromUrl(imageUrl);

          // Calculate initial transform (center and scale to fill)
          const transform = calculateInitialTransform(image, slot);

          // Create image assignment with original dimensions for preview scaling
          const assignment: ImageAssignment = {
            slotId,
            imageUrl,
            x: transform.x,
            y: transform.y,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            originalWidth: image.width,
            originalHeight: image.height,
          };

          // Update image assignments
          setImageAssignments((prev) => {
            const newMap = new Map(prev);
            newMap.set(slotId, assignment);
            return newMap;
          });
        } catch (error) {
          toast({
            title: "Image loading error",
            description: "Failed to load the image. Please try again.",
            variant: "destructive",
          });
        }
      },
      [toast, setImageAssignments]
    );

    /**
     * Handle sidebar image drop
     * Loads image from the file path using API
     */
    const handleSidebarImageDrop = useCallback(
      async (
        imagePath: string,
        slotId: string,
        slot: { width: number; height: number }
      ) => {
        try {
          // Fetch the image from the gallery API endpoint
          const response = await fetch(
            `/api/gallery/image?path=${encodeURIComponent(imagePath)}`
          );
          if (!response.ok) {
            throw new Error("Failed to load image from path");
          }

          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);

          // Load the image from the URL
          const image = await loadImageFromUrl(imageUrl);

          // Calculate initial transform (center and scale to fill)
          const transform = calculateInitialTransform(image, slot);

          // Create image assignment with original dimensions for preview scaling
          const assignment: ImageAssignment = {
            slotId,
            imageUrl,
            x: transform.x,
            y: transform.y,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
            originalWidth: image.width,
            originalHeight: image.height,
          };

          // Update image assignments
          setImageAssignments((prev) => {
            const newMap = new Map(prev);
            newMap.set(slotId, assignment);
            return newMap;
          });
        } catch (error) {
          toast({
            title: "Image loading error",
            description:
              "Failed to load the image from sidebar. Please try again.",
            variant: "destructive",
          });
        }
      },
      [toast, setImageAssignments]
    );

    /**
     * Handle drop event - assign image to slot if valid
     * Supports both filesystem drops and sidebar image drops
     */
    const handleDrop = useCallback(
      async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Get drop coordinates relative to the container
        if (!containerRef.current) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();

        // Calculate drop coordinates relative to container
        const dropX = e.clientX - containerRect.left;
        const dropY = e.clientY - containerRect.top;

        // Convert screen coordinates to canvas coordinates
        // Stage is scaled, so we need to convert back to internal canvas coordinates
        const canvasX = dropX / scaleX;
        const canvasY = dropY / scaleY;

        // Find which slot contains the drop coordinates
        const slotId = findSlotAtCanvasCoordinates(canvasX, canvasY);

        // If drop is outside any slot, ignore silently (as per requirement)
        if (!slotId) {
          return;
        }

        // Find the slot object
        const slot = template.slots.find((s) => s.id === slotId);
        if (!slot) {
          return;
        }

        // Check if this is a sidebar image drop (custom type set by ImageThumbnail)
        const sidebarImagePath = e.dataTransfer.getData("image/sidebar");

        if (sidebarImagePath) {
          // Handle sidebar image drop
          await handleSidebarImageDrop(sidebarImagePath, slotId, slot);
        } else {
          // Handle filesystem drop
          const files = Array.from(e.dataTransfer.files);
          if (files.length === 0) return;

          // For MVP, only handle the first file
          const file = files[0];

          // Validate file type
          if (!isValidImageFile(file)) {
            toast({
              title: "Invalid file type",
              description: "Please drop JPEG or PNG images.",
              variant: "destructive",
            });
            return;
          }

          await handleFileSystemDrop(file, slotId, slot);
        }
      },
      [
        template,
        scaleX,
        scaleY,
        toast,
        findSlotAtCanvasCoordinates,
        handleFileSystemDrop,
        handleSidebarImageDrop,
      ]
    );

    /**
     * Generate canvas as JPEG data URL at full resolution (3840×2160)
     */
    const generateCanvasDataUrl = useCallback(async (): Promise<string> => {
      // Create a temporary full-resolution stage
      const exportStage = new Konva.Stage({
        container: document.createElement("div"),
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });

      const exportLayer = new Konva.Layer();
      exportStage.add(exportLayer);

      // Render background
      const background = new Konva.Rect({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        fill: CANVAS_BACKGROUND_COLOR,
      });
      exportLayer.add(background);

      // Load and render all images at full resolution
      const imagePromises = Array.from(imageAssignments.entries()).map(
        async ([slotId, assignment]) => {
          const slot = template.slots.find((s) => s.id === slotId);
          if (!slot) return null;

          // Load image at full resolution
          const image = await loadImageFromUrl(assignment.imageUrl);

          // Convert slot percentage coordinates to canvas pixel coordinates
          const slotX = (slot.x / 100) * CANVAS_WIDTH;
          const slotY = (slot.y / 100) * CANVAS_HEIGHT;
          const slotWidth = (slot.width / 100) * CANVAS_WIDTH;
          const slotHeight = (slot.height / 100) * CANVAS_HEIGHT;

          // Calculate image position and dimensions in canvas space
          const imageWidth = image.width * assignment.scaleX;
          const imageHeight = image.height * assignment.scaleY;
          const imageX = slotX + assignment.x;
          const imageY = slotY + assignment.y;

          // Create clipping group for slot
          const clipGroup = new Konva.Group({
            clipX: slotX,
            clipY: slotY,
            clipWidth: slotWidth,
            clipHeight: slotHeight,
          });

          // Handle horizontal mirroring
          const mirrorX = assignment.mirrorX ?? false;
          const imageScaleX = mirrorX ? -1 : 1;
          const imageOffsetX = mirrorX ? imageWidth : 0;

          // Create image node
          const konvaImage = new Konva.Image({
            image: image,
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
            scaleX: imageScaleX,
            offsetX: imageOffsetX,
          });

          // Apply filters if any are set
          const filters: any[] = [];
          
          if (assignment.brightness !== undefined && assignment.brightness !== 0) {
            filters.push(Konva.Filters.Brighten);
          }
          
          if (assignment.contrast !== undefined && assignment.contrast !== 0) {
            filters.push(Konva.Filters.Contrast);
          }
          
          if (assignment.saturation !== undefined && assignment.saturation !== 0) {
            filters.push(Konva.Filters.HSL);
          }

          if (filters.length > 0) {
            konvaImage.filters(filters);
            
            if (assignment.brightness !== undefined && assignment.brightness !== 0) {
              konvaImage.brightness(assignment.brightness / 100);
            }
            
            if (assignment.contrast !== undefined && assignment.contrast !== 0) {
              konvaImage.contrast(assignment.contrast);
            }
            
            if (assignment.saturation !== undefined && assignment.saturation !== 0) {
              konvaImage.saturation(assignment.saturation / 50);
            }
            
            konvaImage.cache();
          }

          clipGroup.add(konvaImage);
          exportLayer.add(clipGroup);

          return clipGroup;
        }
      );

      // Wait for all images to load and render
      await Promise.all(imagePromises);

      // Draw the layer to ensure everything is rendered
      exportLayer.draw();

      // Wait for the next animation frame to ensure images are fully rendered
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Generate JPEG data URL
      const dataUrl = exportStage.toDataURL({
        mimeType: "image/jpeg",
        quality: 0.95,
        pixelRatio: 1, // Use 1:1 pixel ratio for full resolution
      });

      // Cleanup
      exportStage.destroy();

      return dataUrl;
    }, [imageAssignments, template]);

    /**
     * Get canvas as JPEG data URL at full resolution (3840×2160)
     */
    const getCanvasDataUrl = useCallback(async (): Promise<string> => {
      return await generateCanvasDataUrl();
    }, [generateCanvasDataUrl]);

    // Optimize event handlers with useCallback
    const handleStageClick = useCallback((e: any) => {
      // Deselect if clicking on empty canvas (not on an image or slot)
      const stage = e.target.getStage();
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty) {
        setSelectedSlotId(null);
      }
    }, []);

    const handleSlotMouseEnter = useCallback(
      (slotId: string) => {
        clearHoverTimeout();
        setHoveredSlotId(slotId);
      },
      [clearHoverTimeout]
    );

    const handleSlotMouseLeave = useCallback(
      (slotId: string) => {
        clearHoverTimeout();
        hoverClearTimeoutRef.current = setTimeout(() => {
          setHoveredSlotId((current) => {
            if (current !== slotId) {
              return current;
            }

            if (
              hoveringEditButtonSlotIdRef.current === slotId ||
              activeEditSlotIdRef.current === slotId
            ) {
              return current;
            }

            return null;
          });
          hoverClearTimeoutRef.current = null;
        }, 80);
      },
      [clearHoverTimeout]
    );
    const handleEditButtonMouseEnter = useCallback(
      (slotId: string) => {
        clearHoverTimeout();
        setHoveringEditButtonSlotId(slotId);
        setHoveredSlotId(slotId);
      },
      [clearHoverTimeout]
    );

    const handleEditButtonMouseLeave = useCallback(
      (slotId: string) => {
        clearHoverTimeout();
        setHoveringEditButtonSlotId((current) =>
          current === slotId ? null : current
        );

        setHoveredSlotId((current) => {
          if (current !== slotId) {
            return current;
          }

          if (activeEditSlotId === slotId) {
            return current;
          }

          return null;
        });
      },
      [activeEditSlotId, clearHoverTimeout]
    );


    const handleSlotClick = useCallback(
      (slotId: string) => {
        return (e: any) => {
          e.cancelBubble = true;
          // Deselect if clicking on empty slot (slot without image)
          if (!imageAssignments.has(slotId)) {
            setSelectedSlotId(null);
          }
        };
      },
      [imageAssignments]
    );

    const handleImageSelect = useCallback((slotId: string) => {
      setSelectedSlotId(slotId);
    }, []);

    const handleTransformUpdate = useCallback(
      (slotId: string) => {
        return (x: number, y: number) => {
          setImageAssignments((prev) => {
            const newMap = new Map(prev);
            const existingAssignment = newMap.get(slotId);
            if (existingAssignment) {
              newMap.set(slotId, {
                ...existingAssignment,
                x,
                y,
              });
            }
            return newMap;
          });
        };
      },
      [setImageAssignments]
    );

    const handleScaleUpdate = useCallback(
      (slotId: string) => {
        return (scaleX: number, scaleY: number) => {
          setImageAssignments((prev) => {
            const newMap = new Map(prev);
            const existingAssignment = newMap.get(slotId);
            if (existingAssignment) {
              newMap.set(slotId, {
                ...existingAssignment,
                scaleX,
                scaleY,
              });
            }
            return newMap;
          });
        };
      },
      [setImageAssignments]
    );

    const handleFilterUpdate = useCallback(
      (slotId: string) => {
        return (updates: Partial<ImageAssignment>) => {
          setImageAssignments((prev) => {
            const newMap = new Map(prev);
            const existingAssignment = newMap.get(slotId);
            if (existingAssignment) {
              newMap.set(slotId, {
                ...existingAssignment,
                ...updates,
              });
            }
            return newMap;
          });
        };
      },
      [setImageAssignments]
    );

    const handleEditMenuOpenChange = useCallback(
      (slotId: string) => {
        return (open: boolean) => {
          setActiveEditSlotId((prev) => {
            if (open) {
              return slotId;
            }
            return prev === slotId ? null : prev;
          });

          if (open) {
            setHoveredSlotId(slotId);
          }
        };
      },
      [setHoveredSlotId]
    );

    // Memoize image assignments array to prevent unnecessary re-renders
    const imageAssignmentsArray = useMemo(
      () => Array.from(imageAssignments.entries()),
      [imageAssignments]
    );

    // Expose canvas data URL function via ref
    useImperativeHandle(
      ref,
      () => ({
        getCanvasDataUrl,
      }),
      [getCanvasDataUrl]
    );

    // Also expose via callback for dynamic import compatibility
    const handleRef = useRef({ getCanvasDataUrl });
    handleRef.current = { getCanvasDataUrl };

    useEffect(() => {
      if (onExportReady) {
        onExportReady(handleRef.current);
      }
    }, [onExportReady, getCanvasDataUrl]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ backgroundColor: CANVAS_BACKGROUND_COLOR }}
          onClick={handleStageClick}
        >
          <Layer ref={layerRef}>
            {/* Render all slots for the selected template */}
            {template.slots.map((slot) => (
              <Slot
                key={slot.id}
                slot={slot}
                scaleX={scaleX}
                scaleY={scaleY}
                isHovered={hoveredSlotId === slot.id}
                onMouseEnter={() => handleSlotMouseEnter(slot.id)}
                onMouseLeave={() => handleSlotMouseLeave(slot.id)}
                onClick={handleSlotClick(slot.id)}
              />
            ))}
            {/* Render assigned images */}
            {imageAssignmentsArray.map(([slotId, assignment]) => {
              const slot = template.slots.find((s) => s.id === slotId);
              if (!slot) return null;
              return (
                <ImageLayer
                  key={slotId}
                  assignment={assignment}
                  slot={slot}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  isSelected={selectedSlotId === slotId}
                  onSelect={() => handleImageSelect(slotId)}
                  onTransformUpdate={handleTransformUpdate(slotId)}
                  onScaleUpdate={handleScaleUpdate(slotId)}
                  onMouseEnter={() => handleSlotMouseEnter(slotId)}
                  onMouseLeave={() => handleSlotMouseLeave(slotId)}
                />
              );
            })}
            {/* Render selection border on top of everything */}
            {selectedSlotId && (() => {
              const selectedSlot = template.slots.find((s) => s.id === selectedSlotId);
              if (!selectedSlot) return null;
              
              const slotX = (selectedSlot.x / 100) * CANVAS_WIDTH * scaleX;
              const slotY = (selectedSlot.y / 100) * CANVAS_HEIGHT * scaleY;
              const slotWidth = (selectedSlot.width / 100) * CANVAS_WIDTH * scaleX;
              const slotHeight = (selectedSlot.height / 100) * CANVAS_HEIGHT * scaleY;
              
              return (
                <Rect
                  x={slotX}
                  y={slotY}
                  width={slotWidth}
                  height={slotHeight}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="transparent"
                  listening={false}
                />
              );
            })()}
          </Layer>
        </Stage>

        {/* HTML overlay for edit buttons */}
        <div className="absolute inset-0 pointer-events-none">
          {imageAssignmentsArray.map(([slotId, assignment]) => {
            const slot = template.slots.find((s) => s.id === slotId);
            if (!slot) return null;
            
            // Only show edit button when slot is hovered or edit menu is active
            const isButtonVisible = hoveredSlotId === slotId || activeEditSlotId === slotId;
            
            // Calculate button position (top-right corner of slot)
            const slotX = (slot.x / 100) * CANVAS_WIDTH * scaleX;
            const slotY = (slot.y / 100) * CANVAS_HEIGHT * scaleY;
            const slotWidth = (slot.width / 100) * CANVAS_WIDTH * scaleX;
            
            const buttonX = slotX + slotWidth - 40; // 40px from right edge
            const buttonY = slotY + 8; // 8px from top edge
            
            return (
              <ImageEditButton
                key={`edit-${slotId}`}
                assignment={assignment}
                onUpdate={handleFilterUpdate(slotId)}
                onMouseEnter={() => handleEditButtonMouseEnter(slotId)}
                onMouseLeave={() => handleEditButtonMouseLeave(slotId)}
                visible={isButtonVisible}
                onOpenChange={handleEditMenuOpenChange(slotId)}
                style={{
                  top: `${buttonY}px`,
                  left: `${buttonX}px`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

CanvasEditor.displayName = "CanvasEditor";

export default CanvasEditor;

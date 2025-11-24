"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: "add" | "reset") => void;
  selectedCount: number;
  newCount: number;
  removeCount: number;
}

export function SyncModal({
  open,
  onClose,
  onConfirm,
  selectedCount,
  newCount,
  removeCount,
}: SyncModalProps) {
  const [selectedMode, setSelectedMode] = useState<"add" | "reset" | null>(null);

  const handleConfirm = () => {
    if (selectedMode) {
      onConfirm(selectedMode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sync Images to TV</DialogTitle>
          <DialogDescription>
            {selectedCount} {selectedCount === 1 ? "image" : "images"} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedMode === "add"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => setSelectedMode("add")}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  selectedMode === "add"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {selectedMode === "add" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  Add to existing images on TV
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload new images while keeping all current TV content. Manually
                  uploaded images are preserved.
                </p>
                {newCount > 0 && (
                  <p className="text-sm text-primary mt-2 font-medium">
                    {newCount} new {newCount === 1 ? "image" : "images"} will be uploaded
                  </p>
                )}
              </div>
            </div>
          </div>

          <div
            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedMode === "reset"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => setSelectedMode("reset")}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  selectedMode === "reset"
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {selectedMode === "reset" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  Replace all images on TV with selection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Remove unselected images and upload new ones. Manually uploaded
                  images are preserved.
                </p>
                <div className="mt-2 space-y-1">
                  {newCount > 0 && (
                    <p className="text-sm text-primary font-medium">
                      {newCount} new {newCount === 1 ? "image" : "images"} will be uploaded
                    </p>
                  )}
                  {removeCount > 0 && (
                    <p className="text-sm text-destructive font-medium">
                      {removeCount} {removeCount === 1 ? "image" : "images"} will be removed
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMode}
          >
            Sync {selectedCount} {selectedCount === 1 ? "Image" : "Images"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


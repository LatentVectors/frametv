"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ExportButtonProps {
  onExport: () => void;
  disabled?: boolean;
}

export default function ExportButton({ onExport, disabled = false }: ExportButtonProps) {
  return (
    <Button
      onClick={onExport}
      disabled={disabled}
      variant="default"
      className="min-w-[100px]"
    >
      {disabled ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        "Export JPEG"
      )}
    </Button>
  );
}


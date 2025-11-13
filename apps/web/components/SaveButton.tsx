"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SaveButtonProps {
  onSave: () => void;
  disabled?: boolean;
}

export default function SaveButton({ onSave, disabled = false }: SaveButtonProps) {
  return (
    <Button
      onClick={onSave}
      disabled={disabled}
      variant="default"
      className="min-w-[100px] ml-2"
    >
      {disabled ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save Image"
      )}
    </Button>
  );
}


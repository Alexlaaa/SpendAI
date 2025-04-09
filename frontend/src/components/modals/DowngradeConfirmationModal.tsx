"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Info } from "lucide-react";

// Define Tier type matching backend/frontend usage
type Tier = "tier1" | "tier2" | "tier3";

interface DowngradeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string | undefined; // e.g., "Tier 1"
  currentTierName: string | undefined; // e.g., "Tier 3"
  onConfirm: () => Promise<void>; // The function to call when downgrade is confirmed
}

const DowngradeConfirmationModal: React.FC<DowngradeConfirmationModalProps> = ({
  isOpen,
  onClose,
  planName,
  currentTierName,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      // Success message could be handled by the toast in the calling component
      onClose(); // Close modal on success
    } catch (error) {
      console.error("Downgrade failed:", error);
      // Error message could be handled by the toast in the calling component
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset processing state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsProcessing(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5 text-blue-500" />
            Confirm Plan Change
          </DialogTitle>
          <DialogDescription>
            You are changing from{" "}
            <span className="font-semibold">{currentTierName}</span> to{" "}
            <span className="font-semibold">{planName}</span>. Your new plan and
            billing will take effect at the start of your next billing cycle.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DowngradeConfirmationModal;

"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface RenameChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => Promise<void>; // Make it async to handle loading
  currentTitle: string;
}

export const RenameChatModal: React.FC<RenameChatModalProps> = ({
  isOpen,
  onClose,
  onRename,
  currentTitle,
}) => {
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();

  // Reset title when modal opens with a new conversation
  useEffect(() => {
    if (isOpen) {
      setNewTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);

  const handleRenameClick = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Chat title cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (newTitle.trim() === currentTitle) {
      // Let Dialog handle closing through onOpenChange
      onClose();
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(newTitle.trim());
      
      // Re-enable toast with shorter timeout
      toast({
        title: "Success", 
        description: "Chat renamed successfully.",
      });
      
      // Rely on onOpenChange to call onClose after dialog closes itself
      // onClose(); // Removed explicit call here
    } catch (error: any) {
      console.error("Failed to rename chat:", error);
      toast({
        title: "Error Renaming Chat",
        description: error.message || "Could not rename the chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  // Handle Enter key press in input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleRenameClick();
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && !isRenaming) {
          // Only trigger onClose when dialog is actually closing and not in renaming state
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Enter a new title for this conversation. Click save when you&#39;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chat-title" className="text-right">
              Title
            </Label>
            <Input
              id="chat-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown} // Add keydown listener
              className="col-span-3"
              disabled={isRenaming}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRenaming}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleRenameClick} disabled={isRenaming || !newTitle.trim() || newTitle.trim() === currentTitle}>
            {isRenaming ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

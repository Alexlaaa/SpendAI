"use client";

import React, { useState } from "react"; // Removed useRef
import { cn } from "@/lib/utils";
import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"; // Added Trash2 icon
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Corrected import path
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameChatModal } from "@/components/modals/RenameChatModal";

// Interface matching backend DTO (using _id)
interface Conversation {
  _id: string;
  title: string;
  // Add other fields if needed later (e.g., last message timestamp)
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>; // Add delete handler prop
  className?: string;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  onRename,
  onDelete, // Destructure delete handler
  className,
  isLoading = false,
}: ConversationListProps) {
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete
  // Removed newChatButtonRef

  const handleOpenRenameModal = (conversation: Conversation) => {
    setConversationToRename(conversation);
    setIsRenameModalOpen(true);
  };

  const handleCloseRenameModal = () => {
    setIsRenameModalOpen(false);
    setConversationToRename(null);
  };

  const handleRenameSubmit = async (newTitle: string) => {
    if (conversationToRename) {
      try {
        // Call the passed-in onRename function from the parent
        await onRename(conversationToRename._id, newTitle);
        handleCloseRenameModal(); // Explicitly close modal on success
      } catch (error) {
        // Error is handled by parent toast, modal remains open for user correction or cancellation
        console.error("Rename failed in list component:", error);
      }
      // No finally block needed here as modal state is handled explicitly on success/error
    }
  };

  const handleOpenDeleteConfirm = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    // The AlertDialogTrigger will open the dialog
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      setIsDeleting(true);
      try {
        await onDelete(conversationToDelete._id);
        // Parent component handles UI update and toast
        setConversationToDelete(null); // Explicitly close dialog on success
      } catch (error) {
        // Parent component handles error toast
        console.error("Deletion failed in list component:", error);
        // Keep dialog open on error? Or close? Let's close it for now.
        // If we want it to stay open, remove the setConversationToDelete(null) from finally.
      } finally {
        setIsDeleting(false); // Reset loading state regardless of success/failure
        // If an error occurred, the dialog might still be open here unless closed in catch.
        // If it succeeded, setConversationToDelete(null) in try block already closed it.
        // Let's ensure it's cleared here too, in case the catch block logic changes.
        // However, relying on onOpenChange might be cleaner if it works reliably.
        // Let's stick to closing explicitly on success for now.
      }
    }
   };

  // Handle dialog close separately to ensure proper focus management
  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Only clear the state after the dialog closes properly
      setConversationToDelete(null);
    }
  };

  return (
    <>
      <div className={cn("flex flex-col h-full w-72 border-r bg-muted/40", className)}> {/* Removed p-2 from main container */}
        {/* New Chat Button */}
        <div className="p-3 border-b"> {/* Use p-3 to match ChatInterface header, removed space-y, mb-2 */}
          <Button
            // Removed ref assignment
            onClick={onNewChat}
            variant="outline"
            // Apply padding directly if needed, or rely on container padding
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversation List Area */}
        {/* Added p-2 here for internal padding */}
        <div className="flex-1 overflow-y-auto space-y-1 p-2 pr-1"> {/* Added p-2, kept pr-1 */}
           <div className="flex items-center justify-between mb-2 px-2">
             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversations</span>
           </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              {conversations.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground px-2 text-center py-4">No conversations yet.</p>
              )}
              {conversations.map((conversation) => (
                // Apply selected background to the parent div
                <div
                  key={conversation._id}
                  className={cn(
                    "flex items-center group rounded-lg transition-colors", // Added transition
                    selectedId === conversation._id
                      ? "bg-primary/15" // Apply selected background here
                      : "hover:bg-accent" // Apply hover background here
                  )}
                >
                  <button
                    onClick={() => onSelect(conversation._id)}
                    className={cn(
                      "flex-1 text-left px-3 py-2 text-sm rounded-l-lg truncate", // Removed transition-colors, bg-primary/15, hover:bg-accent
                      selectedId === conversation._id
                        ? "text-primary font-semibold" // Keep selected text style
                        : "text-foreground/80 group-hover:text-foreground" // Adjust hover text based on parent group hover
                    )}
                    title={conversation.title}
                  >
                    {conversation.title}
                  </button>
                  {/* Dropdown Menu Trigger */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100",
                          // Remove selected background, rely on parent div's background
                          selectedId === conversation._id ? "opacity-100" : "", // Keep opacity logic
                          "focus-visible:ring-1 focus-visible:ring-ring",
                           // Adjust hover text color based on parent group hover
                          selectedId !== conversation._id && "group-hover:text-accent-foreground"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    {/* Removed onClick={(e) => e.stopPropagation()} */}
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenRenameModal(conversation)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      {/* Delete Option - Sets state to open AlertDialog */}
                      {/* Removed AlertDialogTrigger wrapper */}
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()} // Prevent closing dropdown immediately
                        onClick={() => handleOpenDeleteConfirm(conversation)} // This sets state to open the dialog below
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {conversationToRename && (
        <RenameChatModal
          isOpen={isRenameModalOpen}
          onClose={handleCloseRenameModal}
          onRename={handleRenameSubmit}
          currentTitle={conversationToRename.title}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {conversationToDelete && (
         <AlertDialog 
           open={!!conversationToDelete} 
           onOpenChange={handleDeleteDialogOpenChange}
         >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                conversation titled &#34;{conversationToDelete.title}&#34; and all its messages. {/* Escaped quotes */}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConversationToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

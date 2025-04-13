"use client";

import React, { useEffect, useState, useCallback, useRef } from "react"; // Added useRef
import { useAuth } from "@/hooks/AuthProvider";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatInterface, ChatMessage } from "@/components/chat/ChatInterface";
import { useToast } from "@/components/ui/use-toast";

// Define types matching backend DTOs (using string IDs)
interface Conversation {
  _id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Re-define Message interface based on backend DTO
interface Message {
  _id: string;
  sender: "user" | "ai";
  content: string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
}

const ChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isAllowed, setIsAllowed] = useState(false);
  const mainChatAreaRef = useRef<HTMLDivElement>(null); // Added ref for main chat area

  // Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Use ChatMessage type
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // --- Auth and Tier Check ---
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/signin");
      } else if (user.tier !== "tier3") {
        toast({
          title: "Access Denied",
          description: "Chat feature requires Tier 3.",
          variant: "destructive",
        });
        router.push("/pricing");
      } else {
        setIsAllowed(true);
      }
    }
  }, [user, authLoading, router, toast]);

  // --- Data Fetching ---
  const fetchConversations = useCallback(async () => {
    if (!isAllowed) return;
    setIsLoadingConversations(true);
    try {
      const response = await fetch("/api/chat"); // Corrected URL for GET conversations
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data: Conversation[] = await response.json();
      setConversations(data);
      // Optionally select the first conversation by default
      // if (data.length > 0 && !selectedConversationId) {
      //   handleSelectConversation(data[0]._id);
      // }
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: `Failed to load conversations: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isAllowed, toast]); // Removed selectedConversationId dependency

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;
      setIsLoadingMessages(true);
      setMessages([]); // Clear previous messages
      try {
        const response = await fetch(
          `/api/chat/conversations/${conversationId}/messages`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data: Message[] = await response.json();
        // Map backend message format to ChatMessage format
        const formattedMessages: ChatMessage[] = data.map((msg) => ({
          id: msg._id,
          role: msg.sender,
          content: msg.content,
          createdAt: msg.createdAt, // Keep as string or Date
        }));
        setMessages(formattedMessages);
      } catch (error: any) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: `Failed to load messages: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [toast]
  );

  // Initial conversation fetch
  useEffect(() => {
    if (isAllowed) {
      fetchConversations();
    }
  }, [isAllowed, fetchConversations]);

  // --- Event Handlers ---
  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      fetchMessages(id);
    },
    [fetchMessages]
  );

  const handleNewChat = async () => {
    setIsLoadingConversations(true); // Indicate loading while creating
    try {
      const response = await fetch("/api/chat", { method: "POST" }); // Corrected URL for POST conversation
      if (!response.ok) {
        throw new Error("Failed to create new conversation");
      }
      const newConversation: Conversation = await response.json();
      // Add to list and select it
      setConversations((prev) => [newConversation, ...prev]);
      handleSelectConversation(newConversation._id);
      toast({
        title: "Success",
        description: "New chat created.",
      });
    } catch (error: any) {
      console.error("Error creating new chat:", error);
      toast({
        title: "Error",
        description: `Failed to create new chat: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const originalConversations = [...conversations]; // Keep for potential revert
    const wasSelected = selectedConversationId === id; // Check if the deleted one was selected

    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to delete conversation" }));
        throw new Error(errorData.message || "Failed to delete conversation");
      }

      // --- Move state updates after successful API call ---
      setConversations((prev) => prev.filter((conv) => conv._id !== id));
      if (wasSelected) {
        setSelectedConversationId(null);
        setMessages([]);
      }
      // --- End moved state updates ---

      // Focus the main chat area before showing the toast
      mainChatAreaRef.current?.focus(); 

      // Re-enable toast with shorter timeout
      toast({
        title: "Success",
        description: "Conversation deleted successfully.",
      });

      // Optionally select another conversation or leave it blank
      // if (conversations.length > 1 && wasSelected) {
      //    handleSelectConversation(conversations.find(c => c._id !== id)?._id ?? '');
      // }
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      // Revert UI only if necessary (already handled by not updating state on error)
      // setConversations(originalConversations); // No need to revert if state wasn't changed yet
      // if (wasSelected) { // If it was selected and error occurred, maybe refetch? Or just show error.
      //   setSelectedConversationId(id);
      // }
      toast({
        title: "Error",
        description: `Failed to delete chat: ${error.message}`,
        variant: "destructive",
      });
      // Re-throw error for the component handler
      throw error; // Propagate error to the calling component (ConversationList) if needed
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    // No optimistic update here
    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Failed to rename conversation" }));
        throw new Error(errorData.message || "Failed to rename conversation");
      }

      // --- Refetch conversations on success instead of optimistic update ---
      await fetchConversations();
      // --- End refetch ---

      // Focus the main chat area before showing the toast
      mainChatAreaRef.current?.focus();

      // Re-enable toast with shorter timeout
      toast({
        title: "Success",
        description: "Chat renamed successfully.",
      });
    } catch (error: any) {
      console.error("Error renaming conversation:", error);
      // No UI state to revert as we didn't update optimistically
      toast({
        title: "Error",
        description: `Failed to rename chat: ${error.message}`,
        variant: "destructive",
      });
      // Re-throw the error so the modal knows it failed
      throw error;
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId || !content.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    const tempUserMessageId = `temp-user-${Date.now()}`; // Use number for temp ID

    // Add user message optimistically using ChatMessage format
    const optimisticUserMessage: ChatMessage = {
      id: tempUserMessageId,
      role: "user",
      content: content.trim(),
      createdAt: new Date(), // Use Date object
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const response = await fetch(
        `/api/chat/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      const aiMessageData: Message = await response.json();

      // Map AI response to ChatMessage format
      const formattedAiMessage: ChatMessage = {
        id: aiMessageData._id,
        role: aiMessageData.sender,
        content: aiMessageData.content, // Keep original content for ChatInterface to parse
        createdAt: aiMessageData.createdAt,
      };

      // Refetch messages to get the latest state including the user's confirmed message and the AI's response
      if (selectedConversationId) {
        fetchMessages(selectedConversationId);
      } else {
        // Fallback: Manually add AI message if refetch isn't possible (shouldn't happen often)
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== tempUserMessageId),
          formattedAiMessage,
        ]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error.message}`,
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessageId));
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Find the title of the selected conversation
  const selectedConversationTitle = React.useMemo(() => {
    return conversations.find((conv) => conv._id === selectedConversationId)
      ?.title;
  }, [conversations, selectedConversationId]);

  // --- Render Logic ---
  if (authLoading || !isAllowed) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    // Apply max-h-[93vh] and overflow-hidden here to constrain the page height
    <div className="flex h-[95vh] max-h-[95vh] overflow-hidden bg-background">
      {" "}
      {/* Reduced height */}
      {/* Conversation List Sidebar */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId ?? undefined}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onRename={handleRenameConversation}
        onDelete={handleDeleteConversation} // Pass the delete handler
        isLoading={isLoadingConversations}
        className="hidden md:flex" // Hide on small screens
      />
      {/* Main Chat Area */}
      <div
        ref={mainChatAreaRef}
        tabIndex={-1} // Make it programmatically focusable
        className="flex-1 flex flex-col h-full overflow-hidden focus:outline-none" // Added ref, tabIndex, and focus style
      >
        {" "}
        {/* Added overflow-hidden */}
        {selectedConversationId ? (
          <ChatInterface
            title={selectedConversationTitle || "Chat"} // Pass the title
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isSendingMessage || isLoadingMessages} // Combine loading states
            userAvatarFallback={user?.firstName?.charAt(0) || "U"}
            // userAvatarSrc is handled by default in ChatInterface
            // aiAvatarSrc is handled by default in ChatInterface
          />
        ) : (
          <div className="flex-1 flex justify-center items-center text-muted-foreground h-full">
            Select a conversation or start a new chat.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;

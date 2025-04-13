"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User } from "lucide-react"; // Added Bot and User icons
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"; // For structure
import { Separator } from "@/components/ui/separator"; // For visual separation

// Message Loading Component (Internal)
function MessageLoading() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="text-foreground"
    >
      <circle cx="4" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_qFRN"
          begin="0;spinner_OcgL.end+0.25s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="12" cy="12" r="2" fill="currentColor">
        <animate
          begin="spinner_qFRN.begin+0.1s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="20" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_OcgL"
          begin="spinner_qFRN.begin+0.2s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
    </svg>
  );
}

// Chat Bubble Components (Internal)
interface ChatBubbleProps {
  variant?: "user" | "ai";
  className?: string;
  children: React.ReactNode;
}

function ChatBubble({
  variant = "ai",
  className,
  children,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 mb-4",
        variant === "user" && "flex-row-reverse",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ChatBubbleMessageProps {
  variant?: "user" | "ai";
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  isError?: boolean; // Add error state
}

function ChatBubbleMessage({
  variant = "ai",
  isLoading,
  isError, // Add error state
  className,
  children,
}: ChatBubbleMessageProps) {
  // Function to safely parse JSON and extract insights
  const parseContent = (content: React.ReactNode): React.ReactNode => {
    if (variant === 'ai' && typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.insights === 'string') {
          // Explicitly replace Unicode escape for dollar sign
          return parsed.insights.replace(/\\u0024/g, '$');
        }
      } catch (e) {
        // Not JSON or doesn't have insights, return original content
        // console.warn("AI message content is not the expected JSON structure:", content);
      }
    }
    return content;
  };

  const displayContent = parseContent(children);

  return (
    <div
      className={cn(
        "rounded-lg p-3 text-sm max-w-md md:max-w-lg lg:max-w-xl break-words", // Added max-width and break-words
        variant === "user"
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground", // Ensure contrast for AI messages
        isError && "bg-destructive text-destructive-foreground", // Style for errors
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <MessageLoading />
        </div>
      ) : (
        // Basic markdown rendering (newlines) for the potentially parsed content
        typeof displayContent === 'string'
          ? displayContent.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))
          : displayContent // Render as is if not a string (e.g., React nodes)
      )}
    </div>
  );
}

interface ChatBubbleAvatarProps {
  src?: string;
  fallback?: string;
  className?: string;
}

function ChatBubbleAvatar({
  src,
  fallback = "AI",
  className,
  role, // Add role to determine icon
}: ChatBubbleAvatarProps & { role: 'user' | 'ai' }) { // Add role to props
  return (
    <Avatar className={cn("h-8 w-8 border", className)}> {/* Added border */}
      {src ? (
        <AvatarImage src={src} alt={role === 'user' ? 'User' : 'AI'} />
      ) : (
        <AvatarFallback className="text-xs"> {/* Smaller fallback text */}
          {fallback}
          {/* Optionally show icons if no image and no specific fallback text */}
          {/* {!fallback && (role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />)} */}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

// Exportable Interface for Message structure expected by ChatInterface
export interface ChatMessage {
  id: string | number; // Allow number for potential temp IDs
  role: "user" | "ai";
  content: string;
  createdAt: Date | string; // Accept Date object or string
}

// Exportable Props interface for ChatInterface
export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean; // Loading state for AI response
  className?: string;
  title?: string; // Add title prop
  userAvatarSrc?: string; // Specific prop for user avatar image source
  aiAvatarSrc?: string; // Specific prop for AI avatar image source
  userAvatarFallback?: string; // Optional fallback for user avatar
  aiAvatarFallback?: string; // Optional fallback for AI avatar
}

// Main Exportable Chat Interface Component
export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  className,
  title = "Chat", // Default title
  userAvatarSrc = "/images/mr.jpg", // Updated default user image path
  aiAvatarSrc = "/images/ai_dp.jpg", // Default AI image path
  userAvatarFallback = "U", // Default user fallback (initial)
  aiAvatarFallback = "AI", // Default AI fallback
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null); // Ref for chat container

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { // Add form event type
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Helper to format date/time
  const formatDate = (date: Date | string) => {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        // Check if date is valid before formatting
        if (isNaN(d.getTime())) {
            return 'Invalid Date';
        }
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Time N/A';
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Chat Header */}
      <div className="border-b p-3 flex items-center justify-between sticky top-0 bg-background z-10">
        <h2 className="text-lg font-semibold truncate" title={title}>{title}</h2>
        {/* Add potential header actions here if needed */}
      </div>

      {/* Message Display Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} variant={message.role}>
            <ChatBubbleAvatar
              role={message.role} // Pass role
              src={message.role === "user" ? userAvatarSrc : aiAvatarSrc}
              fallback={message.role === "user" ? userAvatarFallback : aiAvatarFallback}
            />
            <div className={cn("flex flex-col", message.role === 'user' ? 'items-end' : 'items-start')}>
              <ChatBubbleMessage variant={message.role}>
                {message.content}
              </ChatBubbleMessage>
              <span className="text-xs text-muted-foreground mt-1 px-1">
                {formatDate(message.createdAt)}
              </span>
            </div>
          </ChatBubble>
        ))}
        {/* Show loading indicator specifically for AI response */}
        {isLoading && (
          <ChatBubble variant="ai">
            <ChatBubbleAvatar role="ai" src={aiAvatarSrc} fallback={aiAvatarFallback} />
            <ChatBubbleMessage isLoading />
          </ChatBubble>
        )}
        <div ref={messagesEndRef} /> {/* Element to scroll to */}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-2 sm:p-4 sticky bottom-0">
        <form
          className="relative flex items-start gap-2" // Use items-start for alignment with multi-line textarea
          onSubmit={handleSubmit}
        >
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 resize-none rounded-lg border p-3 shadow-sm focus-visible:ring-1 focus-visible:ring-ring pr-12" // Added padding-right for button space
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            disabled={isLoading}
            rows={1}
            style={{ maxHeight: '150px', overflowY: 'auto' }} // Limit height and allow scroll
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8" // Position button inside textarea
            disabled={!inputValue.trim() || isLoading}
          >
            <Send className="size-4" /> {/* Adjust icon size */}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

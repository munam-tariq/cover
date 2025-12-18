"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Button, Textarea, cn } from "@chatbot/ui";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading || disabled) return;

    onSend(trimmed);
    setMessage("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="relative flex items-end gap-2 p-4 border-t bg-background">
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={cn(
            "min-h-[44px] max-h-[200px] resize-none pr-12",
            "focus-visible:ring-1 focus-visible:ring-ring"
          )}
          rows={1}
        />
        <div className="absolute bottom-1 right-1 text-xs text-muted-foreground p-1">
          {message.length}/2000
        </div>
      </div>
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className={cn(
          "h-[44px] w-[44px] shrink-0 transition-all",
          canSend && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

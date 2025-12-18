"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  Label,
} from "@chatbot/ui";
import { useProject } from "@/contexts/project-context";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * CreateProjectModal - Modal for creating a new project
 *
 * Fields:
 * - Name (required, 1-50 characters)
 * - System Prompt (optional, max 2000 characters)
 */
export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const { createProject } = useProject();
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isNameValid = name.trim().length >= 1 && name.trim().length <= 50;
  const isSystemPromptValid = systemPrompt.length <= 2000;
  const canSubmit = isNameValid && isSystemPromptValid && !isLoading;

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      await createProject({
        name: name.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
      });

      // Reset form
      setName("");
      setSystemPrompt("");

      // Close modal
      onOpenChange(false);

      // Call success callback
      onSuccess?.();
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName("");
      setSystemPrompt("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new chatbot project. You can customize the settings later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name field */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Chatbot"
                maxLength={50}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give your chatbot a name ({name.trim().length}/50)
              </p>
            </div>

            {/* System Prompt field */}
            <div className="grid gap-2">
              <Label htmlFor="systemPrompt">System Prompt (optional)</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant for..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Instructions for how your chatbot should behave. You can change this later in
                Settings. ({systemPrompt.length}/2000)
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

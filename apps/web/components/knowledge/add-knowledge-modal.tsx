"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
} from "@chatbot/ui";
import { Upload, FileText, File, AlertCircle, Loader2, Globe } from "lucide-react";
import { apiClient, apiClientFormData } from "@/lib/api-client";
import { UrlImportFlow } from "./url-import-flow";

interface AddKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

type InputType = "text" | "file" | "pdf" | "url";

const MAX_TEXT_LENGTH = 100000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AddKnowledgeModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: AddKnowledgeModalProps) {
  const [activeTab, setActiveTab] = useState<InputType>("text");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setContent("");
    setSelectedFile(null);
    setError(null);
    setActiveTab("text");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "file" | "pdf"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes =
      type === "pdf" ? ["application/pdf"] : ["text/plain"];
    if (!allowedTypes.includes(file.type)) {
      setError(
        `Invalid file type. Please select a ${type === "pdf" ? "PDF" : "TXT"} file.`
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    // Auto-fill name from filename if empty
    if (!name) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setName(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "file" | "pdf") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Create a synthetic event to reuse the validation logic
    const syntheticEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleFileSelect(syntheticEvent, type);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // Validate based on type
    if (activeTab === "text") {
      if (!content.trim()) {
        setError("Content is required");
        return;
      }
      if (content.length > MAX_TEXT_LENGTH) {
        setError(`Content exceeds ${MAX_TEXT_LENGTH.toLocaleString()} character limit`);
        return;
      }
    } else if (!selectedFile) {
      setError(`Please select a ${activeTab === "pdf" ? "PDF" : "text"} file`);
      return;
    }

    setLoading(true);

    try {
      if (activeTab === "text") {
        // For text content, use JSON endpoint
        await apiClient(`/api/knowledge?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            content,
          }),
        });
      } else if (selectedFile) {
        // For file uploads, use FormData endpoint
        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("file", selectedFile);
        await apiClientFormData(`/api/knowledge/upload?projectId=${projectId}`, formData);
      }

      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "Failed to add knowledge");
    } finally {
      setLoading(false);
    }
  };

  const renderDropZone = (type: "file" | "pdf") => {
    const inputRef = type === "pdf" ? pdfInputRef : fileInputRef;
    const accept = type === "pdf" ? ".pdf" : ".txt";
    const icon = type === "pdf" ? File : FileText;
    const Icon = icon;

    return (
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          selectedFile
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, type)}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e, type)}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-2">
            <Icon className="h-10 w-10 mx-auto text-primary" />
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">
              Drag and drop your {type === "pdf" ? "PDF" : ".txt"} file
            </p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground">Maximum size: 10MB</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Knowledge</DialogTitle>
          <DialogDescription>
            Add content that your chatbot will use to answer questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as InputType);
              setSelectedFile(null);
              setError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="url">
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                URL
              </TabsTrigger>
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="file">Upload TXT</TabsTrigger>
              <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {/* URL Import Tab - Full-screen flow, no name field needed */}
              <TabsContent value="url" className="mt-0">
                <UrlImportFlow
                  projectId={projectId}
                  onSuccess={onSuccess}
                  onClose={handleClose}
                />
              </TabsContent>

              {/* Name field - only show for non-URL tabs */}
              {activeTab !== "url" && (
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Source Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., FAQ Document, Product Info"
                    disabled={loading}
                    maxLength={100}
                  />
                </div>
              )}

              <TabsContent value="text" className="mt-0">
                <div className="space-y-2">
                  <Label htmlFor="content">
                    Content <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your text content here..."
                    disabled={loading}
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {content.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-0">
                {renderDropZone("file")}
              </TabsContent>

              <TabsContent value="pdf" className="mt-0">
                {renderDropZone("pdf")}
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Note: Scanned PDFs (images) are not supported. The PDF must contain actual text.
                </p>
              </TabsContent>
            </div>
          </Tabs>

          {/* Error display - only for non-URL tabs */}
          {activeTab !== "url" && error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Footer - only for non-URL tabs (URL has its own buttons) */}
        {activeTab !== "url" && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Knowledge"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

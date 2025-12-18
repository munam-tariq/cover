"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@chatbot/ui";
import { Loader2, Download, FileText, File } from "lucide-react";
import { Button } from "@chatbot/ui";

interface KnowledgeSource {
  id: string;
  name: string;
  type: "text" | "file" | "pdf";
  status: string;
  content?: string;
  filePath?: string;
}

interface ViewKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string | null;
  projectId: string;
}

export function ViewKnowledgeModal({
  open,
  onOpenChange,
  sourceId,
  projectId,
}: ViewKnowledgeModalProps) {
  const [source, setSource] = useState<KnowledgeSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && sourceId && projectId) {
      fetchSource(sourceId);
    } else {
      setSource(null);
      setError(null);
    }
  }, [open, sourceId, projectId]);

  const fetchSource = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<{ source: KnowledgeSource }>(
        `/api/knowledge/${id}?projectId=${projectId}`
      );
      setSource(data.source);
    } catch (err) {
      console.error("Error fetching source:", err);
      setError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!sourceId || !projectId) return;

    setDownloading(true);
    try {
      const data = await apiClient<{ downloadUrl: string; fileName: string }>(
        `/api/knowledge/${sourceId}/download?projectId=${projectId}`
      );

      // Open the download URL in a new tab/window
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert(err instanceof Error ? err.message : "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const getTypeIcon = () => {
    if (source?.type === "pdf") {
      return <File className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const getTypeLabel = () => {
    switch (source?.type) {
      case "pdf":
        return "PDF Document";
      case "file":
        return "Text File";
      case "text":
        return "Text Content";
      default:
        return "Knowledge Source";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {source && getTypeIcon()}
            {source?.name || "View Knowledge"}
          </DialogTitle>
          <DialogDescription>{source && getTypeLabel()}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
            </div>
          ) : source?.type === "text" ? (
            // Text content - show in scrollable textarea
            <div className="flex-1 overflow-hidden flex flex-col">
              <textarea
                readOnly
                value={source.content || "No content available"}
                className="flex-1 w-full p-4 border border-input rounded-md bg-muted/30 resize-none font-mono text-sm overflow-auto min-h-[300px]"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {source.content?.length || 0} characters
              </p>
            </div>
          ) : (
            // File content - show download option
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted">
                {source?.type === "pdf" ? (
                  <File className="h-12 w-12 text-red-500" />
                ) : (
                  <FileText className="h-12 w-12 text-blue-500" />
                )}
              </div>
              <div className="text-center">
                <p className="font-medium">{source?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {source?.type === "pdf" ? "PDF Document" : "Text File"}
                </p>
              </div>
              <Button onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

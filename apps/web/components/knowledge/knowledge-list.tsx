"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api-client";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@chatbot/ui";
import { Trash2, Plus, FileText, File, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { AddKnowledgeModal } from "./add-knowledge-modal";
import { ViewKnowledgeModal } from "./view-knowledge-modal";

interface KnowledgeSource {
  id: string;
  name: string;
  type: "text" | "file" | "pdf";
  status: "processing" | "ready" | "failed";
  chunkCount: number;
  createdAt: string;
  error?: string;
}

interface KnowledgeListResponse {
  sources: KnowledgeSource[];
}

export function KnowledgeList() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();

  const handleView = (sourceId: string) => {
    setViewingSourceId(sourceId);
    setViewModalOpen(true);
  };

  const fetchSources = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient<KnowledgeListResponse>("/api/knowledge");
      setSources(data.sources);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();

    // Set up realtime subscription for status updates
    const channel = supabase
      .channel("knowledge-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "knowledge_sources",
        },
        (payload) => {
          setSources((prev) =>
            prev.map((s) =>
              s.id === payload.new.id
                ? {
                    ...s,
                    status: payload.new.status as KnowledgeSource["status"],
                    chunkCount: payload.new.chunk_count || 0,
                    error: payload.new.error,
                  }
                : s
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchSources]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge source? This action cannot be undone.")) {
      return;
    }

    setDeleting(id);
    try {
      await apiClient(`/api/knowledge/${id}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete source");
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Ready</Badge>;
      case "processing":
        return <Badge variant="secondary" className="animate-pulse">Processing...</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pdf":
        return "PDF";
      case "file":
        return "Text File";
      case "text":
        return "Text";
      default:
        return type.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div>
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32 mt-1" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Upload and manage your chatbot&apos;s knowledge sources
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setLoading(true);
                fetchSources();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Your chatbot uses this content to answer questions from your customers.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>

      {sources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No knowledge sources yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Add your FAQs, product info, or documentation to help your chatbot answer customer questions accurately.
            </p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Knowledge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(source.type)}
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getTypeLabel(source.type)}
                        {source.status === "ready" && source.chunkCount > 0 && (
                          <> &bull; {source.chunkCount} chunks</>
                        )}
                        {" "}&bull; Added{" "}
                        {new Date(source.createdAt).toLocaleDateString()}
                      </p>
                      {source.error && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {source.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(source.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(source.id)}
                      className="text-muted-foreground hover:text-foreground"
                      title="View content"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(source.id)}
                      disabled={deleting === source.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      {deleting === source.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddKnowledgeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => {
          fetchSources();
          setModalOpen(false);
        }}
      />

      <ViewKnowledgeModal
        open={viewModalOpen}
        onOpenChange={(open) => {
          setViewModalOpen(open);
          if (!open) setViewingSourceId(null);
        }}
        sourceId={viewingSourceId}
      />
    </div>
  );
}

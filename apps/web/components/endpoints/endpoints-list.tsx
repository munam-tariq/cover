"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { useProject } from "@/contexts/project-context";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
} from "@chatbot/ui";
import {
  Trash2,
  Plus,
  AlertCircle,
  RefreshCw,
  Pencil,
  Play,
  Code,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { AddEndpointModal } from "./add-endpoint-modal";

interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: "GET" | "POST";
  authType: "none" | "api_key" | "bearer";
  createdAt: string;
}

interface EndpointListResponse {
  endpoints: ApiEndpoint[];
}

interface TestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  responseTime: number;
  error?: string;
}

export function EndpointsList() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const fetchEndpoints = useCallback(async () => {
    if (!currentProject?.id) return;

    try {
      setError(null);
      const data = await apiClient<EndpointListResponse>(
        `/api/endpoints?projectId=${currentProject.id}`
      );
      setEndpoints(data.endpoints);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch endpoints");
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  // Fetch endpoints when project changes
  useEffect(() => {
    if (!currentProject?.id) return;

    setLoading(true);
    setEndpoints([]); // Clear endpoints when project changes
    setTestResults({}); // Clear test results when project changes
    fetchEndpoints();
  }, [currentProject?.id, fetchEndpoints]);

  const handleDelete = async (id: string) => {
    if (!currentProject?.id) return;

    if (!confirm("Are you sure you want to delete this API endpoint? This action cannot be undone.")) {
      return;
    }

    setDeleting(id);
    try {
      await apiClient(`/api/endpoints/${id}?projectId=${currentProject.id}`, { method: "DELETE" });
      setEndpoints((prev) => prev.filter((e) => e.id !== id));
      // Clear test result for deleted endpoint
      setTestResults((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      console.error("Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete endpoint");
    } finally {
      setDeleting(null);
    }
  };

  const handleTest = async (id: string) => {
    if (!currentProject?.id) return;

    setTesting(id);
    // Clear previous result
    setTestResults((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    try {
      const result = await apiClient<TestResult>(
        `/api/endpoints/${id}/test?projectId=${currentProject.id}`,
        { method: "POST" }
      );
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      console.error("Test error:", err);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          responseTime: 0,
          error: err instanceof Error ? err.message : "Test failed",
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleEdit = (endpoint: ApiEndpoint) => {
    setEditingEndpoint(endpoint);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingEndpoint(null);
  };

  const getAuthBadge = (authType: string) => {
    switch (authType) {
      case "none":
        return <Badge variant="secondary">No Auth</Badge>;
      case "api_key":
        return <Badge variant="default">API Key</Badge>;
      case "bearer":
        return <Badge variant="default">Bearer Token</Badge>;
      default:
        return null;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "GET":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">GET</Badge>;
      case "POST":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">POST</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const renderTestResult = (id: string) => {
    const result = testResults[id];
    if (!result) return null;

    if (result.success) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
          <CheckCircle className="h-4 w-4" />
          <span>
            {result.status} {result.statusText} ({result.responseTime}ms)
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-sm text-destructive mt-2">
          <XCircle className="h-4 w-4" />
          <span>{result.error || "Test failed"}</span>
          {result.responseTime > 0 && (
            <span className="text-muted-foreground">({result.responseTime}ms)</span>
          )}
        </div>
      );
    }
  };

  if (projectLoading || loading) {
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
                      <Skeleton className="h-4 w-64 mt-1" />
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

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Endpoints</h1>
            <p className="text-muted-foreground">No project selected</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">API Endpoints</h1>
            <p className="text-muted-foreground">
              Connect APIs so your chatbot can fetch real-time data
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
                fetchEndpoints();
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
          <h1 className="text-2xl font-bold">API Endpoints</h1>
          <p className="text-muted-foreground">
            Connect APIs so your chatbot can fetch real-time data like order status or inventory.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Endpoint
        </Button>
      </div>

      {endpoints.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No API endpoints configured</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Add your external APIs so the chatbot can fetch real-time data like order status, inventory, or pricing.
            </p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5">
                      <Code className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{endpoint.name}</h3>
                        {getMethodBadge(endpoint.method)}
                        {getAuthBadge(endpoint.authType)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {endpoint.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1 font-mono truncate">
                        {endpoint.url}
                      </p>
                      {renderTestResult(endpoint.id)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTest(endpoint.id)}
                      disabled={testing === endpoint.id}
                      className="text-muted-foreground hover:text-foreground"
                      title="Test endpoint"
                    >
                      {testing === endpoint.id ? (
                        <Clock className="h-4 w-4 animate-pulse" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(endpoint)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(endpoint.id)}
                      disabled={deleting === endpoint.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      {deleting === endpoint.id ? (
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

      <AddEndpointModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        projectId={currentProject.id}
        editEndpoint={editingEndpoint}
        onSuccess={() => {
          fetchEndpoints();
          handleModalClose();
        }}
      />
    </div>
  );
}

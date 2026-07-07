"use client";

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
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

import { useProject } from "@/contexts/project-context";
import { apiClient } from "@/lib/api-client";

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
  const t = useTranslations("dashboard.pages.apiEndpoints");
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
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, t]);

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

    if (!confirm(t("deleteConfirm"))) {
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
      alert(err instanceof Error ? err.message : t("deleteError"));
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
          error: err instanceof Error ? err.message : t("testFailed"),
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
        return <Badge variant="secondary">{t("auth.none")}</Badge>;
      case "api_key":
        return <Badge variant="default">{t("auth.apiKey")}</Badge>;
      case "bearer":
        return <Badge variant="default">{t("auth.bearer")}</Badge>;
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
          <span>{result.error || t("testFailed")}</span>
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
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("noProjectSelected")}</p>
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
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("subtitleShort")}
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
              <RefreshCw className="h-4 w-4 me-2" />
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("addEndpoint")}
        </Button>
      </div>

      {endpoints.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("emptyDescription")}
            </p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t("addEndpoint")}
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
                  <div className="flex shrink-0 items-center gap-1 ms-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTest(endpoint.id)}
                      disabled={testing === endpoint.id}
                      className="text-muted-foreground hover:text-foreground"
                      title={t("testEndpoint")}
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
                      title={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(endpoint.id)}
                      disabled={deleting === endpoint.id}
                      className="text-muted-foreground hover:text-destructive"
                      title={t("delete")}
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

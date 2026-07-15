"use client";

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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chatbot/ui";
import { AlertCircle, Loader2, Play, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

import { apiClient } from "@/lib/api-client";

interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: "GET" | "POST";
  authType: "none" | "api_key" | "bearer";
  authConfig?: {
    apiKeyHeader?: string;
  };
  bodyTemplate?: Record<string, unknown> | null;
}

interface AddEndpointModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editEndpoint: ApiEndpoint | null;
  onSuccess: () => void;
}

interface TestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  responseTime: number;
  error?: string;
}

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const BODY_TEMPLATE_PLACEHOLDER = '{\n  "order_id": "{order_id}"\n}';

export function AddEndpointModal({
  open,
  onOpenChange,
  projectId,
  editEndpoint,
  onSuccess,
}: AddEndpointModalProps) {
  const t = useTranslations("dashboard.pages.apiEndpoints");
  const modalT = useTranslations("dashboard.pages.apiEndpoints.modal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [authType, setAuthType] = useState<"none" | "api_key" | "bearer">("none");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [bearerToken, setBearerToken] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const isEditing = !!editEndpoint;

  useEffect(() => {
    if (editEndpoint) {
      setName(editEndpoint.name);
      setDescription(editEndpoint.description);
      setUrl(editEndpoint.url);
      setMethod(editEndpoint.method);
      setAuthType(editEndpoint.authType);
      setBodyTemplate(
        editEndpoint.bodyTemplate
          ? JSON.stringify(editEndpoint.bodyTemplate, null, 2)
          : ""
      );
      // Note: We don't populate credentials when editing for security
      // Users need to re-enter them if they want to change auth
      if (editEndpoint.authConfig?.apiKeyHeader) {
        setApiKeyHeader(editEndpoint.authConfig.apiKeyHeader);
      }
    }
  }, [editEndpoint]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setUrl("");
    setMethod("GET");
    setAuthType("none");
    setApiKey("");
    setApiKeyHeader("X-API-Key");
    setBearerToken("");
    setBodyTemplate("");
    setError(null);
    setTestResult(null);
  };

  const handleClose = () => {
    if (!loading && !testing) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleAuthTypeChange = (value: string) => {
    setAuthType(value as "none" | "api_key" | "bearer");
    // Clear credentials when switching auth type
    setApiKey("");
    setBearerToken("");
    setTestResult(null);
  };

  const handleTest = async () => {
    // First, save/create the endpoint if we don't have an ID yet
    if (!editEndpoint?.id) {
      setError(modalT("saveBeforeTesting"));
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await apiClient<TestResult>(
        `/api/endpoints/${editEndpoint.id}/test?projectId=${projectId}`,
        { method: "POST" }
      );
      setTestResult(result);
    } catch (err) {
      console.error("Test error:", err);
      setTestResult({
        success: false,
        responseTime: 0,
        error: err instanceof Error ? err.message : t("testFailed"),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setTestResult(null);

    // Validation
    if (!name.trim()) {
      setError(modalT("nameRequired"));
      return;
    }

    if (!description.trim()) {
      setError(modalT("descriptionRequired"));
      return;
    }

    if (!url.trim()) {
      setError(modalT("urlRequired"));
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError(modalT("urlInvalid"));
      return;
    }

    // Validate the request body template
    let parsedBodyTemplate: Record<string, unknown> | null = null;
    if (method === "POST" && bodyTemplate.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyTemplate);
      } catch {
        setError(modalT("bodyTemplateInvalid"));
        return;
      }

      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError(modalT("bodyTemplateNotObject"));
        return;
      }

      parsedBodyTemplate = parsed as Record<string, unknown>;
    }

    // Existing credentials are kept when editing, so they are only required for
    // a new endpoint or when switching to a different auth type.
    const credentialsRequired = !isEditing || editEndpoint.authType !== authType;

    if (authType === "api_key" && !apiKey.trim() && credentialsRequired) {
      setError(modalT("apiKeyRequired"));
      return;
    }

    if (authType === "bearer" && !bearerToken.trim() && credentialsRequired) {
      setError(modalT("bearerRequired"));
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        url: url.trim(),
        method,
        authType,
        bodyTemplate: method === "POST" ? parsedBodyTemplate : null,
      };

      // The header name is sent even without a key so it can be changed on its
      // own; the API keeps the stored key when no new one is supplied.
      if (authType === "api_key") {
        payload.authConfig = {
          apiKeyHeader: apiKeyHeader.trim() || "X-API-Key",
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        };
      } else if (authType === "bearer" && bearerToken.trim()) {
        payload.authConfig = {
          bearerToken: bearerToken.trim(),
        };
      }

      if (isEditing) {
        await apiClient(`/api/endpoints/${editEndpoint.id}?projectId=${projectId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient(`/api/endpoints?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : modalT("saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? modalT("editTitle") : modalT("addTitle")}
          </DialogTitle>
          <DialogDescription>
            {modalT("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">
              {modalT("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={modalT("namePlaceholder")}
              disabled={loading}
              maxLength={MAX_NAME_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {modalT("endpointDescription")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={modalT("descriptionPlaceholder")}
              disabled={loading}
              className="min-h-[80px] resize-none"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              {modalT("descriptionHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              {modalT("url")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.mystore.com/orders/{order_id}"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {modalT("urlHelp")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="method">{modalT("method")}</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as "GET" | "POST")}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authType">{modalT("authentication")}</Label>
              <Select
                value={authType}
                onValueChange={handleAuthTypeChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{modalT("none")}</SelectItem>
                  <SelectItem value="api_key">{modalT("apiKey")}</SelectItem>
                  <SelectItem value="bearer">{modalT("bearerToken")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {method === "POST" && (
            <div className="space-y-2">
              <Label htmlFor="bodyTemplate">{modalT("bodyTemplate")}</Label>
              <Textarea
                id="bodyTemplate"
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder={BODY_TEMPLATE_PLACEHOLDER}
                disabled={loading}
                className="min-h-[100px] font-mono text-xs"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                {modalT("bodyTemplateHelp")}
              </p>
            </div>
          )}

          {authType === "api_key" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  API Key {!isEditing && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                    placeholder={isEditing ? modalT("newKeyPlaceholder") : modalT("apiKeyPlaceholder")}
                  disabled={loading}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    {modalT("keepExistingKey")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKeyHeader">{modalT("headerName")}</Label>
                <Input
                  id="apiKeyHeader"
                  value={apiKeyHeader}
                  onChange={(e) => setApiKeyHeader(e.target.value)}
                  placeholder="X-API-Key"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {modalT("headerHelp")}
                </p>
              </div>
            </div>
          )}

          {authType === "bearer" && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <Label htmlFor="bearerToken">
                {modalT("bearerToken")} {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="bearerToken"
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder={isEditing ? modalT("newTokenPlaceholder") : modalT("bearerPlaceholder")}
                disabled={loading}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  {modalT("keepExistingToken")}
                </p>
              )}
            </div>
          )}

          {/* Test button (only for existing endpoints) */}
          {isEditing && (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || loading}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {modalT("testing")}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 me-2" />
                    {t("testEndpoint")}
                  </>
                )}
              </Button>
              {testResult && (
                <div className="flex items-center gap-2 text-sm">
                  {testResult.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">
                        {testResult.status} {testResult.statusText} ({testResult.responseTime}ms)
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">{testResult.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading || testing}>
            {modalT("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || testing}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {isEditing ? modalT("saving") : modalT("adding")}
              </>
            ) : isEditing ? (
              modalT("saveChanges")
            ) : (
              t("addEndpoint")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

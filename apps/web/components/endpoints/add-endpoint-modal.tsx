"use client";

import { useState, useEffect } from "react";
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
}

interface AddEndpointModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddEndpointModal({
  open,
  onOpenChange,
  editEndpoint,
  onSuccess,
}: AddEndpointModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [authType, setAuthType] = useState<"none" | "api_key" | "bearer">("none");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("X-API-Key");
  const [bearerToken, setBearerToken] = useState("");
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
      setError("Please save the endpoint first before testing");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await apiClient<TestResult>(
        `/api/endpoints/${editEndpoint.id}/test`,
        { method: "POST" }
      );
      setTestResult(result);
    } catch (err) {
      console.error("Test error:", err);
      setTestResult({
        success: false,
        responseTime: 0,
        error: err instanceof Error ? err.message : "Test failed",
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
      setError("Name is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    // Validate auth credentials
    if (authType === "api_key" && !apiKey.trim() && !isEditing) {
      setError("API key is required");
      return;
    }

    if (authType === "bearer" && !bearerToken.trim() && !isEditing) {
      setError("Bearer token is required");
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
      };

      // Only include auth config if credentials are provided
      if (authType === "api_key" && apiKey.trim()) {
        payload.authConfig = {
          apiKey: apiKey.trim(),
          apiKeyHeader: apiKeyHeader.trim() || "X-API-Key",
        };
      } else if (authType === "bearer" && bearerToken.trim()) {
        payload.authConfig = {
          bearerToken: bearerToken.trim(),
        };
      }

      if (isEditing) {
        await apiClient(`/api/endpoints/${editEndpoint.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient("/api/endpoints", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "Failed to save endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit API Endpoint" : "Add API Endpoint"}
          </DialogTitle>
          <DialogDescription>
            Configure an external API that your chatbot can call to fetch real-time data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Order Status"
              disabled={loading}
              maxLength={MAX_NAME_LENGTH}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Get order status and tracking information. Use when customer asks about their order, shipping, or delivery. Requires order_id parameter."
              disabled={loading}
              className="min-h-[80px] resize-none"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              Describe when the AI should call this API. Be specific about what parameters are needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.mystore.com/orders/{order_id}"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{param}"} for values the AI will extract from the conversation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
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
              <Label htmlFor="authType">Authentication</Label>
              <Select
                value={authType}
                onValueChange={handleAuthTypeChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
                  placeholder={isEditing ? "Enter new key to update" : "Your API key"}
                  disabled={loading}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing key
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKeyHeader">Header Name</Label>
                <Input
                  id="apiKeyHeader"
                  value={apiKeyHeader}
                  onChange={(e) => setApiKeyHeader(e.target.value)}
                  placeholder="X-API-Key"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  The header name to send the API key in (default: X-API-Key)
                </p>
              </div>
            </div>
          )}

          {authType === "bearer" && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <Label htmlFor="bearerToken">
                Bearer Token {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="bearerToken"
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder={isEditing ? "Enter new token to update" : "Your bearer token"}
                disabled={loading}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep existing token
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Endpoint
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || testing}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Saving..." : "Adding..."}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Add Endpoint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

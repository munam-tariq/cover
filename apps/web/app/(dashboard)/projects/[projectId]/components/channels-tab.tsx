"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@chatbot/ui";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";

interface ChannelConnection {
  id: string;
  provider: string;
  externalId: string;
  displayName: string | null;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppFormState {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  displayName: string;
}

const EMPTY_FORM: WhatsAppFormState = {
  phoneNumberId: "",
  wabaId: "",
  accessToken: "",
  appSecret: "",
  displayName: "",
};

export function ChannelsTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [form, setForm] = useState<WhatsAppFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "https://api.frontface.app";
  const webhookUrl =
    `${apiBaseUrl.replace(/\/$/, "")}/api/channels/whatsapp/webhook`;

  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ connections: ChannelConnection[] }>(
        `/api/projects/${projectId}/channels`
      );
      const whatsapp = data.connections.find((c) => c.provider === "whatsapp");
      setConnection(whatsapp ?? null);
    } catch {
      setError("Failed to load channel connections");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleConnect = async () => {
    setError(null);
    setSuccess(null);

    if (!form.phoneNumberId || !form.accessToken || !form.appSecret) {
      setError("Phone Number ID, Access Token, and App Secret are required.");
      return;
    }

    setSaving(true);
    try {
      await apiClient(`/api/projects/${projectId}/channels/whatsapp`, {
        method: "POST",
        body: JSON.stringify({
          phoneNumberId: form.phoneNumberId,
          wabaId: form.wabaId || undefined,
          accessToken: form.accessToken,
          appSecret: form.appSecret,
          displayName: form.displayName || undefined,
        }),
      });
      setSuccess("WhatsApp connected successfully!");
      setForm(EMPTY_FORM);
      await fetchConnection();
    } catch {
      setError("Failed to connect WhatsApp. Check your credentials.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    try {
      const result = await apiClient<{ ok: boolean; error?: string }>(
        `/api/projects/${projectId}/channels/whatsapp/test`,
        { method: "POST" }
      );
      if (result.ok) {
        setSuccess("Connection test passed!");
      } else {
        setError(`Connection test failed: ${result.error}`);
      }
    } catch {
      setError("Failed to test connection.");
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await apiClient(
        `/api/projects/${projectId}/channels/whatsapp/${connection.id}`,
        { method: "DELETE" }
      );
      setConnection(null);
      setSuccess("WhatsApp disconnected.");
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                Connect your WhatsApp Business number to receive and reply to messages.
              </CardDescription>
            </div>
            {connection && (
              <Badge
                variant={connection.status === "active" ? "default" : "secondary"}
              >
                {connection.status === "active" ? "Connected" : connection.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {connection && connection.status === "active" ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  <p className="text-sm font-medium">
                    {connection.displayName || connection.externalId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
                  <p className="text-sm font-medium">{connection.externalId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Credentials</Label>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="p-3 bg-muted/50 rounded-md space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Webhook URL (register in Meta App Dashboard)
                </Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs flex-1 break-all">{webhookUrl}</code>
                  <Button variant="ghost" size="sm" onClick={copyWebhookUrl}>
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {connection.lastError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  Last error: {connection.lastError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Test Connection
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={saving}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name (optional)</Label>
                  <Input
                    id="displayName"
                    placeholder="e.g. Support Line"
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                  <Input
                    id="phoneNumberId"
                    placeholder="e.g. 109876543210987"
                    value={form.phoneNumberId}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumberId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="wabaId">WABA ID (optional)</Label>
                  <Input
                    id="wabaId"
                    placeholder="e.g. 102938475610293"
                    value={form.wabaId}
                    onChange={(e) =>
                      setForm({ ...form, wabaId: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessToken">Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    placeholder="Permanent access token from Meta"
                    value={form.accessToken}
                    onChange={(e) =>
                      setForm({ ...form, accessToken: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="appSecret">App Secret *</Label>
                  <Input
                    id="appSecret"
                    type="password"
                    placeholder="From Meta App Dashboard → Settings → Basic"
                    value={form.appSecret}
                    onChange={(e) =>
                      setForm({ ...form, appSecret: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleConnect} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Connect WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
